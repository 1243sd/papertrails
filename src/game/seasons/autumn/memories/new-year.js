import { ease, floor, mix } from './paper.js';
import { cup, person, suitcase } from './props.js';
import { cafe, foregroundWipe, hills, movingLandscape } from './sets.js';
import { frostWindow, hotpotDecor, snow, stationDecor } from './new-year-scenery.js';
import { newYearEnding } from './new-year-ending.js';
import { jiefangbeiWalk, jiefangbeiSelfie } from './new-year-jiefangbei.js';

function passingTrain(paper, root, direction) {
  return foregroundWipe(paper, root, 'passing-train-foreground', '#b67c75', direction, (panel) => {
    paper.box(panel, '#e4b28d', 5, .062, .08, 0, -.22, .055);
    paper.box(panel, '#7d5863', 5, .2, .08, 0, -.51, .055);
    for (const x of [-2.27, 2.27]) {
      paper.sheet(panel, '#886b70', .27, 1.15, .05, .027, x, .4, .085);
      paper.sheet(panel, '#edc3a1', .18, .95, .036, .025, x, .44, .11);
    }
  });
}

function ticket(paper, root, x, y, z) {
  const pass = paper.group(root, 'railway-ticket', x, y, z);
  paper.sheet(pass, '#cb9d82', 1.29, .68, .075, .048, 0, 0, -.028);
  paper.sheet(pass, '#f5d9b2', 1.24, .633, .07, .023, 0, 0, -.056);
  paper.box(pass, '#cd8074', 1.21, .105, .01, 0, .237, -.071);
  paper.box(pass, '#f1b08c', 1.21, .02, .008, 0, -.254, -.072);
  for (let i = 0; i < 9; i++) {
    paper.ball(pass, '#c29683', .01, .01, .008, -.311, (i - 4) * .057, -.076);
  }
  for (let i = 0; i < 16; i++) {
    paper.box(pass, '#775359', i % 3 ? .018 : .007, .102, .005, .102 + i * .025, -.147, -.073);
  }
  paper.box(pass, '#966963', .46, .028, .005, .185, .083, -.075);
  paper.box(pass, '#bd896f', .31, .016, .005, .1, -.009, -.075);
  paper.sheet(pass, '#a5645d', .13, .113, .018, .008, -.449, .036, -.076);
  paper.box(pass, '#f2c89c', .077, .044, .008, -.449, .048, -.086);
  for (const x of [-.486, -.414]) paper.ball(pass, '#a5645d', .018, .018, .012, x, -.039, -.077);
  return pass;
}

function compartment(paper, root) {
  const travel = movingLandscape(paper, root, true);
  const flakes = snow(paper, root, 'newyear-train-snow', [0, .52, 4.75], [13.6, 4.2, 4.45], 158, 2.45);
  paper.box(root, '#8d7674', 9, .15, 6, 0, -.075, .5);
  paper.box(root, '#ad8072', 9, .88, .21, 0, .43, 2.34);
  paper.box(root, '#966d68', 9, .54, .22, 0, 3.1, 2.34);
  for (const xx of [-3.45, 3.45]) {
    paper.box(root, '#aa7e73', 3.15, 2.14, .21, xx, 1.82, 2.33);
    const curtain = paper.group(root, 'train-window-curtain', xx * .623, 1.9, 2.03);
    for (let i = 0; i < 6; i++) {
      paper.sheet(curtain, i % 2 ? '#b57c83' : '#975e70', .135, 1.92, .043, .053,
        (i - 2.5) * .096, 0, Math.cos(i * 1.3) * .048);
    }
    paper.box(curtain, '#cba08d', .64, .079, .08, 0, -.25, -.065);
  }
  for (const yy of [.9, 2.83]) paper.box(root, '#d1a692', 4.21, .095, .19, 0, yy, 2.21);
  paper.box(root, '#b08279', .075, 1.9, .15, .15, 1.87, 2.24);
  frostWindow(paper, root);
  for (const x of [-1.28, .81]) {
    paper.box(root, '#aa8285', 1.87, .059, .14, x, 2.98, 1.99);
    for (let i = 0; i < 8; i++) paper.box(root, '#c5a0a0', .028, .047, .27, x + (i - 3.5) * .22, 2.96, 1.94);
  }
  paper.box(root, '#654f61', 2.2, .46, .93, .56, .23, 1.32);
  paper.sheet(root, '#855b72', 2.2, .92, .12, .14, .56, .86, 1.65);
  const girl = person(paper, root, 'girl', .62, .94, -.1);
  girl.root.position.y = .11;
  suitcase(paper, root, '#875e63', 1.6, 0, 1.25);
  const pass = ticket(paper, root, -.39, .78, -.04);
  pass.scale.setScalar(.77);
  const ledge = paper.box(root, '#c89e82', 1.42, .093, .78, -.36, .555, .29);
  ledge.rotation.y = -.06;
  paper.box(root, '#8d625d', .16, .55, .2, -.66, .272, .47);
  cup(paper, root, '#b0a8b2', -.78, .605, .51);
  const wipe = passingTrain(paper, root, -1);
  return (t, p, camera) => {
    travel(t + .22);
    flakes(t);
    girl.pose('sit', t + .75);
    girl.root.rotation.y = -.12 + .11 * Math.sin(t * 1.4);
    pass.rotation.set(.18 + .38 * ease(p), -.13, .09 - .2 * ease(p));
    pass.position.z = mix(-.12, .22, ease(p));
    pass.position.y = mix(.82, .693, ease(p));
    wipe(t, 3, camera);
  };
}

function platform(paper, root) {
  floor(paper, root, '#a88b7b', 13, 14);
  hills(paper, root, 0, 12, true);
  paper.box(root, '#785963', 13, .105, 3.2, 0, -.025, 5.33);
  for (const z of [4.18, 5.34]) paper.box(root, '#9d8a8a', 13, .054, .061, 0, .024, z);
  paper.box(root, '#ecd19d', 12.5, .021, .12, 0, .034, 3.19);
  for (let x = -6; x < 6; x += .53) paper.box(root, '#b29a84', .46, .019, .053, x, .02, 2.98);
  const train = paper.group(root, 'waiting-train', -.14, 0, 4.96);
  for (let x = -7; x <= 7; x += 3.49) {
    paper.sheet(train, '#b67c75', 3.45, 2.15, .26, 1.05, x, 1.49, -.73);
    paper.sheet(train, '#7c626a', 3.41, .37, .17, 1.13, x, 2.47, -.75);
    paper.box(train, '#7d5863', 3.36, .15, .11, x, .63, -.776);
    paper.box(train, '#e4b28d', 3.32, .067, .09, x, 1.1, -.784);
    for (const dx of [-1.01, .06, 1.01]) {
      paper.sheet(train, '#705d64', .71, .65, .072, .043, x + dx, 1.73, -.785);
      paper.sheet(train, '#edc3a1', .62, .55, .061, .019, x + dx, 1.73, -.82);
      paper.box(train, '#a77b72', .039, .552, .031, x + dx, 1.73, -.842);
    }
    for (const dx of [-1.13, 1.13]) {
      const wheel = paper.disk(train, '#543f51', .221, .221, .18, x + dx, .3, -.48, 12);
      wheel.rotation.x = Math.PI / 2;
    }
  }
  for (const x of [-3.72, 3.72]) {
    paper.box(root, '#88696b', .14, 3.2, .15, x, 1.6, 2.68);
  }
  const atmosphere = stationDecor(paper, root);
  const girl = person(paper, root, 'girl', -.93, 1.05, -.45);
  const boy = person(paper, root, 'boy', .92, .86, 1.21);
  const bag = suitcase(paper, root, '#b98370', -1.29, 0, 1.45);
  paper.shadow(root, 3, 1.34, 0, .028, 1.05, .65);
  const entering = passingTrain(paper, root, 1);
  return (t, p, camera) => {
    atmosphere(t);
    train.position.x = -.77 + t * .48;
    girl.root.position.x = mix(-1.26, -.51, ease(t / 1.22));
    girl.root.position.z = mix(1.38, .85, ease(t / 1.22));
    girl.root.rotation.y = mix(-.49, -1.04, ease(t / 1.2));
    boy.root.position.x = mix(1.21, .56, ease(t / 1.29));
    boy.root.rotation.y = mix(1.13, .99, ease(t));
    girl.pose(t < 1.22 ? 'walk' : 'idle', t);
    boy.pose(t < 1.22 ? 'walk' : 'arm_raise', t);
    bag.position.x = girl.root.position.x - .38;
    bag.position.z = girl.root.position.z + .28;
    bag.rotation.x = .19 * (1 - ease(t / 1.22));
    entering(t, 2, camera, false);
  };
}

export const newYear = [
  {
    start: 0, end: 3, caption: '带上一张车票，向你出发',
    from: [-1.25, 1.95, -2.83], to: [-.35, 1.77, -2.91], focus: [-.24, .87, .21],
    endFocus: [.09, 1.2, 1.13], lens: 38, sky: '#9aacc5', set: compartment,
  },
  {
    start: 3, end: 5, caption: '站台上，终于又见到你',
    from: [1.11, 2.25, -4.85], to: [.16, 1.94, -4.04], focus: [0, 1.26, 1.18],
    lens: 42, sky: '#8d98b6', set: platform,
  },
  {
    start: 5, end: 9, caption: '一锅热气腾腾的火锅',
    from: [-.61, 2.23, -4.37], to: [.23, 2.08, -3.65], focus: [0, 1.22, 1.26],
    sky: '#b07b77', set: (paper, root) => cafe(paper, root, true, { decorate: hotpotDecor }),
  },
  {
    start: 9, end: 12, caption: '去重庆解放碑逛街',
    from: [-.55, 2.44, -6.19], to: [.21, 2.06, -5.33], focus: [0, 1.82, 4.10],
    endFocus: [0, 1.66, 3.28], lens: 44, sky: '#5f597f', set: jiefangbeiWalk,
  },
  {
    start: 12, end: 15, caption: '在解放碑前拍一张合照',
    from: [-1.72, 1.97, -4.02], to: [-1.69, 1.89, -3.82], focus: [-1.52, 1.68, .63],
    lens: 42, sky: '#5f597f', set: jiefangbeiSelfie,
  },
  {
    start: 15, end: 18, caption: '',
    from: [-.14, 2.81, -5.8], to: [.16, 2.56, -5.54], focus: [0, 2.14, 4.0],
    lens: 43, sky: '#282944', night: true, animateEnding: true, set: newYearEnding,
  },
];
