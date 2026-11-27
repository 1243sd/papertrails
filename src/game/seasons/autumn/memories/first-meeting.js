import * as THREE from 'three';
import { clamp, ease, floor, mix } from './paper.js';
import { person, roseBundle } from './props.js';
import { cafe, foregroundWipe, movingLandscape } from './sets.js';
import { dinnerDecor, marketStreet, riversidePark } from './first-meeting-scenery.js';
import { firstMeetingEnding } from './first-meeting-ending.js';
import { meetingEffects, routeEffects, travelEffects } from './first-meeting-effects.js';

function carPillar(paper, root, direction) {
  return foregroundWipe(paper, root, 'car-window-pillar-foreground', '#654541', direction, (pillar) => {
    for (const x of [-2.43, 2.43]) paper.box(pillar, '#b58675', .077, 5, .056, x, 0, .014);
  });
}

function roadsideTree(paper, root, direction) {
  return foregroundWipe(paper, root, 'roadside-tree-trunk-foreground', '#7d4f47', direction, (trunk) => {
    for (const x of [-2.41, -2.32, 2.36, 2.43]) paper.box(trunk, '#9e6653', .029, 5, .057, x, 0, .014);
  });
}

function mountain(paper, map, x, y, width, depth, height, seed) {
  const positions = [], indices = [], colors = [];
  const shades = ['#8b9d72', '#768c72', '#a8a578', '#829575', '#6b8572'].map((color) => new THREE.Color(color));
  const sides = 10;
  const rings = [[1, .045], [.70, height * .27], [.43, height * .61], [.14, height * .94]];
  for (const [radius, level] of rings) {
    for (let i = 0; i < sides; i++) {
      const rad = i / sides * Math.PI * 2;
      const crag = 1 + .19 * Math.sin(i * 3.14 + i * 1.73 + seed);
      positions.push(x + width * radius * crag * Math.cos(rad) + (1 - radius) * width * .24,
        y + depth * radius * crag * Math.sin(rad) - (1 - radius) * depth * .21,
        level + (1 - radius) * height * .12 * Math.sin(i * 1.78 + seed));
      const tone = shades[(i + seed) % shades.length];
      colors.push(tone.r, tone.g, tone.b);
    }
  }
  positions.push(x + width * .24, y - depth * .21, height);
  colors.push(.48, .45, .31);
  for (let ring = 0; ring < rings.length; ring++) {
    for (let i = 0; i < sides; i++) {
      const a = ring * sides + i;
      const b = ring * sides + (i + 1) % sides;
      if (ring === rings.length - 1) indices.push(a, b, rings.length * sides);
      else indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.setIndex(indices);
  terrain.computeVertexNormals();
  paper.surface(map, terrain, paper.own(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .94 }))).name = 'raised-map-peak';
}

function routeMap(paper, root) {
  floor(paper, root, '#a0634d', 13, 11);
  const map = paper.group(root, 'fold-out-road-map', 0, .72, .65);
  map.rotation.x = -Math.PI / 2;
  const outline = [[-2.48, -1.1], [-1.08, -1.29], [.17, -1.19], [1.3, -1.25], [2.41, -1.06],
    [2.32, 1.17], [.97, 1.3], [-.32, 1.22], [-1.46, 1.32], [-2.38, 1.16]];
  paper.cut(map, '#9a6957', outline.map(([x, y]) => [x * 1.045, y * 1.073]), .12, 0, 0, -.167);
  paper.cut(map, '#cf9c75', outline, .052, 0, 0, -.056);
  paper.cut(map, '#dccb9e', outline.map(([x, y]) => [x * .971, y * .955]), .035, 0, 0, .002);
  for (const x of [-1.13, .08, 1.26]) {
    paper.line(map, '#baa57d', .006, [[x - .03, -1.12, .040], [x, .08, .042], [x + .035, 1.15, .042]]);
  }
  const river = [[-2.32, -.33], [-1.85, -.52], [-1.62, -.38], [-1.15, -.35], [-.76, -.63], [-.15, -.78],
    [.44, -.69], [.87, -.38], [1.27, -.34], [1.79, -.51], [2.28, -.3]].map(([x, y]) => [x, y, .046]);
  paper.line(map, '#b1bb96', .104, river);
  paper.line(map, '#6c9895', .075, river.map(([x, y, z]) => [x, y, z + .009]));
  paper.line(map, '#a0beb1', .019, river.map(([x, y, z]) => [x, y + .035, z + .071]));
  for (const [x, y, width, depth, height, seed] of [
    [-.58, .12, .56, .39, .58, 2], [-.11, .23, .64, .48, .98, 4], [.44, .11, .44, .35, .70, 1],
    [.29, -.19, .38, .29, .52, 3], [-.43, -.27, .45, .28, .45, 0], [.57, .48, .29, .27, .43, 2],
  ]) mountain(paper, map, x, y, width, depth, height, seed);
  for (const [x, y, size] of [[-1.85, .49, .21], [.03, -.99, .20], [1.61, .49, .25], [2.05, .61, .18]]) {
    for (let i = 0; i < 7; i++) {
      const px = x + Math.cos(i * 2.4) * size * (i / 7);
      const py = y + Math.sin(i * 2.4) * size * (i / 7);
      paper.disk(map, i % 2 ? '#859172' : '#9b9e71', 0, .025 + i % 3 * .009, .085 + i % 4 * .019,
        px, py, .089, 5).rotation.x = Math.PI / 2;
    }
  }
  const points = [[2.07, -.82], [1.56, -.92], [1.24, -.74], [1.42, -.47], [1.99, -.22], [1.78, .05],
    [1.25, .09], [.98, .38], [1.14, .7], [.82, .91], [.25, .91], [-.25, .78], [-.77, .66], [-1.01, .42],
    [-1.32, .19], [-1.67, .29], [-1.95, .095], [-1.74, -.19], [-1.36, -.49], [-1.57, -.74], [-2.01, -.64]]
    .map(([x, y], index) => [x, y, index === 3 || index === 18 ? .155 : .109]);
  const at = [points[0], points.at(-1)];
  for (const [cx, cy] of at) {
    for (let i = 0; i < 8; i++) {
      const x = cx + Math.cos(i * 2.39) * (.11 + i * .023);
      const y = cy + Math.sin(i * 2.39) * (.13 + i * .015);
      paper.box(map, ['#bc9077', '#a0a176', '#ebc693'][i % 3], .06 + i % 2 * .035, .096, .035 + i % 3 * .019,
        x, y, .062).rotation.z = Math.sin(i) * .53;
    }
  }
  paper.line(map, '#95624f', .044, points.map(([x, y, z]) => [x, y, z - .022]));
  const gold = paper.line(map, '#ffc45e', .031, points, .46);
  const dot = paper.ball(map, '#fff0ae', .061, .061, .04, ...points[0], .61);
  const light = routeEffects(paper, map, gold.geometry.parameters.path, river);
  for (const [x, y, z] of [points[0], points.at(-1)]) {
    paper.ball(map, '#a65351', .083, .083, .054, x, y, z);
    paper.ball(map, '#f3b968', .038, .038, .028, x, y, z + .049);
  }
  const compass = paper.group(map, 'map-compass-rose', -1.95, .83, .059);
  paper.ball(compass, '#b9a681', .172, .172, .022, 0, 0, 0);
  paper.ball(compass, '#ebd7ab', .143, .143, .019, 0, 0, .014);
  paper.cut(compass, '#9a5e50', [[0, .201], [.039, .036], [.127, 0], [.039, -.036],
    [0, -.201], [-.039, -.036], [-.127, 0], [-.039, .036]], .009, 0, 0, .036);
  const pencil = paper.group(root, 'pencil-beside-map', 2.46, .76, 1.68);
  pencil.rotation.y = -.64;
  paper.box(pencil, '#bb6b44', .75, .068, .068, 0, 0, 0);
  const tip = paper.disk(pencil, '#e4bd8b', .036, 0, .15, .435, 0, 0, 6);
  tip.rotation.z = Math.PI / 2;
  paper.box(pencil, '#d4a391', .099, .069, .07, -.424, 0, 0);
  paper.shadow(root, 5.9, 3.45, .12, .016, .55, .77);
  const wipe = carPillar(paper, root, 1);
  return (t, p, camera) => {
    const traveled = clamp(t / 1.65);
    gold.geometry.setDrawRange(0, Math.ceil(traveled * gold.geometry.index.count / 3) * 3);
    dot.position.copy(gold.geometry.parameters.path.getPoint(traveled));
    light(t, traveled);
    map.rotation.z = .04 - .067 * ease(p);
    wipe(t, 2, camera);
  };
}

function insideCar(paper, root) {
  const drive = movingLandscape(paper, root);
  paper.box(root, '#684d49', 9, .19, 5.4, 0, -.08, .55);
  paper.box(root, '#8c624e', 9, .69, .18, 0, .34, 2.14);
  paper.box(root, '#624741', 9, .32, .24, 0, 2.58, 2.05);
  for (const [x, rotation] of [[-2.05, -.13], [2.02, .16]]) {
    const pillar = paper.box(root, '#654541', .31, 2.2, .31, x, 1.6, 2.04);
    pillar.rotation.z = rotation;
    paper.box(root, '#b58675', .045, 2.19, .08, x + .14, 1.58, 1.83).rotation.z = rotation;
  }
  paper.box(root, '#c8a08a', 8.54, .067, .33, 0, .71, 1.93);
  paper.box(root, '#64474a', 8.4, .47, 1.15, 0, .29, 1.37);
  paper.box(root, '#956a65', 2.58, .14, .85, .69, .46, 1.16);
  paper.sheet(root, '#a37770', 2.58, .88, .08, .15, .69, .89, 1.62);
  paper.sheet(root, '#ae877d', .51, .31, .081, .16, 1.24, 1.396, 1.66);
  const boy = person(paper, root, 'boy', .54, .84, -.77);
  boy.root.position.y = .14;
  const bouquet = roseBundle(paper, root, -.24, .7, .96);
  bouquet.rotation.set(-.24, -.1, -.26);
  bouquet.scale.setScalar(.83);
  const away = carPillar(paper, root, -1);
  const arrival = roadsideTree(paper, root, 1);
  const light = travelEffects(paper, root);
  return (t, p, camera) => {
    drive(t);
    light(t);
    boy.pose('sit', t + .75);
    boy.root.rotation.y = -.74 + .08 * Math.sin(t * 2.1);
    bouquet.rotation.z = -.26 + Math.sin(t * 3.2) * .034;
    away(t, 2, camera, false);
    arrival(t, 2, camera);
  };
}

function meeting(paper, root) {
  const flow = riversidePark(paper, root);
  const light = meetingEffects(paper, root);
  paper.shadow(root, 2.75, 1.27, 0, .014, -.32, .77);
  const boy = person(paper, root, 'boy', 1.15, -.36, 1.1);
  const girl = person(paper, root, 'girl', -1.24, -.46, -1.11);
  const bouquet = roseBundle(paper, root);
  bouquet.scale.setScalar(.69);
  const target = new THREE.Vector3();
  const wipe = roadsideTree(paper, root, -1);
  return (t, p, camera) => {
    flow(t);
    const close = ease((t - 1.48) / .57);
    boy.root.position.x = mix(1.28, .57, ease(t / .96)) - .215 * close;
    boy.root.rotation.y = mix(.63, 1.17, ease(t / .92));
    girl.root.position.x = mix(-1.31, -.59, ease(t / 1.08)) + .217 * close;
    girl.root.position.z = -.46 - .20 * close;
    girl.root.rotation.y = mix(-.66, -1.22, ease(t / 1.08));
    if (t < .83) boy.pose('walk', t);
    else if (t < 2.41) boy.pose('reveal_bouquet', t - 1.02);
    else boy.pose('handover', .65 * (1 - ease((t - 2.41) / .5)));
    if (t < 1.02) girl.pose('walk', t);
    else if (t < 1.47) girl.pose('idle', t);
    else girl.pose('receive', t - 1.47);
    boy.hand.getWorldPosition(bouquet.position);
    girl.hand.getWorldPosition(target);
    const reveal = ease((t - 1.02) / .64);
    const pass = ease((t - 2.13) / .28);
    bouquet.visible = t >= .94;
    bouquet.position.lerp(target, pass);
    bouquet.rotation.set(mix(-.71, .035, reveal), -.22, mix(2.56, mix(.18, -.29, pass), reveal));
    light(t, bouquet);
    wipe(t, 3, camera, false);
  };
}

export const firstMeeting = [
  {
    start: 0, end: 2, caption: '沿着地图上的金线出发',
    from: [1.59, 4.37, -3.73], to: [.72, 3.72, -3.47], focus: [0, .85, .58], lens: 44,
    sky: '#b67c61', set: routeMap,
  },
  {
    start: 2, end: 4, caption: '车窗外的秋色向后掠过',
    from: [-1.88, 1.63, -3.38], to: [-.95, 1.7, -2.6], focus: [.38, 1.4, 1.5],
    sky: '#ecbb8d', set: insideCar,
  },
  {
    start: 4, end: 7, caption: '第一次见面，有一束玫瑰',
    from: [.33, 2.43, -5.84], to: [.20, 2.06, -4.8], focus: [0, 1.39, 1.5], lens: 41,
    sky: '#e4b68a', set: meeting,
  },
  {
    start: 7, end: 10, caption: '坐下来一起吃顿晚饭',
    from: [-.4, 2.13, -4.61], to: [.46, 1.89, -3.82], focus: [0, 1.19, 1.55], lens: 40,
    sky: '#ab7465', set: (paper, root) => cafe(paper, root, false, { decorate: dinnerDecor }),
  },
  {
    start: 10, end: 13, caption: '并肩走过亮起灯的街',
    from: [.38, 2.31, -4.96], to: [.04, 1.96, -4.91], focus: [0, 1.25, 2.2], endFocus: [0, 1.24, .8], lens: 43,
    sky: '#a87786', set: marketStreet,
  },
  {
    start: 13, end: 16, caption: '',
    from: [.14, 2.63, -5.65], to: [-.11, 2.31, -5.12], focus: [0, 1.50, 2.88], lens: 43,
    sky: '#221d3c', night: true, animateEnding: true, set: firstMeetingEnding,
  },
];
