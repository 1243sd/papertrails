import * as THREE from 'three';
import { autumnRandom } from '../leaves.js';
import { clamp, ease, mix } from './paper.js';
import { glow, lightTrail } from './memory-light.js';
import { cup, tree, windows } from './props.js';
import { sign } from './first-meeting-scenery.js';

export function planter(paper, root, x, y, z, size = 1, palette = ['#d38789', '#e7ae7d', '#ecd3a2']) {
  const pot = paper.group(root, 'home-flower-pot', x, y, z);
  pot.scale.setScalar(size);
  paper.disk(pot, '#aa655b', .20, .15, .23, 0, .115, 0, 10);
  paper.disk(pot, '#cf9372', .214, .196, .04, 0, .235, 0, 10);
  paper.disk(pot, '#775d54', .18, .172, .028, 0, .247, 0, 10);
  for (let i = 0; i < 7; i++) {
    const theta = i * 2.4;
    const lx = .16 * Math.cos(theta);
    const lz = .14 * Math.sin(theta);
    const h = .37 + .045 * (i % 4);
    const leaf = paper.ball(pot, ['#758963', '#88986c', '#9aa475'][i % 3],
      .052, .151, .035, lx, h - .087, lz);
    leaf.rotation.set(lz * 2.3, theta, -lx * 3.4);
    for (let petal = 0; petal < 4; petal++) {
      const angle = petal * Math.PI / 2;
      paper.ball(pot, palette[i % palette.length], .041, .027, .044,
        lx + Math.cos(angle) * .033, h + .021, lz + Math.sin(angle) * .033, .12);
    }
    paper.ball(pot, '#f7c77f', .023, .020, .024, lx, h + .047, lz, .24);
  }
  return pot;
}

export function butterflies(paper, root, name, count, sample) {
  const outline = [[.008, -.042], [.072, -.081], [.12, -.038], [.102, .009], [.161, .06], [.129, .109],
    [.077, .101], [.032, .069], [.005, .028]];
  const swarm = paper.group(root, name);
  const insects = Array.from({ length: count }, (_, i) => {
    const parent = paper.group(swarm, 'folded-paper-butterfly');
    const wings = [-1, 1].map((side) => {
      const wing = paper.group(parent);
      const color = ['#ffc790', '#f5a7ac', '#ffe4a8'][i % 3];
      paper.cut(wing, color, outline.map(([x, y]) => [side * x, y]), .006, 0, 0, 0);
      paper.ball(wing, '#f4d1a2', .019, .042, .008, side * .083, .025, -.008, .30).rotation.z = side * .66;
      return wing;
    });
    paper.ball(parent, '#b77d6b', .012, .052, .012, 0, 0, -.007);
    const halo = glow(paper, parent, '#ffd1b6', 0, 0, .016, .43, .36, .35);
    return { parent, wings, halo };
  });
  return (t, strength = 1) => {
    insects.forEach(({ parent, wings, halo }, i) => {
      const phase = (i / count + t * .34) % 1;
      const flap = .50 + .64 * Math.sin(t * 19 + i * 2.3);
      wings[0].rotation.y = flap;
      wings[1].rotation.y = -flap;
      parent.rotation.set(-.20 + Math.sin(t * 2.3 + i) * .36, Math.cos(t * 2.8 + i) * .65, Math.sin(i + phase * 5) * .52);
      sample(parent, phase, i, t);
      parent.scale.setScalar((.45 + i % 3 * .18) * Math.sin(Math.PI * phase) * strength);
      parent.visible = strength > .01;
      halo.material.uniforms.strength.value = (.38 + .14 * Math.sin(t * 4 + i)) * strength;
    });
  };
}

function residentialBlock(paper, root, x, z, width, height, yaw, color) {
  const block = paper.group(root, 'home-city-apartment', x, 0, z);
  block.rotation.y = yaw;
  paper.box(block, color, width, height, 1.27, 0, height / 2, .51);
  paper.box(block, '#9c817e', width + .10, .086, 1.38, 0, height, .48);
  for (let floor = 0; floor < Math.floor((height - 1.22) / .77); floor++) {
    const y = 1.85 + floor * .77;
    for (const side of [-1, 1]) {
      const x = width * .254 * side;
      windows(paper, block, x, y, -.166, width * .31, .45,
        ['#ba9c99', '#e7b683', '#9694a2'][(floor + Number(side > 0)) % 3], '#987b78');
      if ((floor + Number(side > 0)) % 2 === 0) {
        const w = width * .38;
        paper.box(block, '#b3968e', w, .063, .25, x, y - .28, -.27);
        paper.box(block, '#9a7c79', w, .027, .028, x, y - .055, -.397);
        for (let i = 0; i < 5; i++) paper.box(block, '#ad8e83', .019, .22, .027, x + (i - 2) * w * .19, y - .165, -.397);
      }
    }
  }
  return block;
}

function streetBicycle(paper, root, x, z) {
  const bike = paper.group(root, 'home-city-parked-bicycle', x, .023, z);
  bike.rotation.y = .32;
  for (const wheel of [-.252, .252]) {
    paper.surface(bike, new THREE.TorusGeometry(.193, .013, 7, 22), paper.material('#6e646c'), wheel, .204, 0);
    for (let i = 0; i < 5; i++) {
      paper.box(bike, '#b8a29d', .008, .36, .008, wheel, .204, .002).rotation.z = i * Math.PI * .2;
    }
  }
  const frame = [[-.252,.204,0], [.062,.238,0], [-.10,.51,0], [-.252,.204,0]];
  paper.line(bike, '#a26e79', .018, frame);
  paper.line(bike, '#aa7d83', .017, [[-.1,.51,0],[.177,.482,0],[.062,.238,0],[.252,.204,0],[.186,.49,0],[.218,.608,0]]);
  paper.box(bike, '#786573', .107, .022, .045, -.11, .529, 0);
  paper.box(bike, '#827279', .079, .018, .027, .225, .609, 0);
}

export function cityStreet(paper, root) {
  const home = residentialBlock(paper, root, -.34, 7.74, 3.49, 5.42, 0, '#b88f84');
  home.name = 'warm-city-apartment-entrance';
  for (const [x,z,width,height,yaw,color] of [
    [-3.85, 1.96, 3.30, 5.30, -.61, '#a38584'], [4.0, 2.41, 3.72, 5.78, .54, '#a89391'],
    [-3.64,5.73,3.0,6.12,-.42,'#af8c88'], [3.73,6.2,3.7,5.02,.38,'#a18487'],
    [-3.0,9.15,3.23,7.3,-.22,'#9c8089'], [3.05,9.3,2.93,6.55,.21,'#9c8390'],
  ]) residentialBlock(paper, root, x, z, width, height, yaw, color);
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 2.11;
    const h = 4.45 + (i * 3 % 7) * .52;
    const z = 12.5 + i % 2 * .83;
    paper.box(root, ['#8e7889','#9f8289','#8b7587'][i % 3], 1.99, h, .72, x, h / 2, z);
    for (let level = 0; level < Math.floor(h / .53); level++) {
      paper.box(root, '#b49697', 1.63, .061, .023, x, .28 + level * .53, z - .368);
    }
  }
  paper.box(root, '#817781', 8.3, .044, 16.1, .04, .018, 3.32);
  paper.box(root, '#b3a6a0', 2.76, .072, 15.6, 0, .033, 3.10);
  for (let i = 0; i < 22; i++) {
    const z = -3.62 + i * .61;
    paper.box(root, '#998b8a', 2.72, .007, .016, 0, .072, z);
    paper.box(root, '#a09494', .015, .006, .61, i % 2 ? -.4 : .46, .072, z + .30);
    for (const side of [-1, 1]) {
      paper.box(root, '#c9b5a5', .142, .077, .593, side * 1.47, .059, z + .29);
      if (i % 4 === 0) paper.box(root, '#b6a5a2', .046, .008, .33, side * 2.53, .043, z);
    }
  }
  for (const [x,z] of [[1.94,1.31],[-1.95,3.22],[1.86,5.49],[-1.93,6.83]]) {
    paper.box(root, '#ad958e', .75, .21, .63, x, .105, z);
    paper.box(root, '#b3988d', .82, .069, .68, x, .229, z);
    const treeRoot = tree(paper, root, x, z, .69, Math.round(z), ['#8d8f70','#b6976c','#a28675','#c39975','#ad8175','#af9b75']);
    treeRoot.position.y = .257;
  }
  streetBicycle(paper, root, -2.23, 1.17);
  streetBicycle(paper, root, 2.02, 5.97);
  for (const [x,z] of [[1.66,.3],[-1.70,2.05],[1.72,4.02],[-1.67,6.31]]) {
    paper.disk(root, '#746675', .025, .041, 1.73, x, .885, z, 8);
    paper.box(root, '#92808a', .191, .039, .135, x, 1.775, z);
    paper.box(root, '#f5d0a3', .11, .151, .105, x, 1.869, z, .40);
    paper.box(root, '#8c7681', .182, .047, .164, x, 1.957, z);
    glow(paper, root, '#ffd096', x, 1.861, z - .071, 1.08, 1.03, .56);
  }
  return home;
}

export function pathDetails(paper, root, home) {
  paper.box(home, '#a98579', 3.25, .15, .59, 0, .083, -.39);
  paper.box(home, '#836f7b', 1.96, .077, .58, .25, 1.68, -.39);
  paper.sheet(home, '#89757b', .97, 1.40, .062, .041, .24, .778, -.192);
  paper.sheet(home, '#f5bb82', .69, 1.19, .045, .018, .24, .793, -.223);
  paper.box(home, '#8c696d', .041, 1.22, .023, .24, .778, -.258);
  windows(paper, home, -.75, 1.105, -.181, .59, .613, '#efb67e', '#97746e');
  sign(paper, home, '单元入口', .75, .19, .24, 2.218, -.276, '#796075', '#f5dbbb');
  for (const x of [-1.21, 1.12]) planter(paper, home, x, .151, -.465, .69);
  const windowGlow = glow(paper, home, '#ffd08f', .24, .85, -.292, 1.45, 1.86, .68);
  glow(paper, home, '#ffe3a8', .27, .041, -.87, 1.73, 1.25, .51).rotation.x = -Math.PI / 2;
  const flock = butterflies(paper, root, 'home-path-butterflies', 15, (wing, phase, i, t) => {
    const side = i % 2 ? 1 : -1;
    wing.position.set(side * (2.1 - phase * 1.26) + .38 * Math.sin(phase * 6 + i),
      .43 + Math.sin(phase * Math.PI) * (1.16 + i % 4 * .19), .37 + phase * 6.5 + Math.sin(t * 2 + i) * .39);
  });
  return (t) => {
    flock(t);
    windowGlow.material.uniforms.strength.value = .69 + .09 * Math.sin(t * 2.4);
  };
}

export function porchDetails(paper, root, house, pivot) {
  const wreath = paper.group(pivot, 'dried-flower-wreath', -.72, 1.72, -.167);
  const r = .227;
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    const petal = paper.ball(wreath, ['#9e9771', '#cb8c79', '#e2b281'][i % 3],
      .058, .089, .028, Math.sin(a) * r, Math.cos(a) * r, Math.cos(i) * .017);
    petal.rotation.z = -.64 - a;
  }
  for (const [x, z, size] of [[-1.055, -.63, .74], [1.18, -.70, .84], [-1.39, -.3, .64]]) {
    planter(paper, house, x, .029, z, size);
  }
  for (let i = 0; i < 15; i++) paper.box(house, '#c19c81', .025, .012, .255, (i - 7) * .071, .16, -.53);
  paper.box(house, '#a67a5e', 1.31, .066, .28, 0, 1.24, 1.009);
  for (const x of [-.43, .32]) cup(paper, house, x < 0 ? '#eed0a1' : '#ce9e9b', x, 1.27, .893);
  const halo = glow(paper, house, '#ffd0a0', .03, 1.52, .82, 1.93, 2.62, 0);
  const threshold = glow(paper, house, '#ffd8a1', .014, .16, -.59, 2.88, 2.42, 0);
  threshold.rotation.x = -Math.PI / 2;
  glow(paper, house, '#ffc88a', 1.17, 1.91, -.48, .94, 1.06, .49);
  const flock = butterflies(paper, root, 'home-threshold-butterflies', 11, (wing, phase, i) => {
    wing.position.set((phase * .92 + .16) * Math.sin(i * 2.39 + phase * 4),
      .45 + phase * (1.4 + i % 3 * .19), 1.86 - phase * 2.13);
  });
  return (t, open) => {
    halo.material.uniforms.strength.value = .47 * open;
    threshold.material.uniforms.strength.value = .69 * open;
    flock(t - Math.min(t, .72), ease((open - .16) / .7));
  };
}

export function steam(paper, parent, name, centers, color, count = 4) {
  const shape = new THREE.Shape();
  shape.moveTo(-.021, 0);
  shape.bezierCurveTo(.17, .139, -.18, .306, .04, .54);
  shape.bezierCurveTo(-.084, .332, .14, .164, -.021, 0);
  const geometry = new THREE.ShapeGeometry(shape, 15);
  const streams = centers.flatMap(([x, y, z], center) => Array.from({ length: count }, (_, i) => {
    const material = paper.own(new THREE.MeshBasicMaterial({
      color, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    const ribbon = paper.surface(parent, geometry, material, x, y, z);
    ribbon.name = name;
    return { ribbon, material, x, y, z, offset: center * .108 + i / count };
  }));
  return (t, visible = true) => streams.forEach(({ ribbon, material, x, y, z, offset }, i) => {
    ribbon.visible = visible;
    if (!visible) return;
    const p = (t * .59 + offset) % 1;
    ribbon.position.set(x + .056 * Math.sin(i + p * 4), y + p * .26, z + .022 * Math.sin(i));
    ribbon.rotation.set(0, .45 * Math.cos(i * 1.4 + p), .11 * Math.sin(i + t * 2));
    ribbon.scale.setScalar(.49 + p * .65);
    material.opacity = .42 * Math.sin(p * Math.PI);
  });
}

export function kitchenDetails(paper, counter) {
  for (let row = 0; row < 4; row++) {
    for (let i = -5; i <= 5; i++) {
      paper.box(counter, ['#c8a18f', '#d0b39e', '#be9e90'][((i + 5) * 5 + row) % 3],
        .219, .176, .052, i * .228 + row % 2 * .043, 1.02 + row * .190, .74);
    }
  }
  paper.box(counter, '#bf9b7d', 1.86, .051, .054, 0, 1.64, .698);
  for (const [i, x] of [-.79, -.46, -.13, .27].entries()) {
    const tool = paper.group(counter, 'home-hanging-utensil', x, 1.48, .665);
    tool.rotation.z = .11 * Math.cos(i * 2.2);
    paper.box(tool, '#896459', .024, .236, .029, 0, .012, 0);
    paper.ball(tool, i % 2 ? '#bc9a86' : '#9c7161', .052, .072, .024, 0, -.131, -.009);
  }
  for (let i = 0; i < 3; i++) {
    const x = .57 + i * .155;
    paper.disk(counter, '#9d7264', .063, .054, .151 + i * .031, x, .963 + i * .015, .18, 8);
    paper.disk(counter, '#dfba9d', .064, .061, .027, x, 1.048 + i * .030, .18, 8);
  }
  paper.box(counter, '#835c53', .38, .16, .37, .82, .888, -.111);
  for (let i = 0; i < 5; i++) {
    const herb = paper.ball(counter, i % 2 ? '#84a46c' : '#a7b980', .052, .135, .032, .72 + i * .05, 1.035, -.127);
    herb.rotation.z = -.34 + i * .18;
  }
  const lamp = glow(paper, counter, '#ffd397', -.38, 1.82, .37, 1.95, .78, .58);
  const simmer = steam(paper, counter, 'home-simmering-pot-steam', [[-.57, 1.067, .01]], '#ffe5cb', 7);
  return (t) => {
    simmer(t);
    lamp.material.uniforms.strength.value = .54 + Math.sin(t * 2.6) * .064;
  };
}

export function diningDetails(paper, room, desk) {
  for (const [i, color] of ['#a06c67', '#c18176', '#d1a28b'].entries()) {
    const rug = paper.sheet(room, color, 3.55 - i * .16, 2.1 - i * .14, .18, .016, 0, .014 + i * .009, 1.06);
    rug.rotation.x = -Math.PI / 2;
  }
  paper.box(desk, '#b66f70', .426, .009, 1.19, 0, .779, 0);
  for (const x of [-.208, .208]) paper.box(desk, '#eac19f', .018, .012, 1.17, x, .789, 0);
  for (const side of [-1, 1]) {
    const x = side * .625;
    paper.box(desk, '#e9bb9e', .31, .007, .385, x, .778, -.16);
    for (let i = 0; i < 2; i++) paper.box(desk, '#855d51', .012, .016, .241, side * .392 + i * .029, .792, -.17).rotation.y = side * .057;
  }
  paper.disk(desk, '#b28a71', .064, .071, .081, .27, .82, .073, 12);
  const flame = paper.ball(desk, '#ffbc80', .022, .041, .019, .27, .894, .073, .6);
  const halo = glow(paper, desk, '#ffba73', .27, .894, .048, .54, .53, .57);
  const breath = steam(paper, desk, 'home-dinner-cup-steam', [[-.482, .92, .39], [.545, .92, .39]], '#ffe6cb', 3);
  return (t, showSteam) => {
    breath(t, showSteam);
    flame.rotation.z = .14 * Math.sin(t * 18);
    halo.material.uniforms.strength.value = .52 + .11 * Math.sin(t * 13);
  };
}

export function framedHouse(paper, root, x, y, z, scale = 1, landscape = false) {
  const frame = paper.group(root, 'home-handmade-picture', x, y, z);
  frame.scale.setScalar(scale);
  paper.sheet(frame, '#8b625d', .61, .47, .044, .062, 0, 0, 0);
  paper.sheet(frame, '#ead1a9', .53, .39, .033, .020, 0, 0, -.027);
  paper.ball(frame, '#e1a68c', .073, .071, .01, .132, .066, -.045);
  if (landscape) {
    paper.cut(frame, '#909579', [[-.251,-.16],[-.14,.04],[-.062,-.03],[.021,.073],[.24,-.16]], .013, 0, 0, -.055);
    paper.cut(frame, '#a87a77', [[-.246,-.16],[-.086,-.066],[.062,-.11],[.199,-.059],[.247,-.16]], .013, 0, 0, -.067);
  } else {
    paper.box(frame, '#bd8d7c', .222, .123, .013, -.048, -.06, -.05);
    paper.cut(frame, '#986770', [[-.146, 0], [.004, .107], [.144, 0]], .013, -.050, .005, -.054);
    paper.box(frame, '#f2cc87', .054, .059, .019, -.014, -.059, -.059, .41);
  }
  return frame;
}

export function shelfDetails(paper, shelf) {
  const picture = framedHouse(paper, shelf, .23, 1.97, .105, .75);
  picture.rotation.z = -.085;
  for (let i = 0; i < 5; i++) {
    const book = paper.box(shelf, ['#bd897e', '#9a9c7b', '#b9a488', '#a47173'][i % 4],
      .052, .18 + i % 2 * .065, .147, -.45 + i * .05, 1.66, .034);
    book.rotation.z = -.14 + i * .07;
  }
  paper.box(shelf, '#d4ac85', 1.3, .044, .33, 0, .84, -.077);
  const keepsake = paper.sheet(shelf, '#ca9984', .28, .17, .022, .039, -.43, .931, .079);
  keepsake.rotation.x = -.21;
  const thread = lightTrail(paper, shelf, [[-.51, 1.615, -.29], [-.37, 1.78, -.31], [-.18, 1.82, -.31],
    [.03, 1.726, -.31], [.25, 1.82, -.30], [.39, 1.97, -.30]], .007, '#ffce8d', .45, .44);
  return (t) => {
    thread.value = t + .67;
  };
}

export function sofaDetails(paper, root, couch) {
  const quilt = paper.group(couch, 'home-folded-sofa-quilt', .74, .53, -.32);
  paper.box(quilt, '#d5a287', .31, .05, .46, 0, 0, .09);
  paper.sheet(quilt, '#ce947b', .32, .29, .029, .022, 0, -.125, -.17);
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * .051;
    paper.box(quilt, i % 2 ? '#e2b995' : '#bc826d', .012, .268, .011, x, -.125, -.184);
    paper.box(quilt, '#e7bd9a', .013, .077, .016, x, -.272, -.18);
  }
  const pillow = paper.sheet(couch, '#d8ae87', .42, .33, .09, .072, -.73, .62, .102);
  pillow.rotation.z = .28;
  for (const side of [-1, 1]) {
    paper.line(couch, '#cb9582', .005, [[side * .948, .613, -.40], [side * .948, .63, -.09], [side * .94, .64, .33]]);
  }
  const lampX = -4.63;
  paper.disk(root, '#90685e', .16, .21, .072, lampX, .052, 2.78, 12);
  paper.disk(root, '#9d7466', .032, .038, 1.40, lampX, .747, 2.78, 10);
  paper.disk(root, '#e8c89d', .14, .257, .345, lampX, 1.56, 2.78, 12, .28);
  paper.disk(root, '#c39278', .257, .26, .028, lampX, 1.39, 2.78, 12);
  const pool = glow(paper, root, '#ffcb91', lampX, 1.57, 2.66, 1.36, 1.60, .55);
  const sideTable = paper.group(root, 'home-couch-side-table', -1.86, 0, 2.08);
  paper.disk(sideTable, '#916659', .233, .25, .075, 0, .573, 0, 12);
  for (const a of [0, 2.1, 4.2]) {
    const leg = paper.box(sideTable, '#825c56', .043, .521, .044,
      Math.cos(a) * .155, .274, Math.sin(a) * .155);
    leg.rotation.z = Math.cos(a) * .13;
  }
  paper.box(sideTable, '#9a9c7c', .248, .036, .187, -.041, .629, -.066).rotation.y = .29;
  paper.box(sideTable, '#d7bb98', .232, .019, .173, -.041, .631, -.068).rotation.y = .29;
  cup(paper, sideTable, '#d7a498', .075, .611, .08);
  const cupSteam = steam(paper, sideTable, 'home-sofa-tea-steam', [[.075, .748, .08]], '#ffdfc5', 3);
  planter(paper, root, -4.83, .011, 3.10, .68);
  framedHouse(paper, root, -4.63, 2.48, 3.97, .77);
  return (t, dusk) => {
    cupSteam(t);
    pool.material.uniforms.strength.value = .38 + dusk * .57 + .06 * Math.sin(t * 2.0);
  };
}

export function windowDetails(paper, root, window) {
  const phase = { value: 0 };
  const tick = { value: 0 };
  const view = paper.own(new THREE.ShaderMaterial({
    uniforms: { phase, tick },
    vertexShader: `
      varying vec2 coord;
      void main() {
        coord = vec2(1. - uv.x, uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float phase, tick;
      varying vec2 coord;
      float hash(float i) { return fract(sin(i * 127.1) * 43758.5453); }
      void main() {
        vec2 uv = coord;
        float twilight = smoothstep(.46, 1., phase);
        float sunlight = 1. - smoothstep(.54,.76,phase);
        vec3 high = mix(vec3(.51,.64,.78), vec3(.12,.14,.32), twilight);
        vec3 low = mix(vec3(.99,.77,.57), vec3(.74,.41,.52), twilight);
        vec3 sky = mix(low, high, smoothstep(.19, .94, uv.y));
        vec2 sun = (uv - vec2(mix(.23,.71,phase), .31 + .49 * sin(phase * 3.1416))) * vec2(1.37,1.);
        float disc = length(sun);
        sky += (1. - smoothstep(.064,.36,disc)) * vec3(.22,.13,.026) * sunlight;
        sky = mix(sky, vec3(1.,.89,.62), (1. - smoothstep(.068,.079,disc)) * sunlight);
        vec2 moon = (uv - vec2(.72,.79)) * vec2(1.37,1.);
        sky = mix(sky, vec3(.93,.84,.76), (1. - smoothstep(.043,.054,length(moon))) * twilight);
        float cloud = sin(uv.x * 13. - tick * .52) + .34 * cos(uv.x * 37. - tick * .34);
        vec3 haze = vec3(1.,.86,.73);
        sky = mix(sky, haze, .27 * (1. - smoothstep(.012,.052,abs(uv.y - .66 - .022 * cloud))));
        sky = mix(sky, haze, .19 * (1. - smoothstep(.0,.041,abs(uv.y - .53 + .027 * cloud))));
        vec2 grid = uv * vec2(23.,16.);
        vec2 cell = floor(grid);
        float seed = cell.x + cell.y * 23.;
        vec2 star = fract(grid) - vec2(.19 + .61 * hash(seed),.21 + .58 * hash(seed + 19.));
        sky += vec3(1.,.89,.84) * step(.83,hash(seed + 8.)) * twilight * (1. - smoothstep(.029,.11,length(star))) * step(.52, uv.y);
        float farHill = .34 + .061 * sin(uv.x * 9.5) + .027 * cos(uv.x * 18. + 1.);
        float hill = .19 + .047 * sin(uv.x * 13. + .6) + .025 * cos(uv.x * 24.2);
        sky = mix(sky, mix(vec3(.58,.46,.52), vec3(.23,.20,.384), twilight), 1. - smoothstep(farHill,farHill + .01,uv.y));
        sky = mix(sky, mix(vec3(.51,.48,.54), vec3(.16,.17,.285), twilight), 1. - smoothstep(hill,hill + .01,uv.y));
        gl_FragColor = vec4(sky,1.);
      }
    `,
    side: THREE.DoubleSide,
  }));
  paper.surface(window, new THREE.PlaneGeometry(1.92, 1.40), view, 0, 0, -.073).name = 'home-window-day-to-dusk';
  paper.box(root, '#9a7063', 2.37, .042, .045, -3.11, 3.00, 3.873);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      paper.sheet(root, i % 2 ? '#d9a88c' : '#ecc0a1', .11, 1.36 - i * .028, .044, .034,
        -3.11 + side * (.77 + i * .076), 2.286, 3.827 + .023 * Math.cos(i * 1.67));
    }
    paper.box(root, '#d49a80', .363, .060, .052, -3.11 + side * .923, 2.047, 3.783);
  }
  const air = butterflies(paper, root, 'home-window-paper-motes', 8, (wing, p, i) => {
    wing.position.set(-3.82 + p * 1.29 + Math.sin(i * 2.4) * .25,
      .79 + p * 1.84 + Math.sin(i * 2.3) * .22, 2.99 + Math.cos(i * 1.9) * .70);
  });
  return (t, progress, daylight) => {
    phase.value = clamp(progress);
    tick.value = t;
    air(t, daylight ? .58 + .35 * progress : .30);
  };
}
