import * as THREE from 'three';
import { createPaper, cameraFrame, ease, floor, mix } from './paper.js';
import { lantern, leafScatter, tree } from './props.js';
import { hills } from './sets.js';
import { firstMeeting } from './first-meeting.js';
import { newYear } from './new-year.js';
import { livingTogether } from './living-together.js';

const films = { firstMeeting, newYear, livingTogether };

function ending(id, paper, root) {
  const isHome = id === 'livingTogether';
  const isTrain = id === 'newYear';
  floor(paper, root, isTrain ? '#976e72' : '#b98166', 14, 14);
  hills(paper, root, 0, 12, isTrain);
  for (const [x, z, size] of [[-2.4, .43, 1.18], [2.42, .73, 1.29], [-2.75, 4.6, 1.03],
    [3.25, 5.21, 1], [-3.45, 7.2, .92], [3.8, 7.72, 1.15]]) {
    tree(paper, root, x, z, size, Math.round(z * 3));
  }
  leafScatter(paper, root, 34, 6.8, 7);
  const lights = [];
  for (const x of [-2.05, 2.06]) {
    const z = isHome ? 2.63 : 3.25;
    paper.line(root, '#7c5753', .034, [[x, 0, z], [x, 1.66, z], [x * .9, 2.04, z]]);
    lights.push(lantern(paper, root, x * .9, 1.73, z, .81));
  }
  if (isHome) {
    paper.box(root, '#aa7764', 4.13, 1.72, 1.42, 0, .86, 7.92);
    paper.cut(root, '#915d60', [[-2.2, 0], [0, 1.1], [2.2, 0]], 1.59, 0, 1.69, 7.11);
    for (const x of [-1.08, 1.08]) paper.box(root, '#f4ae73', .76, .61, .1, x, .96, 7.166, .34);
  }
  return (t) => lights.forEach((light, i) => { light.rotation.z = Math.sin(t * 1.7 + i) * .048; });
}

export function createFilm(id) {
  const timeline = films[id];
  if (!timeline) throw new RangeError('Unknown autumn memory: ' + id);
  const scene = new THREE.Scene();
  scene.name = 'autumn-memory-' + id;
  scene.background = new THREE.Color();
  const camera = new THREE.PerspectiveCamera(39, 1, .045, 65);
  const paper = createPaper();
  const ambient = new THREE.HemisphereLight('#fff2db', '#865366', 2.05);
  const key = new THREE.DirectionalLight('#ffe2bd', 2.35);
  key.position.set(-3.8, 6.5, -5.2);
  const rim = new THREE.DirectionalLight('#f3a47e', .68);
  rim.position.set(2.75, 2.8, 6);
  scene.add(ambient, key, rim);
  const duration = timeline.at(-1).end;
  const endFrame = {
    from: [.02, 2.45, -4.78], to: [-.13, 2.42, -4.63], focus: [0, 1.32, 2.03], lens: 40,
    sky: id === 'newYear' ? '#ad8b96' : '#cc916f',
  };
  const sets = timeline.map((shot, index) => {
    const stage = paper.group(scene, 'shot-' + (index + 1));
    const isEnding = !shot.set;
    return {
      ...shot, ...(isEnding ? endFrame : {}), stage,
      update: isEnding ? ending(id, paper, stage) : shot.set(paper, stage),
    };
  });
  const keyWarm = new THREE.Color('#ffe2bd');
  const keyDusk = new THREE.Color('#e7b3bf');
  const keyMoon = new THREE.Color('#bdc1ff');
  const skyDawn = new THREE.Color('#e3b89a');
  const skyDusk = new THREE.Color('#a87786');
  function sample(time) {
    const t = THREE.MathUtils.clamp(time, 0, duration);
    const active = sets.find((shot) => t >= shot.start && t < shot.end) ?? sets.at(-1);
    const span = active.end - active.start;
    const elapsed = t - active.start;
    const progress = elapsed / span;
    sets.forEach((shot) => { shot.stage.visible = shot === active; });
    const frameIndex = active.frames?.findLastIndex((frame) => frame.offset <= elapsed);
    const frame = active.frames?.[frameIndex];
    const frameEnd = active.frames?.[frameIndex + 1]?.offset ?? span;
    const zoom = frame ? (elapsed - frame.offset) / (frameEnd - frame.offset) : progress;
    cameraFrame(camera, camera.aspect, frame ?? active, ease(zoom));
    scene.background.set(active.sky);
    key.color.copy(active.night ? keyMoon : keyWarm);
    key.intensity = active.night ? 1.52 : 2.35;
    if (active.daylight) {
      scene.background.copy(skyDawn).lerp(skyDusk, ease(progress));
      key.color.lerp(keyDusk, ease(progress));
      key.intensity = mix(2.55, 1.36, ease(progress));
    }
    active.update(elapsed, progress, camera);
  }
  sample(0);
  const finalShot = sets.at(-1);
  return {
    scene, camera, duration, sample,
    animateEnding: finalShot.animateEnding
      ? (hold) => finalShot.update(finalShot.end - finalShot.start + hold, 1, camera)
      : null,
    shots: timeline.map(({ start, end, caption }) => ({ start, end, caption })),
    dispose() {
      paper.dispose();
      scene.clear();
    },
  };
}
