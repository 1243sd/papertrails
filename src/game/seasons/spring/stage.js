import * as THREE from 'three';
import { CONFIG } from '../../../core/config.js';
import { loadTreasureSprites } from '../../treasure-companions.js';
import { createBloom, petalShape } from './bloom.js';
import { createGardenFence } from './fence.js';
import { addPaperSign } from './signs.js';
import { createSpringSky } from './sky.js';

export function createSpringStage({ assets }) {
  const scene = new THREE.Scene();
  scene.name = 'spring-garden';
  const camera = new THREE.PerspectiveCamera(35, 1, .06, 75);
  const owned = new Set();
  const own = (resource) => { owned.add(resource); return resource; };
  const swatches = new Map();
  const paper = (color, vertexColors = false) => {
    const key = color + vertexColors;
    if (!swatches.has(key)) swatches.set(key, own(new THREE.MeshStandardMaterial({
      color, roughness: .93, side: THREE.DoubleSide, vertexColors,
    })));
    return swatches.get(key);
  };
  function group(parent, name, x = 0, y = 0, z = 0) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(own(geometry), material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, color, w, h, d, x, y, z) {
    return mesh(parent, new THREE.BoxGeometry(w, h, d), paper(color), x, y, z);
  }
  function texture(canvas) {
    const map = own(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }
  const makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const sky = makeCanvas(384, 384);
  const skyInk = sky.getContext('2d');
  const wash = skyInk.createLinearGradient(28, 0, 354, 384);
  wash.addColorStop(0, '#cddcde');
  wash.addColorStop(.54, '#c4d9df');
  wash.addColorStop(1, '#adc8d8');
  skyInk.fillStyle = wash;
  skyInk.fillRect(0, 0, 384, 384);
  const light = skyInk.createRadialGradient(74, 23, 8, 74, 23, 203);
  light.addColorStop(0, 'rgba(255, 248, 220, .95)');
  light.addColorStop(.45, 'rgba(255, 246, 217, .55)');
  light.addColorStop(1, 'rgba(255, 245, 209, 0)');
  skyInk.fillStyle = light;
  skyInk.fillRect(0, 0, 384, 384);
  scene.background = texture(sky);

  const grain = makeCanvas(128, 128);
  const grainInk = grain.getContext('2d');
  grainInk.fillStyle = '#eeeeee';
  grainInk.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2200; i++) {
    grainInk.fillStyle = i % 3 ? '#dfdfdf' : '#f9f9f9';
    grainInk.fillRect(i * 73.19 % 128, i * 47.51 % 128, i % 3 + 1, .58);
  }
  const grainMap = texture(grain);
  grainMap.wrapS = grainMap.wrapT = THREE.RepeatWrapping;
  const garden = group(scene, 'garden-island');
  const lawn = group(garden, 'deckled-paper-platform');
  function deckOutline(a, factor) {
    const irregular = 1 + .037 * Math.sin(a * 3 + .4) + .019 * Math.cos(a * 5 - .7);
    return [Math.cos(a) * 5.45 * factor * irregular, Math.sin(a) * 3.55 * factor * irregular];
  }
  function cutLayer(color, factor, top, depth) {
    const outline = new THREE.Shape();
    outline.moveTo(...deckOutline(0, factor));
    for (let i = 1; i <= 110; i++) outline.lineTo(...deckOutline(i / 110 * Math.PI * 2, factor));
    const geo = new THREE.ExtrudeGeometry(outline, {
      depth, bevelEnabled: true, bevelSegments: 2, bevelSize: .045, bevelThickness: .035, steps: 1,
    });
    const mat = paper(color);
    mat.map = grainMap;
    const layer = mesh(lawn, geo, [mat, paper(top <= -.4 ? '#bd9f7e' : color)], 0, top - depth, 0);
    layer.rotation.x = -Math.PI / 2;
  }
  cutLayer('#b9a488', .985, -.48, .20);
  cutLayer('#e0c9a4', 1.014, -.31, .16);
  cutLayer('#ede0be', 1.024, -.17, .13);
  cutLayer('#8fa47d', 1.008, -.095, .08);
  cutLayer('#a8be91', 1, -.032, .075);

  const shade = makeCanvas(128, 128);
  const shadeInk = shade.getContext('2d');
  const penumbra = shadeInk.createRadialGradient(64, 64, 7, 64, 64, 62);
  penumbra.addColorStop(0, 'rgba(59,59,33,.64)');
  penumbra.addColorStop(.52, 'rgba(69,60,42,.25)');
  penumbra.addColorStop(1, 'rgba(74,62,42,0)');
  shadeInk.fillStyle = penumbra;
  shadeInk.fillRect(0, 0, 128, 128);
  const shadeMap = texture(shade);
  function shadow(parent, x, y, z, w, d, opacity) {
    const material = own(new THREE.MeshBasicMaterial({ map: shadeMap, transparent: true, opacity, depthWrite: false }));
    const object = mesh(parent, new THREE.PlaneGeometry(w, d), material, x, y, z);
    object.rotation.x = -Math.PI / 2;
    object.castShadow = object.receiveShadow = false;
    return object;
  }
  shadow(scene, .55, -.72, .35, 15.5, 10, .37);
  shadow(garden, 0, .018, .68, 2.55, 1.5, .58);

  const trail = new THREE.CatmullRomCurve3([
    [-.55, 0, 3.24], [-1.12, 0, 2.44], [-1.32, 0, 1.28], [-1.65, 0, .31],
    [-2.06, 0, -.65], [-1.75, 0, -1.52], [-.95, 0, -2.1], [.18, 0, -2.21], [1.89, 0, -1.76],
  ].map((p) => new THREE.Vector3(...p)));
  function pathRibbon(width, color, y) {
    const path = new THREE.Shape();
    const side = (i, sign) => {
      const t = i / 46;
      const p = trail.getPoint(t), dir = trail.getTangent(t);
      const spread = width * (.49 + .045 * Math.sin(t * 11 + sign));
      return [p.x + dir.z * spread * sign, -p.z + dir.x * spread * sign];
    };
    path.moveTo(...side(0, 1));
    for (let i = 1; i <= 46; i++) path.lineTo(...side(i, 1));
    for (let i = 46; i >= 0; i--) path.lineTo(...side(i, -1));
    const mat = paper(color);
    mat.map = grainMap;
    const strip = mesh(garden, new THREE.ShapeGeometry(path), mat, 0, y, 0);
    strip.rotation.x = -Math.PI / 2;
    strip.castShadow = false;
  }
  pathRibbon(1.07, '#a9aa82', .012);
  pathRibbon(.94, '#e8d7b3', .019);
  const steppingStone = new THREE.CylinderGeometry(.12, .13, .033, 7);
  for (let i = 0; i < 31; i++) {
    const p = trail.getPoint((i + 1) / 33);
    const stone = mesh(garden, steppingStone, paper(i % 3 ? '#d1c3a0' : '#ede0c5'),
      p.x + Math.sin(i * 2.7) * .34, .032, p.z);
    stone.scale.set(.62 + i % 5 * .12, .22, .38 + i % 4 * .19);
    stone.rotation.y = i * 1.7;
  }

  const sprouts = [];
  const props = new Map();
  function prop(id, part, x, z, size, angle, time, sway = 0, y = 0) {
    if (!props.has(id)) props.set(id, assets.getTilePrototype(id).clone(true));
    const object = props.get(id).getObjectByName(part)?.clone(true);
    if (!object) return null;
    const base = group(garden, part, x, y, z);
    object.name += '-paper';
    object.position.set(0, 0, 0);
    object.rotation.set(0, angle, 0);
    if (part.startsWith('tree_') || part === 'greenhouse') {
      for (const leaf of [...object.children]) if (/_x[fb]$/.test(leaf.name)) leaf.removeFromParent();
    }
    if (part.startsWith('tree_') && object.isMesh) {
      const layer = new THREE.Mesh(object.geometry, object.material);
      layer.scale.set(.96, 1, 1);
      layer.rotation.y = -.33;
      layer.position.set(-.066, -.012, -.17);
      object.add(layer);
    }
    object.traverse((node) => {
      if (node.isMesh) node.castShadow = node.receiveShadow = false;
    });
    base.add(object);
    shadow(garden, x + .16 * size, Math.max(.039, y + .012), z + .06, size * 1.08, size * .61, .46);
    sprouts.push({ base, size, time, sway });
    return base;
  }
  const greenhouse = prop('blossom_garden', 'greenhouse', 1.94, -2.18, 2.22, .15, .55, 0, .22);
  prop('blossom_orchard', 'tree_a', -3.39, -2.15, 2.33, .24, .26, .022);
  prop('blossom_orchard', 'tree_b', -4.3, -1.19, 1.62, -.29, .37, .019);
  prop('blossom_orchard', 'tree_c', 3.48, -2.15, 2.49, -.18, .31, .023);
  prop('blossom_lane', 'tree_d', 4.38, -.93, 1.76, .20, .48, .026);
  prop('blossom_gazebo', 'gazebo', 3.70, -.63, 1.36, -.40, .70);
  prop('blossom_gazebo', 'picnic', 3.97, -.04, 1.16, .47, .91);
  prop('blossom_garden', 'arch_a', -2.08, -.84, 1.54, -.10, .82);
  prop('blossom_lane', 'bench', -3.26, -.11, 1.26, .26, .93);
  prop('blossom_garden', 'hives', -3.75, .34, 1.33, .24, 1.04);
  prop('blossom_garden', 'stone_lantern', -2.38, .51, 1.25, .24, 1.11);
  prop('blossom_lane', 'stone_lantern_b', 3.73, 1.14, 1.05, .31, 1.27);

  if (greenhouse) {
    const plinth = mesh(garden, new THREE.CylinderGeometry(1, 1.04, .21, 28), paper('#beb99b'), 1.94, .105, -2.43);
    plinth.scale.set(1.04, 1, .78);
    const glass = own(new THREE.MeshPhysicalMaterial({
      color: '#c4dbce', side: THREE.DoubleSide, transparent: true, opacity: .34,
      metalness: .23, roughness: .17, depthWrite: false,
    }));
    const house = group(greenhouse, 'greenhouse-glazing', 0, .001, -.016);
    house.rotation.y = .15;
    for (const sign of [-1, 1]) {
      const wall = mesh(house, new THREE.PlaneGeometry(.67, .55), glass, sign * .353, .275, -.335);
      wall.rotation.y = Math.PI / 2;
      const pane = mesh(house, new THREE.PlaneGeometry(.448, .67), glass, sign * .177, .687, -.335);
      pane.rotation.set(-Math.PI / 2, 0, -sign * .665, 'ZYX');
      wall.castShadow = pane.castShadow = wall.receiveShadow = pane.receiveShadow = false;
      box(house, '#b3ad87', .022, .023, .67, sign * .35, .55, -.335).castShadow = false;
      box(house, '#a7a380', .024, .55, .024, sign * .35, .275, -.66).castShadow = false;
      box(house, '#c5bd93', .45, .018, .021, sign * .177, .687, -.66).rotation.z = -sign * .665;
    }
    box(house, '#b4b58b', .023, .023, .67, 0, .825, -.335).castShadow = false;
  }

  const stemGeometry = new THREE.CylinderGeometry(.014, .02, .36, 6);
  const leafGeometry = new THREE.ShapeGeometry(petalShape(.15, .26, .005), 12);
  const floret = new THREE.ShapeGeometry(petalShape(.119, .145, .055), 9);
  const pollen = new THREE.SphereGeometry(.061, 10, 6);
  function posy(x, y, z, size, index, delay) {
    const flower = group(garden, 'paper-posy', x, y, z);
    const stem = mesh(flower, stemGeometry, paper('#68896b'), 0, .16, 0);
    stem.rotation.z = Math.sin(index) * .09;
    const leaf = mesh(flower, leafGeometry, paper(index % 2 ? '#7a9a6e' : '#99b378'), 0, .09, 0);
    leaf.rotation.set(-.44, index % 2 * .6, index % 2 ? .85 : -.93);
    const head = group(flower, 'posy-head', 0, .33, .015);
    head.rotation.set(-.5 - (index % 3) * .19, Math.sin(index * .8) * .48, index);
    const hue = ['#e6a4b1', '#efcb7b', '#f7eee1', '#d7b3ce', '#f4c7bd'][index % 5];
    for (let j = 0; j < 5; j++) {
      const ray = group(head, '', 0, 0, j % 2 * .012);
      ray.rotation.z = j * Math.PI * 2 / 5;
      mesh(ray, floret, paper(hue), 0, .036, 0).rotation.x = -.23;
    }
    mesh(head, pollen, paper('#eab365'), 0, 0, .036).scale.z = .42;
    flower.traverse((node) => { if (node.isMesh) node.castShadow = false; });
    sprouts.push({ base: flower, time: delay, size, sway: .075 });
  }
  const dirt = new THREE.CylinderGeometry(1, 1.03, .115, 42);
  const edge = new THREE.CylinderGeometry(1, 1.04, .16, 42);
  for (const sign of [-1, 1]) {
    const x = sign * 3.09;
    const z = sign < 0 ? 1.45 : 1.31;
    const bed = group(garden, 'raised-flower-bed', x, .01, z);
    bed.rotation.y = sign * .48;
    mesh(bed, edge, paper('#d5bc96'), 0, .063, 0).scale.set(1.27, 1, .64);
    mesh(bed, dirt, paper('#957d5c'), 0, .10, 0).scale.set(1.19, 1, .57);
    for (let i = 0; i < 18; i++) {
      const a = i * 2.39996;
      const r = Math.sqrt((i + .4) / 18);
      const p = bed.localToWorld(new THREE.Vector3(Math.cos(a) * r * 1.13, .16, Math.sin(a) * r * .53));
      posy(p.x, p.y, p.z, .65 + (i * 19 % 9) / 12, i + (sign + 1), .88 + i * .05);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i + 1) / 10 * Math.PI / 2;
      prop('meadow_flowers', i % 2 ? 'tuft_g21' : 'flowers_g11', sign * (3.7 * Math.cos(a) + .48),
        2.91 * Math.sin(a) + .06, 1 + (i % 3) * .31, sign * (.12 + i * .12), 1.1 + i * .09, .06);
    }
    for (let i = 0; i < 7; i++) {
      const a = .1 + i * .53;
      posy(sign * (.52 + i * .37), .025, 2.66 + Math.sin(a) * .24, .38 + i % 4 * .13, i + 2, 1.25 + i * .09);
    }
  }
  for (let i = 0; i < 19; i++) {
    const x = .37 + (i * 13 % 19) * .13;
    const z = .96 + (i * 7 % 19) * .088;
    if (i % 3 === 0) posy(x, .02, z, .30 + i % 4 * .10, i, 1.36 + i * .024);
    else {
      const blade = mesh(garden, leafGeometry, paper(i % 2 ? '#819d71' : '#b2c38d'), x, .009, z);
      blade.rotation.set(-.35, i * 2.39996, (i % 5 - 2) * .30);
      blade.scale.setScalar(.36 + i % 4 * .16);
      blade.castShadow = false;
    }
  }

  const sun = new THREE.DirectionalLight('#fff0d9', 1.92);
  sun.position.set(-5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6.7, right: 6.7, top: 5.1, bottom: -5.1, far: 25 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .025;
  sun.shadow.bias = -.00028;
  sun.shadow.radius = 4;
  scene.add(sun, new THREE.HemisphereLight('#fcf4eb', '#e0dabb', 1.38));

  const actor = group(garden, 'spring-traveller');
  const costume = assets.travellerSkins.get('spring');
  const puppet = costume.clone(true);
  actor.add(puppet);
  actor.scale.setScalar(1.62);
  puppet.traverse((node) => {
    if (node.name === 'base_tab') node.visible = false;
    if (node.isMesh) {
      node.castShadow = node.visible;
      node.receiveShadow = false;
    }
  });
  const actorShadow = shadow(actor, .07, .008, .01, .66, .42, .65);
  const mixer = new THREE.AnimationMixer(puppet);
  const walkClip = costume.animations.find(({ name }) => name === 'walk');
  const walk = walkClip ? mixer.clipAction(walkClip) : null;

  let disposed = false;
  const cats = CONFIG.animals.companion.members.map(({ coat }, i) => {
    const root = group(garden, coat);
    const canvas = makeCanvas(256, 192);
    const context = canvas.getContext('2d');
    const map = texture(canvas);
    const material = own(new THREE.MeshBasicMaterial({ map, alphaTest: .35, side: THREE.DoubleSide }));
    const card = mesh(root, new THREE.PlaneGeometry(.88, .66), material, 0, .315, 0);
    card.receiveShadow = card.visible = false;
    const contact = shadow(root, 0, .008, .009, .58, .29, .64);
    contact.visible = false;
    return { coat, root, card, context, map, contact, facing: i === 0 ? 1 : -1, pose: '' };
  });
  let sprites;
  const ready = loadTreasureSprites().then((result) => { if (!disposed) sprites = result; });
  function poseCat(cat, pose) {
    if (!sprites || cat.pose === pose) return;
    const frame = sprites.frames[cat.coat]?.poses;
    if (!frame?.sit) return;
    cat.pose = pose;
    const { x, y, w, h, ax, footY } = frame[pose] ?? frame.sit;
    const g = cat.context;
    g.clearRect(0, 0, 256, 192);
    g.setTransform(cat.facing, 0, 0, 1, cat.facing === -1 ? 256 : 0, 0);
    g.drawImage(sprites.sheet, x, y, w, h, 128 - ax * .86, 182 - footY * .86, w * .86, h * .86);
    g.resetTransform();
    cat.card.visible = cat.contact.visible = true;
    cat.map.needsUpdate = true;
  }

  const butterfly = group(garden, 'paper-butterfly');
  const wingGeometry = new THREE.ShapeGeometry(petalShape(.21, .26, .025), 18);
  const wings = [-1, 1].map((sign) => {
    const hinge = group(butterfly, 'butterfly-wing');
    mesh(hinge, wingGeometry, paper('#efc786'), sign * .013, .025, 0).rotation.z = -sign * .95;
    mesh(hinge, wingGeometry, paper('#e6a0a5'), sign * .022, -.085, .006).rotation.z = -sign * 1.80;
    return hinge;
  });
  box(butterfly, '#85684c', .025, .28, .028, 0, 0, .025);
  butterfly.traverse((node) => { if (node.isMesh) node.castShadow = false; });
  const driftingGeometry = new THREE.ShapeGeometry(petalShape(.075, .119), 10);
  const drifting = Array.from({ length: 14 }, (_, i) => {
    const fleck = mesh(garden, driftingGeometry, paper(i < 6 ? '#f5d4d1' : '#fff0c2'));
    fleck.castShadow = fleck.receiveShadow = false;
    return fleck;
  });

  const tools = { own, group, mesh, paper, box, texture, makeCanvas };
  const bloom = createBloom(tools, garden);
  const skyMotion = createSpringSky(tools, scene);
  const fence = createGardenFence(tools, garden, deckOutline);
  const exit = addPaperSign(tools, fence, 'garden-exit-sign', '↶ 离开花园', .88, .27);
  exit.sign.position.set(.67, .49, 3.03);
  exit.sign.rotation.set(-.21, -.17, -.045);
  box(fence, '#b99a71', .065, .50, .071, .67, .25, 2.98);
  return {
    ...tools, scene, camera, garden, fence, exit, skyMotion, sprouts, actor, actorShadow, walk, mixer, cats, poseCat,
    butterfly, wings, drifting, bloom, ready,
    dispose() {
      disposed = true;
      mixer.uncacheRoot(puppet);
      sun.shadow.dispose();
      for (const resource of owned) resource.dispose();
      owned.clear();
    },
  };
}
