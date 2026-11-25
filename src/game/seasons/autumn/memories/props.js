import { createCharacter } from '../characters.js';
import { mix, ease } from './paper.js';

const leafCut = [[0, -.18], [.1, -.1], [.16, .05], [.04, .21], [-.07, .14], [-.12, -.01], [-.08, -.12]];
const foliage = ['#b24d36', '#d56d38', '#e79a4e', '#c85f36', '#d88b40', '#a04b42'];

export function person(paper, scene, kind, x, z, yaw = 0) {
  const actor = paper.own(createCharacter(kind));
  scene.add(actor.root);
  actor.root.position.set(x, 0, z);
  actor.root.rotation.y = yaw;
  return actor;
}

export function roseBundle(paper, parent, x = 0, y = 0, z = 0) {
  const bouquet = paper.group(parent, 'layered-rose-bouquet', x, y, z);
  paper.cut(bouquet, '#d18873', [[-.065, 0], [.079, -.02], [.29, .42], [.14, .53], [-.31, .43]], .024, 0, 0, .04);
  paper.cut(bouquet, '#f0b8a3', [[-.05, .01], [.076, 0], [.23, .36], [.17, .47], [-.255, .39]], .018, 0, 0, -.065);
  paper.cut(bouquet, '#b26964', [[-.072, .012], [.072, -.014], [-.031, -.17], [-.064, -.15]], .009, 0, 0, -.08);
  paper.line(bouquet, '#b14755', .016, [[-.08, .065, -.085], [0, .045, -.105], [.095, .068, -.077]]);
  [[-.17, .47, .005], [-.085, .61, .014], [0, .5, -.077], [.082, .59, 0], [.17, .464, .003], [.026, .64, .055]].forEach(([px, py, pz], index) => {
    paper.line(bouquet, '#617049', .011, [[0, .067, .004], [px * .6, py * .6, pz * .8], [px, py, pz]]);
    for (let p = 0; p < 7; p++) {
      const angle = p / 7 * Math.PI * 2 + index * .85;
      const petal = paper.ball(bouquet, ['#a02c4b', '#ca435c', '#d55b68'][p % 3], .052, .047, .021,
        px + Math.cos(angle) * .044, py + Math.sin(angle) * .041, pz - .039 + p * .002);
      petal.rotation.z = angle;
    }
    paper.ball(bouquet, '#8d304a', .033, .033, .029, px, py, pz - .055);
    paper.ball(bouquet, '#e16b74', .021, .02, .018, px, py, pz - .077);
  });
  for (const [px, py, angle] of [[-.21, .44, .9], [.22, .42, -1.1], [-.12, .55, .61], [.14, .54, -.8]]) {
    const leaf = paper.cut(bouquet, '#63795a', leafCut, .009, px, py, .01);
    leaf.scale.setScalar(.58);
    leaf.rotation.z = angle;
  }
  return bouquet;
}

export function suitcase(paper, parent, color, x, y, z) {
  const bag = paper.group(parent, 'paper-suitcase', x, y, z);
  paper.sheet(bag, color, .54, .69, .09, .27, 0, .44, -.14);
  paper.sheet(bag, '#613f42', .455, .61, .07, .012, 0, .44, -.158);
  paper.sheet(bag, color, .42, .56, .07, .015, 0, .44, -.174);
  for (const dx of [-.18, .18]) {
    paper.ball(bag, '#262938', .061, .065, .061, dx, .065, .065);
    paper.box(bag, '#ab8f80', .018, .34, .025, dx * .69, .929, .085);
    paper.box(bag, '#bc9376', .038, .56, .023, dx * .69, .443, -.19);
  }
  paper.sheet(bag, '#573b42', .3, .058, .022, .065, 0, 1.104, .052);
  bag.rotation.y = -.15;
  return bag;
}

export function tree(paper, parent, x, z, size, index = 0) {
  const trunk = paper.group(parent, 'folded-maple', x, 0, z);
  trunk.scale.setScalar(size);
  paper.disk(trunk, '#7d4f47', .055, .12, 1.85, .06, .94, 0, 6).rotation.z = -.09;
  for (const dir of [-1, 1]) {
    paper.line(trunk, '#7d4f47', .032, [[.05, .81, 0], [dir * .23, 1.32, .08], [dir * .53, 1.74, .1]]);
  }
  for (let i = 0; i < 11; i++) {
    const angle = i * 2.39 + index;
    const factor = .38 + .5 * ((i * 7) % 11) / 11;
    const px = Math.cos(angle) * factor;
    const py = 2.04 + Math.sin(angle) * factor * .71;
    const pz = Math.sin(i * 1.79) * .32;
    const geometry = [[-.64, -.3], [-.38, -.49], [-.03, -.46], [.43, -.36], [.62, -.06],
      [.53, .26], [.23, .46], [-.07, .49], [-.32, .36], [-.59, .13]];
    const crown = paper.cut(trunk, foliage[(index + i) % foliage.length], geometry, .095, px, py, pz);
    crown.scale.setScalar(.61 + .07 * (i % 3));
    crown.rotation.y = Math.cos(angle) * .67;
    crown.rotation.z = Math.sin(angle) * .42;
  }
  return trunk;
}

export function leafScatter(paper, parent, count, width, depth) {
  for (let i = 0; i < count; i++) {
    const x = ((i * 43.27) % 100) / 100 * width - width / 2;
    const z = ((i * 19.71) % 100) / 100 * depth - 2;
    const leaf = paper.cut(parent, foliage[i % foliage.length], leafCut, .007, x, .014 + i % 4 * .002, z);
    leaf.rotation.set(-Math.PI / 2, 0, i * 2.1);
    leaf.scale.setScalar(.21 + i % 3 * .11);
  }
}

export function chair(paper, root, x, z, yaw, color = '#9a6350') {
  const seat = paper.group(root, 'side-chair', x, 0, z);
  seat.rotation.y = yaw;
  paper.box(seat, color, .52, .075, .49, 0, .456, 0);
  paper.sheet(seat, color, .52, .31, .07, .046, 0, .78, .223);
  for (const xx of [-.205, .205]) {
    for (const zz of [-.187, .187]) {
      paper.box(seat, '#754a43', .047, .45, .052, xx, .225, zz);
    }
    paper.box(seat, '#754a43', .036, .36, .042, xx, .62, .209);
  }
  return seat;
}

export function table(paper, root, x, z, width = 2.13, depth = 1.34, top = .77) {
  const object = paper.group(root, 'dining-table', x, 0, z);
  paper.box(object, '#6b453e', width, .11, depth, 0, top - .07, 0);
  paper.box(object, '#b17960', width + .03, .045, depth + .03, 0, top - .023, 0);
  for (let i = 1; i < 5; i++) {
    paper.box(object, '#97654f', width - .04, .005, .012, 0, top + .002, (i / 5 - .5) * depth);
  }
  for (const xx of [-.42 * width, .42 * width]) {
    for (const zz of [-.37 * depth, .37 * depth]) {
      paper.box(object, '#795047', .074, top - .1, .077, xx, (top - .1) / 2, zz);
    }
  }
  paper.shadow(root, width + .8, depth + .6, x, .013, z, .6);
  return object;
}

export function cup(paper, parent, color, x, y, z) {
  const mug = paper.group(parent, 'ceramic-cup', x, y, z);
  paper.disk(mug, color, .087, .06, .145, 0, .075, 0, 16);
  paper.disk(mug, '#785049', .069, .069, .004, 0, .149, 0, 16);
  paper.line(mug, color, .015, [[.067, .04, 0], [.117, .048, 0], [.122, .106, 0], [.074, .114, 0]]);
  return mug;
}

export function plate(paper, parent, x, y, z, color) {
  paper.disk(parent, '#e5cbb1', .198, .17, .044, x, y + .023, z, 16);
  paper.disk(parent, '#fff0ce', .178, .17, .024, x, y + .043, z, 16);
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.6;
    paper.ball(parent, i % 3 ? color : '#779269', .046, .026, .027,
      x + .107 * Math.cos(angle), y + .072 + i % 3 * .008, z + .095 * Math.sin(angle)).rotation.y = angle;
  }
}

export function lantern(paper, parent, x, y, z, scale = 1) {
  const light = paper.group(parent, 'folded-lantern', x, y, z);
  light.scale.setScalar(scale);
  paper.line(light, '#76493f', .012, [[0, .21, 0], [0, .35, 0], [0, .52, 0]]);
  paper.disk(light, '#945242', .144, .168, .05, 0, -.153, 0, 6);
  paper.disk(light, '#eaaa5f', .15, .14, .298, 0, .019, 0, 6, .38);
  paper.disk(light, '#945242', .15, .11, .057, 0, .176, 0, 6);
  return light;
}

export function windows(paper, parent, x, y, z, w, h, outside = '#e6ab77', trim = '#9f6958') {
  const window = paper.group(parent, 'paper-window', x, y, z);
  paper.box(window, outside, w, h, .12, 0, 0, 0, .21);
  for (const xx of [-w / 2, 0, w / 2]) paper.box(window, trim, .067, h + .1, .092, xx, 0, -.088);
  for (const yy of [-h / 2, h / 2]) paper.box(window, trim, w + .1, .067, .11, 0, yy, -.088);
  paper.box(window, '#e5ae80', w + .2, .065, .21, 0, -h / 2 - .04, -.097);
  return window;
}

export function walkPair(boy, girl, t, progress, distance = 2) {
  const z = mix(2.3, 2.3 - distance, ease(progress));
  boy.root.position.z = z - .07;
  girl.root.position.z = z + .04;
  boy.pose('walk_together', t);
  girl.pose('walk_together', t + .33);
}
