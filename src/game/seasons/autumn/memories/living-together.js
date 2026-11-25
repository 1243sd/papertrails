import * as THREE from 'three';
import { ease, floor, mix } from './paper.js';
import { cup, lantern, leafScatter, person, suitcase, tree, windows } from './props.js';
import { cafe, hills } from './sets.js';

function path(paper, root) {
  floor(paper, root, '#b78b6b', 14, 17);
  hills(paper, root, 0, 12);
  const stones = paper.group(root, 'trail-to-home');
  for (let i = 0; i < 15; i++) {
    const x = Math.sin(i * .32 - .4) * .81;
    const paver = paper.sheet(stones, i % 2 ? '#c4a28a' : '#be9980', 1.9, .57, .16, .046, x, .017, i * .69 - 1.49);
    paver.rotation.set(-Math.PI / 2, 0, Math.sin(i) * .12);
  }
  for (const [x, z, scale] of [[-2.3, .81, .86], [2.83, 1.12, 1.16], [-2.3, 3.24, 1.02],
    [2.44, 5.43, 1.18], [-3, 7.6, 1.5], [3.6, 7.8, .97]]) tree(paper, root, x, z, scale, Math.round(z));
  leafScatter(paper, root, 55, 9.8, 12);
  const home = paper.group(root, 'warm-house-along-trail', -.48, 0, 7.72);
  paper.box(home, '#ba8b72', 3.1, 2.3, 2.4, 0, 1.15, .32);
  paper.cut(home, '#9b625e', [[-1.82, 0], [0, .91], [1.82, 0]], 2.73, 0, 2.28, -1.05);
  paper.sheet(home, '#815750', .82, 1.27, .075, .052, .24, .65, -.957);
  windows(paper, home, -.62, 1.24, -.966, .64, .61, '#f1b16f', '#9f6958');
  lantern(paper, home, .91, 1.57, -1.06, .48);
  const girl = person(paper, root, 'girl', -.32, 1.72, Math.PI);
  const bag = suitcase(paper, root, '#a77267', -.6, 0, 1.37);
  const shade = paper.shadow(root, 1.75, .9, 0, .04, 1.72, .72);
  return (t, p) => {
    girl.root.position.z = mix(.79, 3.49, p);
    girl.root.position.x = .15 + .39 * Math.sin(p * 2.5);
    girl.root.rotation.y = Math.PI - .17 * Math.cos(p * 3.2);
    girl.pose('walk', t);
    bag.position.set(girl.root.position.x - .38, .018 + .01 * Math.sin(t * 11), girl.root.position.z - .36);
    bag.rotation.x = -.22 + .036 * Math.sin(t * 6);
    shade.position.set(girl.root.position.x - .13, .039, girl.root.position.z - .12);
  };
}

function entry(paper, root) {
  floor(paper, root, '#b48265', 12, 11);
  const house = paper.group(root, 'door-and-porch', 0, 0, 1.85);
  for (const x of [-2.83, 2.83]) paper.box(house, '#ad725e', 4.02, 3.2, .29, x, 1.6, 0);
  paper.box(house, '#ad725e', 1.68, .8, .29, 0, 2.8, 0);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) paper.box(house, '#996958', 3.93, .013, .07, side * 2.82, .15 + i * .316, -.158);
    paper.box(house, '#dbab88', .12, 2.41, .34, side * .77, 1.2, -.129);
  }
  paper.box(house, '#dbab88', 1.62, .14, .34, 0, 2.34, -.12);
  paper.box(house, '#c39679', 1.96, .14, .69, 0, .065, -.233);
  paper.box(house, '#d3a077', 1.66, .14, 1.44, 0, .065, .64);
  paper.box(house, '#8c5c55', 1.23, .018, .46, 0, .146, -.51);
  windows(paper, house, -2, 1.67, -.17, 1, .93, '#f0b678', '#8d5d55');
  lantern(paper, house, 1.17, 1.91, -.372, .83);
  paper.box(house, '#c28a62', 1.7, 2.8, .15, 0, 1.4, 1.35, .18);
  const pivot = paper.group(house, 'opening-door-hinge', .713, .104, -.055);
  paper.sheet(pivot, '#8c5952', 1.42, 2.17, .07, .115, -.71, 1.085, -.078);
  for (const y of [.61, 1.56]) {
    paper.sheet(pivot, '#aa7563', 1.09, .72, .065, .03, -.72, y, -.103);
    paper.sheet(pivot, '#99685c', .95, .57, .043, .025, -.72, y, -.126);
  }
  paper.ball(pivot, '#e4b17a', .061, .061, .059, -1.21, .97, -.143, .15);
  const shine = paper.own(new THREE.MeshBasicMaterial({
    color: '#fbc990', side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: 0,
  }));
  const spill = new THREE.Shape();
  spill.moveTo(-.63, 0); spill.lineTo(.61, 0); spill.lineTo(1.82, 2.75); spill.lineTo(-1.19, 2.75);
  spill.closePath();
  const shaft = paper.surface(house, new THREE.ShapeGeometry(spill), shine, 0, .015, -.11);
  shaft.rotation.x = -Math.PI / 2;
  const bulb = paper.own(new THREE.PointLight('#ffc282', 0, 5.8, 1.9));
  bulb.position.set(0, 1.65, .42);
  house.add(bulb);
  leafScatter(paper, root, 28, 6, 4.4);
  const boy = person(paper, root, 'boy', -.14, 2.21, -.16);
  boy.root.position.y = .138;
  const girl = person(paper, root, 'girl', .23, .04, 2.72);
  const bag = suitcase(paper, root, '#a77267', -.35, 0, -.4);
  return (t) => {
    const open = ease((t - .62) / 1.58);
    pivot.rotation.y = -1.72 * open;
    shine.opacity = .27 * open;
    bulb.intensity = 11 * open;
    boy.root.position.z = mix(2.39, 1.93, open);
    boy.pose(open < .81 ? 'idle' : 'arm_raise', t);
    girl.root.position.x = mix(.43, .31, ease(t / 1.36));
    girl.root.position.z = mix(.02, .88, ease(t / 1.36));
    girl.root.rotation.y = mix(2.73, 2.62, ease(t / 1.36));
    girl.pose(t < 1.36 ? 'walk' : 'idle', t);
    bag.position.set(girl.root.position.x + .39, 0, girl.root.position.z - .49);
    bag.rotation.x = -.18 * (1 - ease(t / 1.36));
  };
}

function sofa(paper, room, x) {
  const couch = paper.group(room, 'living-room-sofa', x, 0, 2.7);
  paper.sheet(couch, '#a77168', 1.98, .59, .115, .16, 0, .79, .28);
  paper.box(couch, '#865956', 2.11, .24, .82, 0, .245, 0);
  for (const side of [-1, 1]) {
    paper.box(couch, '#744c48', .11, .16, .57, side * .87, .09, .03);
    paper.sheet(couch, '#af7a6e', .98, .19, .078, .79, side * .501, .42, -.43);
    paper.sheet(couch, '#9b6a63', .21, .37, .078, .85, side * .988, .47, -.47);
    const pillow = paper.sheet(couch, side > 0 ? '#dbad84' : '#c8978a', .35, .32, .093, .11,
      side * .78, .65, .16);
    pillow.rotation.z = side * .21;
  }
  paper.shadow(room, 2.71, 1.63, x, .016, 2.55);
  return couch;
}

function kitchen(paper, room, x) {
  const counter = paper.group(room, 'cooking-counter', x, 0, 3.26);
  paper.box(counter, '#9d6860', 2.39, .81, .65, 0, .406, 0);
  paper.box(counter, '#d0aa8d', 2.5, .089, .72, 0, .834, 0);
  for (let i = 0; i < 3; i++) {
    paper.sheet(counter, '#ae7969', .684, .6, .045, .032, (i - 1) * .77, .429, -.354);
    paper.box(counter, '#e1b69d', .14, .043, .052, (i - 1) * .77, .57, -.39);
  }
  paper.box(counter, '#716067', .66, .04, .59, -.57, .902, 0);
  paper.disk(counter, '#9b6653', .24, .19, .154, -.57, .996, .03);
  paper.disk(counter, '#db9b67', .204, .203, .021, -.57, 1.074, .03);
  paper.box(counter, '#73514e', .28, .03, .064, -.28, 1.025, -.04);
  paper.box(counter, '#b4866a', .58, .051, .39, .26, .906, -.07).rotation.y = -.12;
  for (let i = 0; i < 5; i++) {
    paper.ball(counter, i % 2 ? '#7c885d' : '#c76c55', .044, .031, .035, .097 + i * .054, .946, -.14 + i % 2 * .096);
  }
  paper.box(counter, '#a77b65', 2.26, .086, .258, 0, 1.91, .29);
  for (const dx of [-.7, -.33, .71]) {
    paper.disk(counter, '#c69778', .084, .071, .164, dx, 2.031, .25, 12);
    paper.disk(counter, '#e0b997', .09, .087, .04, dx, 2.13, .25, 12);
  }
  return counter;
}

function personalObjects(paper, room) {
  const shelf = paper.group(room, 'pairs-of-household-objects', -.17, .17, 3.87);
  paper.box(shelf, '#a37b67', 1.38, .089, .36, 0, 1.47, -.02);
  paper.box(shelf, '#8e625a', 1.38, .089, .45, 0, .8, -.07);
  for (const x of [-.63, .63]) paper.box(shelf, '#996b5f', .095, 1.68, .41, x, .65, -.06);
  cup(paper, shelf, '#e8be87', -.3, 1.516, -.045);
  cup(paper, shelf, '#cf8c89', .17, 1.516, -.045);
  for (const [i, x] of [-.32, .155].entries()) {
    paper.box(shelf, i ? '#de95a1' : '#b2af81', .023, .232, .029, x, 1.743, -.081).rotation.z = i ? -.16 : .14;
    paper.box(shelf, '#f2d5af', .043, .063, .039, x + (i ? .018 : -.018), 1.872, -.087);
    for (const shift of [-.093, .093]) {
      const slipper = paper.sheet(shelf, i ? '#b57777' : '#a09887', .141, .297, .067, .041, x + shift, .861, -.081);
      slipper.rotation.set(-Math.PI / 2, 0, -.31 + i * .13);
      paper.ball(shelf, '#e3ba9b', .068, .029, .08, x + shift, .915, -.064);
    }
  }
}

function room(paper, root, daylight) {
  floor(paper, root, '#b8886e', 14, 12);
  paper.box(root, '#b98e78', 14, 3.7, .2, 0, 1.85, 4.26);
  paper.box(root, '#9d6d60', 14, .16, .14, 0, .08, 4.14);
  for (let i = 0; i < 21; i++) {
    paper.box(root, '#a77a64', .017, .009, 10, i * .675 - 6.75, .01, 1.13);
  }
  for (const x of [-3.22, 3.22]) lantern(paper, root, x, 2.81, 2.36, .82);
  kitchen(paper, root, 3.12);
  const boy = person(paper, root, 'boy', 3.64, 2.61, 2.83);
  const girl = person(paper, root, 'girl', 2.82, 2.69, -2.63);
  const spoon = paper.group(boy.hand, 'wooden-cooking-spoon', 0, -.052, -.025);
  paper.box(spoon, '#d0a27e', .019, .247, .019, 0, .068, 0);
  paper.ball(spoon, '#be8a63', .042, .064, .015, 0, .196, 0);
  const diner = cafe(paper, root, false, {
    center: 0, z: 1.54, booth: true, showPair: (t) => !daylight && t >= 2.25 && t < 4.23,
  });
  personalObjects(paper, root);
  const couch = sofa(paper, root, -3.21);
  const couchBoy = person(paper, couch, 'boy', .38, -.203, .19);
  const couchGirl = person(paper, couch, 'girl', -.39, -.199, -.17);
  couchBoy.root.position.y = .012;
  couchGirl.root.position.y = .016;
  const lightWindow = windows(paper, root, -3.11, 2.2, 4.074, 1.94, 1.42, '#f2bd8c', '#a27567');
  const windowPaint = paper.own(lightWindow.children[0].material.clone());
  lightWindow.children[0].material = windowPaint;
  const rug = paper.sheet(root, '#a86b6b', 2.54, 1.76, .12, .026, -3.11, .012, 1.41);
  rug.rotation.x = -Math.PI / 2;
  const pool = paper.own(new THREE.MeshBasicMaterial({
    color: '#ffd5a3', side: THREE.DoubleSide, transparent: true, depthWrite: false,
  }));
  const ray = new THREE.Shape();
  ray.moveTo(0, 0); ray.lineTo(.55, 0); ray.lineTo(1.6, 3.08); ray.lineTo(.17, 3.08); ray.closePath();
  const rays = paper.group(root, 'sunlight-through-window', -3.98, .063, 3.62);
  for (const x of [0, .68]) {
    paper.surface(rays, new THREE.ShapeGeometry(ray), pool, x, 0, 0).rotation.x = -Math.PI / 2;
  }
  const dawn = new THREE.Color('#ffe0ac');
  const noon = new THREE.Color('#fff2c5');
  const dusk = new THREE.Color('#b887a1');
  return (t, p) => {
    boy.root.visible = girl.root.visible = !daylight && t < 2.25;
    boy.pose('arm_raise', .27 + .14 * Math.sin(t * 6.1));
    girl.pose('handover', .32 + .1 * Math.sin(t * 5.3 + .7));
    spoon.rotation.set(.74, .15, .52 + .21 * Math.sin(t * 6.1));
    diner(t, p);
    couchBoy.root.visible = couchGirl.root.visible = daylight || t >= 5.16;
    couchBoy.pose('sit', t + .75);
    couchGirl.pose('sit', t + 1.03);
    const daylightPhase = daylight ? p : .16;
    rays.position.x = mix(-4.52, -2.95, daylightPhase);
    pool.opacity = .23 * Math.sin(Math.PI * (daylightPhase * .89 + .095)) + .045;
    windowPaint.color.copy(daylightPhase < .5 ? dawn : noon).lerp(daylightPhase < .5 ? noon : dusk,
      ease(daylightPhase < .5 ? daylightPhase * 2 : (daylightPhase - .5) * 2));
    windowPaint.emissive.copy(windowPaint.color);
  };
}

export const livingTogether = [
  {
    start: 0, end: 3, caption: '拉着行李，走向以后一起住的地方',
    from: [-.9, 2.03, -3.79], to: [-.91, 2.44, -2.3], focus: [.17, 1.16, 2.1],
    endFocus: [0, 1.19, 4.02], lens: 41, sky: '#e4b68e', set: path,
  },
  {
    start: 3, end: 6, caption: '门开了，屋里亮着暖灯',
    from: [-1.42, 1.95, -3.36], to: [-.51, 1.73, -2.8], focus: [0, 1.2, 1.62],
    lens: 40, sky: '#d49e7f', set: entry,
  },
  {
    start: 6, end: 13, caption: '一起做饭、吃饭，把日常变成两个人的',
    frames: [
      { offset: 0, from: [4.7, 2.36, -.19], to: [4.11, 2.16, .12], focus: [3.28, 1.22, 2.85], lens: 39 },
      { offset: 2.25, from: [-.44, 2.04, -2.62], to: [.21, 2.01, -2.37], focus: [0, 1.04, 1.62], lens: 38 },
      { offset: 4.23, from: [-.62, 1.76, 1.28], to: [-.3, 1.73, 1.63], focus: [-.25, 1.45, 3.79], lens: 39 },
      { offset: 5.16, from: [-3.62, 2.07, -.83], to: [-3.41, 1.98, -.95], focus: [-3.24, 1.1, 2.66], lens: 40 },
    ],
    sky: '#be9380', set: (paper, root) => room(paper, root, false),
  },
  {
    start: 13, end: 16, caption: '从窗边的晨光，等到傍晚',
    from: [-3.41, 1.98, -.95], to: [-3.06, 2.35, -1.65], focus: [-3.24, 1.1, 2.66],
    endFocus: [-3.13, 1.5, 2.93], lens: 40, sky: '#bd8a79', daylight: true,
    set: (paper, root) => room(paper, root, true),
  },
  { start: 16, end: 18, caption: '' },
];
