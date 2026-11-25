import * as THREE from 'three';
import { bus } from '../../../core/events.js';
import { autumnTitle, memories } from './data.js';
import { createAutumnStage } from './stage.js';
import { createAutumnController } from './controller.js';
import { createMemoryDirector } from './director.js';
import { addLetterProps } from './letter-props.js';
import { createOpeningSweep, revealTime } from './opening.js';
import { button, createChat, createLegacy, createLetter, filmControls, node } from './pages.js';
import './autumn.css';

const typeTime = Array.from(autumnTitle).length * .1;
const introTime = typeTime + 1.2;

export function createAutumn({ renderer, controls }) {
  const root = document.getElementById('treasure-ui');
  if (!root || !renderer) return null;
  const dialog = node('dialog', 'autumn-avenue');
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-label', autumnTitle);
  dialog.dataset.state = 'CLOSED';
  const intro = node('div', 'autumn-intro');
  const line = node('span');
  const caret = node('i');
  intro.append(line, caret);
  const sweep = createOpeningSweep(intro);
  const note = node('div', 'autumn-bench-note');
  const heading = node('strong');
  note.append(heading, node('small', '', '点击，重新看看那一天'));
  const overlay = node('div', 'autumn-overlay');
  const accessibility = node('nav', 'autumn-sr');
  const accessibleOpen = button('打开附近的回忆', () => activate(controller?.nearby));
  const accessibleLegacy = button('打开旧纪念页', () => activate('legacy'));
  accessibility.append(accessibleOpen, accessibleLegacy, button('离开秋日大道', close));
  dialog.append(note, accessibility, overlay, intro, sweep.canvas);
  root.append(dialog);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const projected = new THREE.Vector3();
  const cameraFrom = new THREE.Vector3(), orientationFrom = new THREE.Quaternion();
  const letterEye = new THREE.Vector3(3.16, 1.66, -34.24);
  const letterAim = new THREE.Vector3(2.18, 1.24, -36.76);
  const backgroundEye = new THREE.PerspectiveCamera();
  let stage, controller, props, director, activePage, previousFocus, pack;
  let state = 'CLOSED', time = 0, width = innerWidth, height = innerHeight, pointer;

  function setState(next) {
    state = next;
    dialog.dataset.state = next;
    dialog.style.cursor = '';
    note.hidden = true;
    accessibleOpen.disabled = true;
    accessibleLegacy.hidden = true;
  }

  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    if (stage) sweep.resize(width, height);
    controller?.resize(width / height);
    if (director?.camera.isPerspectiveCamera) {
      director.camera.aspect = width / height;
      director.camera.updateProjectionMatrix();
    }
    if (state === 'EXPLORE') controller.snap();
  }

  function open() {
    if (stage) return;
    previousFocus = document.activeElement;
    stage = createAutumnStage({ reducedMotion: reduced.matches });
    props = addLetterProps(stage.scene, !!pack?.manifest.treasures.autumn.image);
    controller = createAutumnController(stage, dialog);
    time = reduced.matches ? typeTime : 0;
    sweep.reset();
    setState('INTRO');
    resize(width, height);
    controller.snap();
    controls?.clearInput();
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    update(0);
  }

  function disposeMemory() {
    activePage?.dispose?.();
    director?.dispose();
    activePage = director = undefined;
    overlay.replaceChildren();
  }

  function returnToAvenue() {
    if (!stage || !['CHAT', 'FILM', 'LETTER', 'LEGACY_PAGE'].includes(state)) return;
    disposeMemory();
    stage.camera.position.copy(cameraFrom);
    stage.camera.quaternion.copy(orientationFrom);
    stage.camera.updateMatrixWorld();
    props.pose(0);
    setState('EXPLORE');
    dialog.focus({ preventScroll: true });
  }

  function close() {
    if (!stage) return;
    disposeMemory();
    props.dispose();
    stage.dispose();
    stage = controller = props = pointer = undefined;
    setState('CLOSED');
    dialog.close();
    controls?.clearInput();
    (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : renderer.domElement)
      .focus({ preventScroll: true });
    previousFocus = undefined;
  }

  function escape() {
    if (['CHAT', 'FILM', 'LETTER', 'LEGACY_PAGE'].includes(state)) returnToAvenue();
    else close();
  }

  function showPage(value) {
    activePage = value;
    overlay.replaceChildren(value.element);
    value.element.querySelector('button')?.focus({ preventScroll: true });
  }

  function activate(index) {
    if (state !== 'EXPLORE' || (index === 'legacy' ? !nearLegacy() : index !== controller.nearby || !memories[index])) return;
    controller.clear();
    stage.player.pose('idle', 0);
    cameraFrom.copy(stage.camera.position);
    orientationFrom.copy(stage.camera.quaternion);
    time = 0;
    if (index === 'legacy') {
      if (!pack) return;
      setState('LEGACY_PAGE');
      showPage(createLegacy(pack, returnToAvenue));
      return;
    }
    stage.benches[index].root.userData.visited = true;
    const spec = memories[index];
    setState(spec.kind);
    if (spec.kind === 'CHAT') showPage(createChat(spec, pack, returnToAvenue, reduced.matches));
    else if (spec.kind === 'FILM') {
      director = createMemoryDirector(spec.id, reduced.matches);
      resize(width, height);
      showPage(filmControls(spec, director, pack, returnToAvenue));
    } else if (reduced.matches) time = 2.12;
    update(0);
  }

  function animateOpening(dt) {
    time += dt;
    if (state === 'INTRO') line.textContent = Array.from(autumnTitle).slice(0, Math.floor(time / .1)).join('');
    if (state === 'INTRO' && time >= (reduced.matches ? introTime - .78 : introTime)) {
      if (reduced.matches) setState('EXPLORE');
      else { setState('REVEAL'); time = 0; }
    }
    if (state !== 'REVEAL') return;
    if (reduced.matches || time >= revealTime) {
      controller.snap();
      setState('EXPLORE');
      return;
    }
    sweep.draw(time);
    controller.opening(time / revealTime);
  }

  function update(dt) {
    if (!stage) return;
    if (state === 'INTRO' || state === 'REVEAL') {
      animateOpening(dt);
    }
    if (state === 'EXPLORE') {
      controller.update(dt);
      const index = controller.nearby;
      accessibleOpen.disabled = index < 0;
      accessibleLegacy.hidden = !nearLegacy();
      if (index >= 0) {
        stage.benches[index].root.getWorldPosition(projected);
        projected.y += 1.37;
        projected.project(stage.camera);
        note.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .98;
        heading.textContent = memories[index].title;
        note.style.left = `${THREE.MathUtils.clamp(projected.x * .5 + .5, .14, .86) * 100}%`;
        note.style.top = `${(-projected.y * .5 + .5) * 100}%`;
      } else note.hidden = true;
    } else if (state === 'FILM') director.update(dt);
    else if (state === 'LETTER') {
      time += dt;
      props.pose(time);
      const blend = THREE.MathUtils.smoothstep(time, 0, .76);
      const { camera } = stage;
      camera.position.copy(cameraFrom).lerp(letterEye, blend);
      backgroundEye.position.copy(camera.position);
      backgroundEye.lookAt(letterAim);
      camera.quaternion.copy(orientationFrom).slerp(backgroundEye.quaternion, blend);
      camera.updateMatrixWorld();
      if (time >= 2.02 && !activePage) {
        showPage(createLetter(pack?.manifest.treasures.autumn.memories?.letter, returnToAvenue, reduced.matches));
      }
    }
    if (state === 'EXPLORE' || state === 'REVEAL' || state === 'CHAT') stage.update(dt);
    activePage?.update?.(dt);
  }

  function render() {
    if (!stage) return false;
    if (state === 'INTRO') return true;
    const saved = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear, shadows = renderer.shadowMap.enabled, type = renderer.shadowMap.type;
    try {
      renderer.autoClear = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setRenderTarget(null);
      renderer.render(director?.scene ?? stage.scene, director?.camera ?? stage.camera);
    } finally {
      renderer.shadowMap.type = type;
      renderer.shadowMap.enabled = shadows;
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(saved, face, mip);
    }
    return true;
  }

  function nearLegacy() {
    return props?.legacy && stage.player.root.position.distanceTo(props.legacy.position) <= 2.4;
  }

  function clickAction(event) {
    const exits = Object.values(stage.exitSigns);
    if (controller.hit(event, exits)) return 'exit';
    if (nearLegacy() && controller.hit(event, [props.legacy])) return 'legacy';
    const index = controller.nearby;
    if (index >= 0 && controller.hit(event, [stage.benches[index].root])) return index;
    return null;
  }

  dialog.addEventListener('cancel', (event) => { event.preventDefault(); escape(); });
  dialog.addEventListener('keydown', (event) => {
    if (state !== 'EXPLORE') return;
    if (event.code === 'KeyE' && !event.repeat) {
      event.preventDefault();
      activate(controller.nearby >= 0 ? controller.nearby : nearLegacy() ? 'legacy' : -1);
    }
    else if (controller.keydown(event)) event.preventDefault();
  });
  dialog.addEventListener('keyup', (event) => controller?.keyup(event));
  dialog.addEventListener('pointerdown', (event) => {
    if (state === 'EXPLORE' && event.target === dialog && event.isPrimary && event.button === 0) {
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  });
  dialog.addEventListener('pointercancel', () => { pointer = undefined; });
  dialog.addEventListener('pointerup', (event) => {
    const down = pointer;
    pointer = undefined;
    if (state !== 'EXPLORE' || event.target !== dialog || !down || down.id !== event.pointerId
      || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
    const action = clickAction(event);
    if (action === 'exit') close();
    else if (action !== null) activate(action);
    else controller.walkTo(event);
  });
  dialog.addEventListener('pointermove', (event) => {
    if (state === 'EXPLORE' && event.target === dialog && event.pointerType === 'mouse') {
      dialog.style.cursor = clickAction(event) === null ? '' : 'pointer';
    }
  });
  const clear = () => controller?.clear();
  window.addEventListener('blur', clear);
  const unsubscribe = bus.on('resize', ({ width: w, height: h }) => resize(w, h));
  return {
    get active() { return !!stage; },
    setPack(value) { pack = value; },
    open, close, escape, render, update, resize,
    dispose() { close(); unsubscribe(); window.removeEventListener('blur', clear); dialog.remove(); },
  };
}
