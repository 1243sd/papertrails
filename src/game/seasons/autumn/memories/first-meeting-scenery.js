import * as THREE from 'three';
import { autumnRandom, mapleGeometry } from '../leaves.js';
import { floor, mix } from './paper.js';
import { chair, cup, lantern, leafScatter, person, table, tree, walkPair } from './props.js';
import { hills } from './sets.js';
import { dinnerEffects, marketEffects } from './first-meeting-effects.js';

const redMaples = ['#8b273a', '#b62e40', '#cc4148', '#dd554c', '#e36748', '#a83440'];

export function sign(paper, parent, text, width, height, x, y, z, background = '#583e47', ink = '#ffdeb0') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * height / width);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(10, 8, canvas.width - 20, canvas.height - 16);
  ctx.fillStyle = ink;
  ctx.font = `bold ${Math.min(canvas.height * .59, 415 / text.length)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, canvas.height * .51);
  const texture = paper.own(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = paper.own(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  const board = paper.surface(parent, new THREE.PlaneGeometry(width, height), material, x, y, z);
  board.rotation.y = Math.PI;
  return board;
}

function roof(paper, parent, y, width, depth, height) {
  const positions = [], indices = [];
  const rings = [[1, 0], [.81, .12], [.48, .49], [.11, .88]];
  for (const [scale, rise] of rings) {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const square = Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
      positions.push(width * .5 * scale * Math.cos(angle) / square,
        y + height * (rise + (i % 2 ? .21 * scale : 0)),
        depth * .5 * scale * Math.sin(angle) / square);
    }
  }
  const peak = positions.length / 3;
  positions.push(0, y + height, 0);
  for (let ring = 0; ring < rings.length; ring++) {
    for (let i = 0; i < 8; i++) {
      const start = ring * 8 + i;
      const side = ring * 8 + (i + 1) % 8;
      if (ring === rings.length - 1) indices.push(start, peak, side);
      else indices.push(start, start + 8, side, side, start + 8, side + 8);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  paper.surface(parent, geometry, paper.material('#334e50'));
  for (let i = 0; i < 8; i++) {
    const eave = (i + 1) % 8;
    paper.line(parent, '#496661', .027, [i, i + 8, i + 16, i + 24, peak]
      .map((point) => positions.slice(point * 3, point * 3 + 3))
      .map(([x, yy, z]) => [x, yy + .014, z]));
    paper.line(parent, '#b87753', .025, [i, eave].map((point) => positions.slice(point * 3, point * 3 + 3)));
  }
}

function rail(paper, parent, x, y, z, width) {
  paper.box(parent, '#ded0aa', width, .06, .077, x, y + .25, z);
  paper.box(parent, '#c1ad8a', width, .043, .067, x, y + .085, z);
  for (let i = 0; i < 8; i++) {
    paper.box(parent, '#e4d3b1', .067, .32, .08, x + width * (i / 7 - .5), y + .16, z);
  }
}

function planter(paper, parent, x, y, z, scale, seed) {
  const pot = paper.group(parent, 'flower-planter', x, y, z);
  pot.scale.setScalar(scale);
  paper.disk(pot, '#b36951', .22, .161, .23, 0, .115, 0, 10);
  paper.disk(pot, '#df9671', .225, .20, .036, 0, .241, 0, 10);
  paper.disk(pot, '#594d40', .19, .17, .018, 0, .256, 0, 10);
  for (let i = 0; i < 6; i++) {
    const theta = i * 2.4 + seed;
    const px = Math.cos(theta) * (.11 + i % 2 * .06);
    const pz = Math.sin(theta) * .152;
    const py = .37 + (i * 5 % 7) * .027;
    const leaf = paper.ball(pot, i % 2 ? '#74975c' : '#55734d', .052, .16, .027, px * .74, py - .081, pz * .72);
    leaf.rotation.z = -px * 5;
    paper.ball(pot, ['#d5636d', '#f2ad60', '#f4d6ae'][i % 3], .062, .047, .055, px, py + .046, pz);
    paper.ball(pot, '#ffd681', .024, .017, .02, px, py + .061, pz - .044);
  }
}

function citySkyline(paper, root) {
  const skyline = paper.group(root, 'jiaxiu-city-skyline');
  paper.box(skyline, '#9c7b83', 32, 1.53, .35, 0, .63, 15.41);
  const buildings = [
    [-13.2, 17.8, 2.2, 4.7], [-11.1, 16.8, 1.37, 5.65], [-9.51, 18.1, 1.78, 4.8],
    [-7.9, 16.7, 1.4, 6.65], [-6.52, 18.2, 1.25, 5.6], [-5.31, 17.6, 1.08, 4.36],
    [-4.05, 18.7, 1.49, 5.5], [-2.62, 17.8, 1.16, 3.72], [-1.22, 18.9, 1.56, 4.43],
    [.32, 16.8, 1.45, 4.14], [1.7, 18.1, 1.4, 5.19], [3.26, 17.4, 1.12, 5.98],
    [4.72, 17.7, 1.88, 4.8], [6.2, 16.65, 1.31, 6.72], [7.77, 18.6, 1.86, 5.34],
    [9.38, 17.2, 1.3, 4.2], [10.7, 18.4, 1.72, 5.85], [12.6, 18.8, 2.1, 4.6],
  ];
  buildings.forEach(([x, z, width, height], i) => {
    const color = ['#a18393', '#aa8891', '#a38c9a', '#ae919f'][i % 4];
    paper.box(skyline, color, width, height, .72, x, height / 2, z);
    paper.box(skyline, '#b9a0a6', width * .86, .053, .72, x, height + .021, z - .02);
    if (i % 3 === 1) {
      paper.box(skyline, color, width * .62, .235, .5, x + .02, height + .134, z);
      paper.box(skyline, '#bba1aa', .03, .43, .024, x + .18, height + .422, z);
    }
    for (let floor = .92; floor < height - .21; floor += .37) {
      paper.box(skyline, '#c3a2a6', width * .78, .075, .012, x, floor, z - .367);
    }
    for (const offset of [-.24, .045, .27]) {
      paper.box(skyline, color, .038, height * .81, .019, x + offset * width, height * .54, z - .378);
    }
  });
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 2.18;
    const height = 1.43 + (i * 5 % 7) * .16;
    const color = ['#9f7b82', '#aa858b', '#a48188'][i % 3];
    paper.box(skyline, color, 2.14, height, .52, x, height * .5, 14 - i % 2 * .13);
    for (let row = 0; row < 3; row++) {
      paper.box(skyline, '#b99599', 1.48, .063, .012, x, height - .34 - row * .31, 13.731 - i % 2 * .13);
    }
  }
}

export function riversidePark(paper, root) {
  citySkyline(paper, root);
  paper.box(root, '#56827d', 18, .24, 13, 0, -.26, 5);
  paper.box(root, '#457d78', 16, .045, 10.4, 0, -.161, 5);
  paper.box(root, '#827f56', 19, .28, 3, 0, -.17, 11.25);
  const wall = paper.group(root, 'jiaxiu-riverside-wall', 0, 0, 10.73);
  paper.box(wall, '#b9abaa', 24, .31, .48, 0, .143, 0);
  paper.box(wall, '#e0cdb0', 24, .96, .34, 0, .745, .02);
  paper.box(wall, '#69636e', 24.12, .11, .58, 0, 1.265, .024);
  paper.box(wall, '#817581', 24.14, .067, .17, 0, 1.337, .025);
  for (let i = -8; i <= 8; i++) {
    const x = i * 1.48;
    paper.box(wall, '#c5b7a4', .16, 1.26, .49, x, .63, .015);
    paper.box(wall, '#746775', .31, .12, .61, x, 1.303, .024);
    paper.box(wall, '#a89aa1', .018, .132, .013, x + .72, .137, -.244);
  }
  const ripples = [];
  const random = autumnRandom(145);
  for (let i = 0; i < 45; i++) {
    const x = (random() - .5) * 13, z = .3 + random() * 9.6;
    const length = .16 + random() * .9;
    const ripple = paper.line(root, i % 3 ? '#75a19a' : '#aad0b2', .006,
      [[-length * .5, 0, 0], [0, .003, .029], [length * .5, 0, 0]], .13);
    ripples.push({ ripple, x, z });
  }
  const promenade = paper.group(root, 'riverside-promenade', 0, 0, -1.79);
  paper.box(promenade, '#b99a80', 14, .25, 4.4, 0, -.12, 0);
  paper.box(promenade, '#9c8070', 14.1, .105, .177, 0, -.02, 2.12);
  for (let i = -7; i <= 7; i++) {
    paper.box(promenade, '#a8907a', .017, .006, 3.97, i * .83, .008, .15);
  }
  for (let i = -2; i <= 2; i++) paper.box(promenade, '#a8907a', 13.9, .006, .016, 0, .009, i * .77);
  rail(paper, root, -3.77, .011, .35, 4.35);
  rail(paper, root, 4.51, .011, .35, 3.32);
  for (const side of [-1, 1]) {
    const start = side < 0 ? 1.58 : 2.98;
    for (let i = 0; i < 4; i++) planter(paper, root, side * (start + i * .66), .012, -.05 - i % 2 * .29, .62 + i % 2 * .3, i);
    tree(paper, root, side * 4, .05, 1.11, side > 0 ? 2 : 3, redMaples);
  }
  for (const [x, z] of [[2.38, 2.21], [-3.46, 1.72], [2.91, 3.4], [-2.61, 3.92], [-3.68, 5.17]]) {
    paper.ball(root, '#607e61', .31, .027, .21, x, -.115, z);
    paper.ball(root, '#e79c94', .081, .043, .074, x + .06, -.068, z);
  }

  const pavilion = paper.group(root, 'hanbi-water-pavilion', 2.15, 0, 2.67);
  paper.box(pavilion, '#a89a83', 2.29, .21, 1.88, 0, .043, 0);
  paper.box(pavilion, '#ddc6a1', 2.37, .09, 1.96, 0, .165, 0);
  paper.box(root, '#c1a98b', 1.25, .108, 1.43, 2.15, .084, 1.06);
  paper.box(root, '#cdb493', 1.31, .059, .30, 2.15, .028, .29);
  paper.box(root, '#d7bf9f', 1.23, .09, .21, 2.15, .155, 1.68);
  for (const x of [-.92, .92]) {
    for (const z of [-.71, .71]) {
      paper.box(pavilion, '#9a4944', .10, 1.66, .102, x, 1.027, z);
      paper.box(pavilion, '#dcc7a5', .17, .17, .18, x, .259, z);
      paper.box(pavilion, '#968773', .15, .31, .15, x, -.127, z);
    }
    lantern(paper, pavilion, x * .67, 1.48, -.74, .46);
  }
  rail(paper, pavilion, 0, .21, .77, 1.9);
  paper.box(pavilion, '#834840', 2.05, .13, 1.62, 0, 1.84, 0);
  roof(paper, pavilion, 1.88, 2.68, 2.36, .65);
  sign(paper, pavilion, '涵碧亭', .59, .20, 0, 1.725, -.813);
  planter(paper, pavilion, .82, .21, -.54, .63, 4);

  const tower = paper.group(root, 'jiaxiu-tower', -1.36, 0, 6.08);
  paper.ball(tower, '#9a9080', 1.94, .51, 1.46, 0, -.12, 0);
  paper.box(tower, '#c5b49a', 2.68, .24, 2.1, 0, .37, 0);
  rail(paper, tower, 0, .489, -1.025, 2.56);
  for (let level = 0; level < 3; level++) {
    const width = 2.05 - level * .43;
    const depth = 1.51 - level * .28;
    const base = .48 + level * 1.04;
    paper.box(tower, '#ad684f', width, .11, depth, 0, base + .02, 0);
    paper.box(tower, '#6b4346', width * .81, .76, depth * .83, 0, base + .44, 0);
    for (const x of [-width * .46, -width * .18, width * .18, width * .46]) {
      for (const z of [-depth * .45, depth * .45]) paper.box(tower, '#a64d48', .081, .87, .084, x, base + .46, z);
    }
    for (const side of [-1, 1]) {
      paper.box(tower, '#d29162', .43 - level * .055, .52, .023, side * width * .26, base + .44, -depth * .43, .17);
      for (let bar = -1; bar <= 1; bar++) {
        paper.box(tower, '#884d47', .025, .51, .036, side * width * .26 + bar * .078, base + .44, -depth * .45);
      }
      paper.box(tower, '#884d47', .43 - level * .055, .032, .034, side * width * .26, base + .52, -depth * .45);
    }
    paper.box(tower, '#854b42', width + .14, .11, depth + .18, 0, base + .88, 0);
    roof(paper, tower, base + .92, width + .68, depth + .55, level === 2 ? .87 : .49);
  }
  paper.ball(tower, '#ca9c59', .082, .117, .082, 0, 4.41, 0);
  sign(paper, tower, '甲秀楼', .82, .28, 0, 2.14, -.60);
  for (const [x, z, scale] of [[-5.6, 7.4, 1.4], [4.7, 8.1, 1.55], [-4.4, 9, 1.1], [3.4, 10, 1.33]]) {
    tree(paper, root, x, z, scale, Math.round(z), redMaples);
  }
  const bridgeX = -3.64, bridgeZ = 6.06;
  paper.box(root, '#c5b293', 2.63, .115, .86, bridgeX, .408, bridgeZ);
  rail(paper, root, bridgeX, .465, bridgeZ - .39, 2.65);
  rail(paper, root, bridgeX, .465, bridgeZ + .39, 2.65);
  for (const x of [-4.56, -3.49, -2.67]) {
    paper.box(root, '#9b8b79', .25, .62, .38, x, .092, bridgeZ);
  }
  return (t) => {
    ripples.forEach(({ ripple, x, z }, i) => {
      ripple.position.set(x + .084 * Math.sin(t * 2 + i), -.124, z + .029 * Math.sin(i + t));
      ripple.scale.x = .84 + .19 * Math.sin(t * 2.5 + i * .59);
    });
  };
}

function marketCart(paper, parent, x, z, yaw, flowers) {
  const cart = paper.group(parent, 'market-pushcart', x, 0, z);
  cart.rotation.y = yaw;
  paper.box(cart, '#97604a', .93, .39, .58, 0, .48, 0);
  paper.box(cart, '#cd9b6d', 1.03, .073, .69, 0, .716, 0);
  for (const sign of [-1, 1]) {
    paper.box(cart, '#895743', .043, .904, .041, sign * .41, 1.15, .227);
    paper.box(cart, '#895743', .043, .904, .041, sign * .41, 1.15, -.235);
    paper.box(cart, '#89614b', .66, .035, .041, sign * .72, .56, .22);
    for (const zz of [-.31, .31]) {
      const wheel = paper.disk(cart, '#60494a', .169, .169, .042, sign * .32, .171, zz, 14);
      wheel.rotation.x = Math.PI / 2;
      paper.disk(cart, '#b78a5d', .101, .101, .045, sign * .32, .171, zz, 12).rotation.x = Math.PI / 2;
      paper.box(cart, '#815649', .024, .18, .048, sign * .32, .171, zz).rotation.z = .64;
    }
  }
  for (let i = 0; i < 7; i++) {
    const cloth = paper.box(cart, i % 2 ? '#efc08b' : flowers ? '#b85d70' : '#819b79',
      .148, .035, .81, (i - 3) * .148, 1.58, -.01);
    cloth.rotation.x = -.19;
    paper.sheet(cart, i % 2 ? '#efc08b' : flowers ? '#b85d70' : '#819b79',
      .14, .111, .046, .023, (i - 3) * .148, 1.478, -.412);
  }
  sign(paper, cart, flowers ? '鲜花' : '糖炒栗子', .49, .168, 0, .49, -.309);
  if (flowers) {
    for (let i = -1; i <= 1; i++) planter(paper, cart, i * .28, .755, .025, .51, i * 3);
  } else {
    for (let basket = -1; basket <= 1; basket++) {
      paper.disk(cart, '#b38359', .144, .118, .085, basket * .285, .795, .017, 10);
      for (let i = 0; i < 8; i++) {
        const angle = i * 2.4;
        paper.ball(cart, i % 2 ? '#774b41' : '#9e6145', .034, .031, .032,
          basket * .285 + .082 * Math.cos(angle), .851 + i % 3 * .012, .017 + .079 * Math.sin(angle));
      }
    }
  }
}

function shopfront(paper, parent, x, z, index, text, clothes) {
  const shop = paper.group(parent, 'market-shopfront', x, 0, z);
  shop.rotation.y = Math.sign(x) * .64;
  const wall = ['#a16d66', '#ab7c64', '#8b6b70', '#a26c58'][index % 4];
  const trim = '#6d484d';
  const height = 2.82 + index % 3 * .37;
  paper.box(shop, wall, 1.92, height, 1.12, 0, height / 2, .57);
  paper.box(shop, trim, 2.02, .09, 1.21, 0, height + .01, .55);
  paper.box(shop, '#efba80', 1.66, 1.16, .04, 0, .714, -.019, .15);
  paper.box(shop, '#664750', .61, 1.25, .047, -.463, .65, -.047);
  paper.box(shop, '#b47f70', .49, .31, .039, -.463, .36, -.073);
  for (const edge of [-.873, -.117, .873]) paper.box(shop, trim, .052, 1.24, .096, edge, .633, -.068);
  paper.box(shop, '#8b5a55', .991, .052, .105, .362, .148, -.078);
  sign(paper, shop, text, 1.61, .30, 0, 1.659, -.093,
    clothes ? '#6f4965' : '#587367');
  for (let i = 0; i < 7; i++) {
    const stripe = paper.box(shop, i % 2 ? '#ead1a7' : clothes ? '#bd737c' : '#8b9d78',
      .26, .035, .426, (i - 3) * .26, 1.392, -.265);
    stripe.rotation.x = -.29;
    paper.sheet(shop, i % 2 ? '#ead1a7' : clothes ? '#bd737c' : '#8b9d78',
      .245, .11, .031, .023, (i - 3) * .26, 1.279, -.464);
  }
  for (const px of [-.53, .41]) {
    paper.box(shop, trim, .48, .68, .066, px, height - .64, -.043);
    paper.box(shop, '#e8b694', .375, .564, .031, px, height - .64, -.094, .12);
    paper.box(shop, trim, .021, .56, .04, px, height - .64, -.118);
    paper.box(shop, trim, .38, .028, .04, px, height - .6, -.12);
    paper.box(shop, '#be8b6d', .55, .067, .132, px, height - .98, -.115);
  }
  if (clothes) {
    paper.box(shop, '#74545a', .88, .032, .029, .37, 1.066, -.114);
    const dress = [[-.07, .15], [-.12, .12], [-.082, -.005], [-.14, -.245],
      [.14, -.245], [.077, -.005], [.112, .12], [.061, .15], [0, .096]];
    for (const [i, color] of ['#b76f87', '#798d8e', '#bd8665'].entries()) {
      paper.cut(shop, color, dress.map(([dx, dy]) => [dx * .77, dy]), .019, .09 + i * .254, .864, -.117);
      paper.box(shop, '#ead0ab', .084, .018, .019, .09 + i * .254, .876, -.134);
    }
  } else {
    for (const y of [.42, .66, .9]) {
      paper.box(shop, '#b08561', .90, .032, .118, .371, y - .083, -.066);
      for (let i = 0; i < 6; i++) {
        paper.box(shop, ['#ca7c70', '#729182', '#b5965b', '#74819b'][i % 4], .091, .12 + i % 2 * .041, .07,
          .034 + i * .134, y, -.10);
      }
    }
  }
  planter(paper, shop, -.79, 0, -.31, .76, index);
}

export function marketStreet(paper, root) {
  floor(paper, root, '#bd8b76', 18, 20);
  hills(paper, root, 0, 15);
  paper.box(root, '#98786e', 4.24, .032, 19, 0, .014, 3.5);
  for (let i = 0; i < 16; i++) {
    const z = i * .72 - 3.1;
    paper.box(root, '#8c7069', 4.19, .005, .012, 0, .032, z);
    for (let j = -2; j <= 2; j++) {
      paper.box(root, '#8c7069', .01, .005, .70, j * .81 + i % 2 * .19, .032, z + .354);
    }
    for (const side of [-1, 1]) {
      paper.box(root, i % 2 ? '#c5977e' : '#ca9e86', 1.54, .088, .71, side * 2.88, .041, z + .36);
      paper.box(root, '#ded0a0', .123, .103, .69, side * 2.16, .061, z + .36);
    }
  }
  const shops = ['街角小卖部', '秋日衣铺', '糕点铺', '布衣店', '杂货铺', '甜品店', '茶点铺', '裁衣坊'];
  shops.forEach((text, index) => {
    const side = index % 2 ? 1 : -1;
    shopfront(paper, root, side * (3.16 + index % 3 * .15), .80 + Math.floor(index / 2) * 2.42, index, text,
      [1, 3, 7].includes(index));
  });
  marketCart(paper, root, -1.94, 2.49, -.36, false);
  marketCart(paper, root, 1.87, 1.54, .34, true);
  marketCart(paper, root, 1.81, 5.55, .45, false);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 1.7;
    const height = 1.86 + i % 3 * .44;
    const z = 11.31 + i % 2 * .82;
    paper.box(root, ['#8b646a', '#9e736d', '#9c7770'][i % 3], 1.69, height, .93, x, height / 2, z);
    paper.box(root, '#825867', 1.79, .094, 1.02, x, height, z);
    for (const offset of [-.43, 0, .43]) {
      paper.box(root, '#cca78c', .196, .343, .021, x + offset, height - .36, z - .474, .13);
      paper.box(root, '#a78278', .024, .343, .025, x + offset, height - .36, z - .489);
    }
  }
  for (const [x, z, scale, index] of [[3.47, -.42, 1.53, 3], [-2.77, 1.61, 1.38, 1],
    [2.82, 4.2, 1.58, 2], [-2.82, 5.95, 1.33, 4], [2.6, 7.8, 1.28, 0]]) {
    tree(paper, root, x, z, scale, index, redMaples);
  }
  for (const z of [2.48, 5.21, 7.82]) {
    paper.line(root, '#665054', .010, [[-3.58, 3.22, z], [0, 2.66, z + .12], [3.58, 3.22, z]]);
    for (let i = -3; i <= 3; i++) lantern(paper, root, i * 1.02, 2.41 + .049 * i * i, z + .113, .56);
  }
  leafScatter(paper, root, 73, 6.2, 12);
  const random = autumnRandom(141);
  const maple = mapleGeometry();
  const leaves = Array.from({ length: 56 }, (_, i) => {
    const mesh = paper.surface(root, maple, paper.material(redMaples[i % redMaples.length]));
    mesh.name = 'street-wind-maple';
    mesh.scale.setScalar(.061 + random() * .095);
    return { mesh, phase: random(), speed: .21 + random() * .14, z: -1.2 + random() * 9.5, side: i % 2 ? 1 : -1 };
  });
  const pedestrians = ['#676878', '#9b704f', '#956174', '#758971', '#85779b', '#c18c72', '#637780', '#9a754f']
    .map((color, i) => {
      const x = (i % 2 ? 1 : -1) * (1.15 + .53 * (i % 3) / 2);
      const person = paper.group(root, 'market-pedestrian', x, 0, 3 + i * .61);
      paper.disk(person, color, .116, .15, .44, 0, .405, 0, 9);
      paper.ball(person, i % 2 ? '#e1ab86' : '#c68d6e', .103, .122, .096, 0, .744, -.016);
      paper.ball(person, i % 2 ? '#754f48' : '#514149', .112, .079, .102, 0, .807, .009);
      const feet = [-1, 1].map((side) => paper.box(person, '#594e58', .074, .21, .076, side * .07, .121, .014));
      return { person, feet, z: person.position.z };
    });
  const boy = person(paper, root, 'boy', .41, 2.17, -.08);
  const girl = person(paper, root, 'girl', -.41, 2.28, .08);
  const joined = new THREE.Vector3();
  const shadow = paper.shadow(root, 2.18, 1.24, 0, .035, 2.21, .48);
  const light = marketEffects(paper, root);
  return (t, p) => {
    light(t);
    walkPair(boy, girl, t, p, 2.22);
    joined.set(0, .966 + .03 * (1 - Math.cos(t * 17.6 + .27)),
      (boy.root.position.z + girl.root.position.z) * .5 - .102 + Math.sin(t * 8.8) * .032);
    root.localToWorld(joined);
    boy.reachHand('left', joined);
    girl.reachHand('right', joined);
    shadow.position.z = girl.root.position.z;
    leaves.forEach(({ mesh, phase, speed, z, side }, i) => {
      const fall = (phase + t * speed) % 1;
      const gust = Math.sin(t * 3 - z * .42 + i * .11);
      mesh.position.set(side * mix(3.02, -.92, fall) + gust * .29,
        .085 + (1 - fall) * 3.46 + gust * .08, z - fall * 2.15);
      mesh.rotation.set(i + t * 3.7, t * 2.1 + i * .31, i * 2.4 + fall * 8);
    });
    pedestrians.forEach(({ person, feet, z }, i) => {
      const direction = i % 3 ? 1 : -1;
      person.position.z = z + direction * t * (.33 + i % 2 * .18);
      person.position.y = .039 + .018 * Math.abs(Math.sin(t * 7 + i));
      person.rotation.y = direction === 1 ? Math.PI : .09;
      feet[0].rotation.x = Math.sin(t * 7 + i) * .47;
      feet[1].rotation.x = -feet[0].rotation.x;
    });
  };
}

export function dinnerDecor(paper, room, desk) {
  for (const side of [-1, 1]) {
    const wallX = side * 2.97;
    paper.box(room, '#81554e', 1.46, 1.27, .41, wallX, .64, 3.06);
    paper.box(room, '#bc8765', 1.54, .10, .5, wallX, 1.325, 3.02);
    for (const offset of [-.43, 0, .43]) {
      paper.sheet(room, '#a16855', .36, .65, .036, .032, wallX + offset, .53, 2.821);
      paper.ball(room, '#e3a96c', .021, .023, .017, wallX + offset + .086, .57, 2.79);
    }
    for (let i = 0; i < 3; i++) {
      const x = wallX + side * (.16 + .19 * i);
      if (side > 0) cup(paper, room, ['#90a292', '#e8bd8a', '#bd7775'][i], x, 1.38, 2.94);
      else {
        const color = ['#829779', '#907a6d', '#a4725c'][i];
        const height = .19 + i * .045;
        paper.disk(room, color, .064, .066, height, x, 1.38 + height * .5, 2.94, 9);
        paper.disk(room, color, .027, .065, .069, x, 1.38 + height + .032, 2.94, 9);
        paper.disk(room, '#ae8b64', .028, .03, .049, x, 1.38 + height + .086, 2.94, 9);
      }
    }
    planter(paper, room, wallX - side * .41, 1.379, 2.99, .94, side);
    const frameX = side * 2.87;
    paper.box(room, '#87594e', 1.31, 1.45, .1, frameX, 2.079, 3.26);
    paper.box(room, '#b98865', 1.42, .079, .15, frameX, 2.83, 3.26);
    paper.sheet(room, '#644751', 1.10, .86, .036, .066, frameX, 2.26, 3.148);
    paper.sheet(room, '#e7c49a', .96, .72, .022, .03, frameX, 2.26, 3.12);
    paper.ball(room, '#d68f68', .093, .093, .012, frameX + side * .23, 2.41, 3.098);
    paper.cut(room, '#838b79', [[-.43, -.22], [-.13, .18], [.02, .05], [.18, .195], [.43, -.22]], .018, frameX, 2.235, 3.082);
    paper.cut(room, '#aa8071', [[-.43, -.25], [-.21, -.09], [.01, -.169], [.18, -.044], [.43, -.25]], .012, frameX, 2.23, 3.063);
    const sideTable = table(paper, room, side * 2.47, .45, .92, .69, .71);
    chair(paper, room, side * 2.7, 1.03, side * .27, '#9a6253');
    cup(paper, sideTable, '#d49b80', side * .23, .71, -.12);
    planter(paper, sideTable, -side * .15, .712, .051, .45, 2);
    lantern(paper, room, side * 2.25, 2.69, 2.34, .91);
    paper.box(desk, '#e8b6a0', .33, .008, .37, side * .67, .779, -.15);
    for (const shift of [-.023, .02]) {
      paper.box(desk, '#744e49', .011, .018, .255, side * .43 + shift, .797, -.17).rotation.y = side * .12;
    }
  }
  paper.box(desk, '#a85561', .435, .009, 1.16, 0, .78, 0);
  paper.box(desk, '#e4b88b', .018, .01, 1.12, .192, .786, 0);
  paper.box(desk, '#e4b88b', .018, .01, 1.12, -.192, .786, 0);
  return dinnerEffects(paper, room, desk);
}
