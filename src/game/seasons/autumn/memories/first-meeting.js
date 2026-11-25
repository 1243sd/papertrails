import { clamp, ease, floor, mix } from './paper.js';
import { lantern, leafScatter, person, roseBundle, tree } from './props.js';
import { cafe, foregroundWipe, hills, movingLandscape, street } from './sets.js';

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

function routeMap(paper, root) {
  floor(paper, root, '#a0634d', 13, 11);
  const map = paper.group(root, 'fold-out-road-map', 0, .72, .65);
  map.rotation.x = -Math.PI / 2;
  const outline = [[-2.48, -1.1], [-1.08, -1.29], [.17, -1.19], [1.3, -1.25], [2.41, -1.06],
    [2.32, 1.17], [.97, 1.3], [-.32, 1.22], [-1.46, 1.32], [-2.38, 1.16]];
  paper.cut(map, '#cf9c75', outline, .07, 0, 0, -.09);
  paper.cut(map, '#eed0a1', outline, .033, 0, 0, -.006);
  for (const x of [-1.13, .08, 1.26]) {
    paper.line(map, '#b28d73', .013, [[x - .03, -1.19, .036], [x, .08, .032], [x + .035, 1.21, .035]]);
    paper.line(map, '#ffdbab', .009, [[x + .008, -1.19, .039], [x + .013, 0, .041], [x + .057, 1.21, .034]]);
  }
  const river = [[-2.37, .17, .047], [-1.8, .16, .055], [-1.19, .54, .058], [-.66, .62, .053],
    [0, .33, .05], [.59, .13, .052], [1.24, .16, .052], [1.83, .41, .054], [2.35, .51, .053]];
  paper.line(map, '#87a19a', .05, river);
  paper.line(map, '#a3b2a3', .024, river.map(([x, y, z]) => [x, y + .027, z + .02]));
  for (let i = 0; i < 18; i++) {
    const x = ((i * 47) % 99) / 99 * 4 - 2;
    const y = ((i * 33) % 101) / 101 * 1.94 - .97;
    const block = paper.sheet(map, ['#a3a375', '#b89f73', '#c39d79'][i % 3], .1 + i % 3 * .075,
      .07 + i % 4 * .026, .024, .016, x, y, .045);
    block.rotation.z = i * .29;
  }
  const points = [[1.82, .83, .085], [1.27, .58, .087], [.87, .37, .091],
    [.43, .42, .083], [-.06, .14, .09], [-.46, -.39, .09], [-1.13, -.53, .09], [-1.76, -.81, .097]];
  paper.line(map, '#ab7560', .061, points.map(([x, y, z]) => [x, y, z - .033]));
  const gold = paper.line(map, '#f4b14f', .035, points, .47);
  const dot = paper.ball(map, '#ffd078', .075, .075, .044, ...points[0], .59);
  for (const [x, y, z] of [points[0], points.at(-1)]) {
    paper.ball(map, '#aa5b50', .091, .091, .04, x, y, z);
    paper.ball(map, '#f1ae75', .051, .051, .039, x, y, z + .04);
  }
  const pencil = paper.group(root, 'pencil-beside-map', 2.46, .76, 1.68);
  pencil.rotation.y = -.64;
  paper.box(pencil, '#bb6b44', .75, .068, .068, 0, 0, 0);
  const tip = paper.disk(pencil, '#e4bd8b', .036, 0, .15, .435, 0, 0, 6);
  tip.rotation.z = Math.PI / 2;
  paper.box(pencil, '#d4a391', .099, .069, .07, -.424, 0, 0);
  paper.shadow(root, 5.9, 3.45, .12, .016, .55, .77);
  const wipe = carPillar(paper, root, 1);
  return (t, p, camera) => {
    const traveled = clamp(t / 1.72);
    gold.geometry.setDrawRange(0, Math.ceil(traveled * gold.geometry.index.count / 3) * 3);
    dot.position.copy(gold.geometry.parameters.path.getPoint(traveled));
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
  const boy = person(paper, root, 'boy', .54, 1.16, -.77);
  const bouquet = roseBundle(paper, root, -.24, .7, .96);
  bouquet.rotation.set(-.24, -.1, -.26);
  bouquet.scale.setScalar(.83);
  const away = carPillar(paper, root, -1);
  const arrival = roadsideTree(paper, root, 1);
  return (t, p, camera) => {
    drive(t);
    boy.pose('sit', t + .75);
    boy.root.rotation.y = -.74 + .08 * Math.sin(t * 2.1);
    bouquet.rotation.z = -.26 + Math.sin(t * 3.2) * .034;
    away(t, 2, camera, false);
    arrival(t, 2, camera);
  };
}

function meeting(paper, root) {
  floor(paper, root, '#c2926a');
  hills(paper, root, 0, 13);
  paper.box(root, '#b48971', 4.2, .025, 12.7, 0, .013, 1.6);
  for (let i = 0; i < 11; i++) paper.box(root, '#a7816e', 4.17, .006, .021, 0, .03, i * .8 - 3.2);
  for (const [x, z, scale] of [[-3.2, 1.3, 1.32], [3, 1.55, 1], [-2.65, 5.4, .97], [3, 7, 1.18], [-5, 6, 1.42]]) {
    tree(paper, root, x, z, scale, Math.round(z));
  }
  for (const x of [-2.33, 2.33]) {
    paper.line(root, '#845846', .037, [[x, 0, 3.12], [x, 1.61, 3.12], [x * .91, 2.13, 3.12]]);
    lantern(paper, root, x * .91, 1.78, 3.12, .73);
  }
  leafScatter(paper, root, 55, 8, 13);
  paper.shadow(root, 2.75, 1.27, 0, .03, .68, .77);
  const boy = person(paper, root, 'boy', 1.13, .75, 1.1);
  const girl = person(paper, root, 'girl', -1.18, .56, -1.11);
  const bouquet = roseBundle(paper, root);
  bouquet.scale.setScalar(.88);
  const wipe = roadsideTree(paper, root, -1);
  return (t, p, camera) => {
    boy.root.position.x = mix(1.26, .55, ease(t / 1.1));
    boy.root.position.z = mix(.89, .64, ease(t / 1.1));
    boy.root.rotation.y = mix(-.54, 1.22, ease(t / 1.2));
    girl.root.position.x = mix(-1.33, -.58, ease(t / 1.14));
    girl.root.position.z = mix(.72, .59, ease(t / 1.14));
    girl.root.rotation.y = mix(.55, -1.23, ease(t / 1.24));
    boy.pose(t < 1.06 ? 'walk' : 'handover', t);
    girl.pose(t < 1.06 ? 'walk' : 'receive', t + .14);
    boy.hand.getWorldPosition(bouquet.position);
    const target = girl.hand.getWorldPosition(bouquet.position.clone());
    bouquet.position.lerp(target, ease((t - 1.68) / .49));
    bouquet.rotation.set(.035, -.22, mix(.22, -.29, ease((t - 1.68) / .49)));
    wipe(t, 3, camera, false);
  };
}

export const firstMeeting = [
  {
    start: 0, end: 2, caption: '沿着地图上的金线出发',
    from: [1.55, 4.6, -3.23], to: [.57, 4.15, -2.85], focus: [0, .72, .58], lens: 42,
    sky: '#b67c61', set: routeMap,
  },
  {
    start: 2, end: 4, caption: '车窗外的秋色向后掠过',
    from: [-1.88, 1.63, -3.38], to: [-.95, 1.7, -2.6], focus: [.38, 1.4, 1.5],
    sky: '#ecbb8d', set: insideCar,
  },
  {
    start: 4, end: 7, caption: '第一次见面，有一束玫瑰',
    from: [-.5, 2.03, -4.85], to: [.18, 1.62, -3.42], focus: [0, .93, .67], lens: 39,
    sky: '#e4b68a', set: meeting,
  },
  {
    start: 7, end: 10, caption: '坐下来一起吃顿晚饭',
    from: [-.33, 2.12, -3.91], to: [.59, 1.85, -3.12], focus: [0, 1.05, 1.16], lens: 38,
    sky: '#ab7465', set: (paper, root) => cafe(paper, root, false),
  },
  {
    start: 10, end: 13, caption: '并肩走过亮起灯的街',
    from: [.66, 2.25, -4.76], to: [.35, 1.89, -3.81], focus: [0, 1.05, 2.1], endFocus: [0, .9, .45],
    sky: '#bd8482', set: street,
  },
  { start: 13, end: 16, caption: '' },
];
