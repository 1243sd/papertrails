import * as THREE from 'three';
import { bus } from '../../../core/events.js';
import { createSpringStage } from './stage.js';
import { createSpringMotion } from './motion.js';
import { createSpringReveal } from './reveal.js';
import './spring.css';

export function createSpring({ renderer, controls, assets }) {
  const root = document.getElementById('treasure-ui');
  if (!root || !renderer) return null;
  const dialog = document.createElement('dialog');
  dialog.className = 'spring-garden';
  dialog.tabIndex = -1;
  dialog.dataset.state = 'CLOSED';
  dialog.setAttribute('aria-labelledby', 'spring-garden-title');
  dialog.innerHTML = `
    <header class="spring-masthead">
      <div><p lang="en">Blooming Garden</p><h2 id="spring-garden-title">春日花园</h2></div>
    </header>
    <nav class="spring-accessible" aria-label="花园回忆">
      <button type="button" data-action="PHOTO_VIEW" hidden>查看照片</button>
      <button type="button" data-action="MESSAGE_READING" hidden>展开铭牌</button>
      <button type="button" data-action="IDLE" hidden>返回花园</button>
      <button type="button" data-action="LEAVE">离开花园</button>
    </nav>
    <section class="spring-accessible" aria-live="polite" aria-hidden="true">
      <h3></h3><p></p>
    </section>
    <div class="spring-accessible" role="img" aria-hidden="true"></div>
    <div class="spring-light" aria-hidden="true"></div>
  `;
  root.append(dialog);
  const photoButton = dialog.querySelector('[data-action="PHOTO_VIEW"]');
  const messageButton = dialog.querySelector('[data-action="MESSAGE_READING"]');
  const backButton = dialog.querySelector('[data-action="IDLE"]');
  const accessible = dialog.querySelector('section.spring-accessible');
  const photoDescription = dialog.querySelector('[role="img"]');
  const veil = dialog.querySelector('.spring-light');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const bufferSize = new THREE.Vector2();
  let stage, reveal, motion;
  let resolve;
  let pack, previousFocus, photosReady;
  let packState = 'loading';
  let touchY = null, drag = 0;
  let width = innerWidth, height = innerHeight;

  function syncControls() {
    const state = motion.state;
    if (dialog.dataset.state !== state) dialog.dataset.state = state;
    photoButton.hidden = state !== 'IDLE' || !reveal.canViewPhoto;
    messageButton.hidden = state !== 'IDLE';
    backButton.hidden = state !== 'PHOTO_VIEW' && state !== 'MESSAGE_READING';
    accessible.setAttribute('aria-hidden', String(state !== 'MESSAGE_READING'));
    photoDescription.setAttribute('aria-hidden', String(state !== 'PHOTO_VIEW'));
    veil.style.opacity = motion.opacity;
  }

  function loadPack() {
    photosReady = reveal.setPack(pack, packState);
    accessible.querySelector('h3').textContent = reveal.title;
    accessible.querySelector('p').textContent = reveal.message;
    photoDescription.setAttribute('aria-label', reveal.title + ' · 宝藏照片');
  }

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    if (!stage) return;
    stage.camera.aspect = width / height;
    stage.camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(bufferSize);
    const scale = Math.min(1, 2200 / Math.max(bufferSize.x, bufferSize.y));
    resolve.target.setSize(Math.max(1, Math.round(bufferSize.x * scale)), Math.max(1, Math.round(bufferSize.y * scale)));
    motion.positionCamera();
  }

  function open() {
    if (stage) return;
    stage = createSpringStage({ assets });
    reveal = createSpringReveal(stage);
    motion = createSpringMotion(stage, reveal, () => reducedMotion.matches);
    const target = new THREE.WebGLRenderTarget(1, 1, {
      samples: Math.min(4, renderer.capabilities.maxSamples), stencilBuffer: false,
    });
    const scene = new THREE.Scene();
    scene.name = 'spring-resolve';
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;
    const geometry = stage.own(new THREE.PlaneGeometry(2, 2));
    const material = stage.own(new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false }));
    scene.add(new THREE.Mesh(geometry, material));
    resolve = { target: stage.own(target), scene, camera };
    loadPack();
    resize(width, height);
    update(0);
    previousFocus = document.activeElement;
    controls?.clearInput();
    dialog.showModal();
    dialog.focus({ preventScroll: true });
  }

  function close() {
    if (!stage) return;
    stage.scene.clear();
    reveal.dispose();
    stage.dispose();
    stage = reveal = motion = resolve = photosReady = undefined;
    touchY = null;
    drag = 0;
    dialog.dataset.state = 'CLOSED';
    dialog.close();
    controls?.clearInput();
    (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : renderer.domElement).focus({ preventScroll: true });
    previousFocus = undefined;
  }

  function view(next) {
    if (!motion || (next === 'PHOTO_VIEW' && !reveal.canViewPhoto)) return;
    if (next === 'IDLE' ? backButton.hidden : motion.state !== 'IDLE') return;
    const from = motion.view;
    motion.enter(next);
    update(0);
    if (next === 'IDLE') (from === 'PHOTO_VIEW' && !photoButton.hidden ? photoButton : messageButton).focus({ preventScroll: true });
    else backButton.focus({ preventScroll: true });
  }

  function escape() {
    if (!motion) return;
    if (motion.state === 'PHOTO_VIEW' || motion.state === 'MESSAGE_READING') view('IDLE');
    else leaveGarden();
  }

  function leaveGarden() {
    if (motion && motion.state !== 'CLOSING') {
      motion.close();
      update(0);
    }
  }

  function update(dt) {
    motion.update(dt);
    if (motion.closed) close();
    else syncControls();
  }

  function render() {
    if (!stage) return false;
    const target = renderer.getRenderTarget();
    const face = renderer.getActiveCubeFace();
    const mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear;
    const shadows = renderer.shadowMap.enabled;
    const shadowType = renderer.shadowMap.type;
    renderer.autoClear = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    try {
      renderer.setRenderTarget(resolve.target);
      renderer.render(stage.scene, stage.camera);
      renderer.setRenderTarget(null);
      renderer.render(resolve.scene, resolve.camera);
    } finally {
      renderer.shadowMap.enabled = shadows;
      renderer.shadowMap.type = shadowType;
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(target, face, mip);
    }
    return true;
  }

  function pick(event) {
    if (!motion || event.target !== dialog) return '';
    pointer.set(event.clientX / width * 2 - 1, 1 - event.clientY / height * 2);
    ray.setFromCamera(pointer, stage.camera);
    const state = motion.state;
    const on = (surface) => {
      surface.updateWorldMatrix(true, false);
      return ray.intersectObject(surface, false).length > 0;
    };
    if (state === 'MESSAGE_READING' && reveal.pageReturn.sign.visible && on(reveal.pageReturn.face)) return 'IDLE';
    if (state === 'MESSAGE_READING' && on(reveal.tagBacking)) return '';
    if (state === 'PHOTO_VIEW' && reveal.photoReturn.sign.visible && on(reveal.photoReturn.face)) return 'IDLE';
    if ((state === 'IDLE' || state === 'PHOTO_VIEW') && reveal.photo.visible) {
      if (on(reveal.frameBox)) return state === 'IDLE' ? 'PHOTO_VIEW' : 'IDLE';
    }
    if (state === 'IDLE' && on(reveal.tagBacking)) return 'MESSAGE_READING';
    if (state !== 'CLOSING' && stage.fence.visible && on(stage.exit.face)) return 'LEAVE';
    return '';
  }

  const unsubscribe = bus.on('resize', ({ width: w, height: h }) => resize(w, h));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); escape(); });
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action || pick(event);
    if (action && drag < 5) {
      if (action === 'LEAVE') leaveGarden();
      else view(action);
    }
    drag = 0;
  });
  dialog.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') {
      dialog.style.cursor = pick(event) ? 'pointer' : '';
      return;
    }
    if (touchY === null || motion?.state !== 'MESSAGE_READING') return;
    const delta = touchY - event.clientY;
    drag += Math.abs(delta);
    reveal.scroll(delta * 1040 / Math.max(1, height * .74));
    touchY = event.clientY;
  });
  dialog.addEventListener('pointerdown', (event) => {
    drag = 0;
    if (event.target === dialog && event.pointerType === 'touch' && motion?.state === 'MESSAGE_READING') {
      touchY = event.clientY;
      dialog.setPointerCapture(event.pointerId);
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    dialog.addEventListener(type, () => { touchY = null; });
  }
  dialog.addEventListener('wheel', (event) => {
    if (motion?.state !== 'MESSAGE_READING') return;
    event.preventDefault();
    reveal.scroll(event.deltaY * (event.deltaMode === 1 ? 35 : event.deltaMode === 2 ? 880 : 1.7));
  }, { passive: false });
  dialog.addEventListener('keydown', (event) => {
    if (motion?.state !== 'MESSAGE_READING') return;
    const scroll = { ArrowDown: 59, ArrowUp: -59, PageDown: 682, PageUp: -682, End: Infinity, Home: -Infinity };
    if (!(event.code in scroll)) return;
    event.preventDefault();
    reveal.scroll(scroll[event.code]);
  });

  return {
    get active() { return !!stage; },
    get ready() { return stage?.ready; },
    get photosReady() { return photosReady; },
    open, close, escape, update, render,
    setPack(value, status = value ? 'ready' : 'empty') {
      pack = value;
      packState = status;
      if (stage) loadPack();
    },
    dispose() { close(); unsubscribe(); dialog.remove(); },
  };
}
