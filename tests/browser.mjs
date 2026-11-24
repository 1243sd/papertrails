import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { createServer } from 'vite';

const artifacts = process.env.PAPERTRAILS_TEST_ARTIFACTS;
const candidates = [
  process.env.PAPERTRAILS_CHROME,
  path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
  path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];
let executable;
for (const file of candidates) {
  if (!file) continue;
  try { await fs.access(file); executable = file; break; } catch { /* try the next browser path */ }
}
if (!executable) throw new Error('Set PAPERTRAILS_CHROME to the path of a Chromium browser.');

const server = await createServer({
  server: { host: '127.0.0.1', port: 5281, hmr: false },
  plugins: [{
    name: 'papertrails-browser-checks',
    configureServer(vite) {
      vite.middlewares.use('/__checks', (_req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"></head><body></body></html>');
      });
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/main.js')) return;
      const boot = '  loop.start();';
      if (!code.includes(boot)) throw new Error('Game boot entry changed');
      // Drive the production frame handler without a GPU frame between every simulated input step.
      return code.replace(boot, `${boot}
  loop.stop();
  window.__papertrailsTest = { update, render, renderer, world, traveller, animals, game, controls, daynight, music, views, follow };`);
    },
  }],
});
const tempRoot = await fs.realpath(os.tmpdir());
const profile = await fs.mkdtemp(path.join(tempRoot, 'papertrails-browser-'));
let chrome;
let socket;
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
  if (artifacts) await fs.mkdir(artifacts, { recursive: true });
  chrome = spawn(executable, [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run',
    '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  const childExit = once(chrome, 'exit');
  childExit.catch(() => {});
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      [port] = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n');
      break;
    } catch { await wait(100); }
  }
  assert(port, 'Chromium did not start');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find((entry) => entry.url === 'about:blank');
  assert(tab, 'Chromium test tab unavailable');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];

  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = ++id;
      const timeout = setTimeout(() => {
        pending.delete(request);
        reject(new Error('Chromium timed out: ' + method));
      }, 100_000);
      pending.set(request, (message) => {
        clearTimeout(timeout);
        if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      });
      socket.send(JSON.stringify({ id: request, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert(!result.exceptionDetails, result.exceptionDetails?.exception?.description || result.exceptionDetails?.text);
    return result.result.value;
  }

  socket.onmessage = async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '));
    } else if (message.method === 'Runtime.bindingCalled' && message.params.name === '__saveFrame') {
      const payload = message.params.payload;
      try {
        const { name, pointer } = payload.startsWith('{') ? JSON.parse(payload) : { name: payload };
        assert(/^[a-z-]+\.png$/.test(name), 'Invalid screenshot filename');
        if (pointer) {
          await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pointer });
          await evaluate('window.__papertrailsTest.update(0); window.__papertrailsTest.render(0)');
        }
        if (artifacts) {
          const { data: png } = await command('Page.captureScreenshot', { format: 'png' });
          await fs.writeFile(path.join(artifacts, name), Buffer.from(png, 'base64'));
        }
      } catch (error) {
        errors.push(error.message);
      } finally {
        // The outer evaluation may finish and close the socket before this acknowledgement replies.
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ id: ++id, method: 'Runtime.evaluate', params: { expression: 'window.__frameReady()' } }));
        }
      }
    }
  };

  async function load(url) {
    const { loaderId } = await command('Page.navigate', { url });
    for (let i = 0; i < 135; i++) {
      try {
        const { frameTree: { frame } } = await command('Page.getFrameTree');
        if (frame.loaderId === loaderId && await evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`)) return;
      } catch (error) {
        if (errors.length) throw error;
      }
      await wait(100);
    }
    throw new Error('Page did not load: ' + url);
  }

  await command('Runtime.enable');
  await command('Page.enable');
  await command('Runtime.addBinding', { name: '__saveFrame' });
  await command('Emulation.setDeviceMetricsOverride', { width: 960, height: 610, deviceScaleFactor: 1, mobile: false });
  const expression = (id, app = false, reloaded = false) => app
    ? `(async () => {
        const { checkGame } = await import('/tests/game.browser.js');
        const capture = (name) => new Promise((resolve) => { window.__frameReady = resolve; window.__saveFrame(name); });
        return checkGame(window.__papertrailsTest, capture, ${reloaded});
      })()`
    : `(async () => {
        const source = await (await fetch('/src/main.js')).text();
        const route = source.match(/import \\* as THREE from "([^"]+)"/)[1];
        const T = await import(route);
        const renderer = new T.WebGLRenderer();
        const checks = await import('/tests/${id}.browser.js');
        try { return await Object.values(checks)[0](renderer); }
        finally { renderer.dispose(); renderer.forceContextLoss(); }
      })()`;
  const winterExpression = (mobile) => `(async () => {
    const { checkWinterStage } = await import('/tests/winter-scene.browser.js');
    const capture = (name, pointer) => new Promise((resolve) => {
      window.__frameReady = resolve;
      window.__saveFrame(JSON.stringify({ name, pointer }));
    });
    await checkWinterStage(window.__papertrailsTest, capture, ${mobile});
  })()`;

  if (process.argv[2] !== 'game' && process.argv[2] !== 'winter-scene') {
    await load(origin + '/__checks');
    for (const id of ['companions', 'treasure-sites', 'treasure-progress', 'treasure-pack', 'treasure-ui']) {
      if (process.argv[2] && process.argv[2] !== id) continue;
      const result = await evaluate(expression(id));
      console.log(id + ':', typeof result === 'string' ? result : '通过');
    }
  }
  if (!process.argv[2] || ['game', 'winter-scene'].includes(process.argv[2])) {
    const url = origin + '/?seed=7&quality=low&mute=1&hint=0';
    for (const reloaded of [false, true]) {
      await load(url);
      let ready = false;
      for (let i = 0; i < 180; i++) {
        ready = await evaluate('!!window.__papertrailsTest');
        if (ready) break;
        if (errors.length) throw new Error(errors.join('\n'));
        await wait(125);
      }
      assert(ready, 'Game did not finish booting');
      if (!reloaded && process.argv[2] !== 'game') {
        await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
        await evaluate('new Promise(requestAnimationFrame)');
        await evaluate(winterExpression(false));
        await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
        await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await evaluate('new Promise(requestAnimationFrame)');
        await evaluate(winterExpression(true));
        await command('Emulation.setDeviceMetricsOverride', { width: 960, height: 610, deviceScaleFactor: 1, mobile: false });
        await command('Emulation.setEmulatedMedia', { features: [] });
        console.log('winter-scene: 横屏、竖屏及减少动态效果通过');
        if (process.argv[2] === 'winter-scene') break;
      }
      console.log('game:', await evaluate(expression(null, true, reloaded)));
    }
  }
  assert.equal(errors.length, 0, errors.join('\n'));
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    const exit = once(chrome, 'exit');
    chrome.kill();
    await Promise.race([exit, wait(2000)]);
  }
  await server.close();
  const verified = await fs.realpath(profile);
  if (path.dirname(verified) === tempRoot && path.basename(verified).startsWith('papertrails-browser-')) {
    await fs.rm(verified, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
  }
}
