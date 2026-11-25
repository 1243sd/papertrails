import * as THREE from 'three';
import { clamp, ease, floor, mix } from './paper.js';
import { chair, cup, lantern, leafScatter, person, plate, table, tree, walkPair, windows } from './props.js';

export function hills(paper, root, x = 0, z = 11, cold = false) {
  const layer = paper.group(root, 'layered-cut-landscape', x, 0, z);
  const colors = cold ? ['#a4a6aa', '#8d9b9d', '#788985'] : ['#d6ab8d', '#c58770', '#a66a59'];
  colors.forEach((color, level) => {
    const points = [[-24, -.3]];
    for (let i = 0; i < 32; i++) {
      const px = -24 + i * 1.55;
      const py = 2.04 + level * -.35 + Math.sin(i * .53 + level * 2) * .54;
      points.push([px, py]);
    }
    points.push([24, -.3]);
    paper.cut(layer, color, points, .09, 0, 0, -level * 1.55);
  });
  return layer;
}

export function movingLandscape(paper, root, cold = false) {
  const outside = paper.group(root, 'moving-window-landscape', 0, 0, 5);
  paper.box(outside, cold ? '#c5b4aa' : '#f0bc87', 25, 8, .15, 0, 3.5, 12, .14);
  const distant = hills(paper, outside, 0, 7, cold);
  const foreground = paper.group(outside, 'near-window-trees', 0, 0, 3.5);
  for (let i = -6; i <= 10; i++) tree(paper, foreground, i * 1.3, Math.cos(i) * .65, .73 + .23 * Math.sin(i), i + 7);
  paper.box(foreground, cold ? '#b4a49d' : '#ce986d', 32, .06, 4, 1, -.02, 0);
  return (t) => {
    foreground.position.x = 3.9 - t * 2.63;
    distant.position.x = 1.1 - t * .48;
  };
}

export function cafe(paper, root, hotpot, options = {}) {
  const { center = 0, z = 1, booth = false, showPair = () => true } = options;
  const room = paper.group(root, 'dinner-room', center, 0, z - 1);
  if (!booth) floor(paper, room, hotpot ? '#a06556' : '#b98665', 12, 12);
  if (!booth) {
    paper.box(room, '#a76e5a', 12, 4.4, .16, 0, 2.2, 5.8);
    paper.box(room, '#b67c64', 12, .77, .17, 0, .4, 5.67);
    windows(paper, room, 0, 2.45, 5.54, 4.5, 2, '#643f57', '#83514f');
    for (const x of [-3.8, 3.8]) windows(paper, room, x, 2.45, 5.54, 1.62, 1.8, '#9e6871', '#83514f');
    for (const x of [-2.6, 0, 2.6]) lantern(paper, room, x, 3.22, 1.98, 1.1);
    for (let i = 0; i < 8; i++) {
      paper.ball(room, '#ed9d5a', .029, .035, .019, (i % 4 - 1.5) * 1.04, 2.46 + (i > 3 ? .38 : 0), 5.449, .45);
    }
  }
  const desk = table(paper, room, 0, 1, 1.92, 1.23);
  chair(paper, room, 1.22, 1.21, 1.23);
  chair(paper, room, -1.22, 1.21, -1.23);
  const people = [person(paper, room, 'boy', 1.2, 1.18, 1.2), person(paper, room, 'girl', -1.2, 1.18, -1.19)];
  cup(paper, desk, '#e7c18c', .545, .77, .39);
  cup(paper, desk, '#d48983', -.482, .77, .39);
  plate(paper, desk, .67, .77, -.17, hotpot ? '#b5666e' : '#bb774c');
  plate(paper, desk, -.67, .77, -.19, hotpot ? '#c9a270' : '#a26b4d');
  const stem = lantern(paper, room, 0, 2.74, .89, .72);
  const steam = [];
  if (hotpot) {
    paper.disk(desk, '#5a3f40', .367, .31, .073, 0, .815, 0, 20);
    paper.disk(desk, '#ac6049', .358, .272, .145, 0, .919, 0, 22);
    paper.disk(desk, '#d78350', .324, .323, .024, 0, .995, 0, 22);
    paper.disk(desk, '#9b515e', .202, .2, .013, 0, 1.01, 0, 20);
    for (const sign of [-1, 1]) {
      paper.line(desk, '#653f40', .026, [[sign * .316, .92, 0], [sign * .449, .937, -.06],
        [sign * .451, .941, .055], [sign * .317, .925, .11]]);
    }
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.4;
      paper.ball(desk, ['#e7c58b', '#df9978', '#758558'][i % 3], .043, .021, .044,
        Math.sin(angle) * .206, 1.027, Math.cos(angle) * .229);
    }
    for (let i = 0; i < 7; i++) {
      const vapor = paper.group(desk, 'paper-steam-ribbon');
      const material = paper.own(new THREE.MeshBasicMaterial({
        color: '#fff2dd', side: THREE.DoubleSide, transparent: true, depthWrite: false,
      }));
      const shape = new THREE.Shape();
      shape.moveTo(-.013, 0); shape.bezierCurveTo(.3, .21, -.34, .31, .02, .54);
      shape.bezierCurveTo(-.23, .32, .35, .18, -.013, 0);
      paper.surface(vapor, new THREE.ShapeGeometry(shape, 14), material);
      steam.push({ vapor, material });
    }
  } else {
    const vase = paper.disk(desk, '#b36a65', .082, .057, .21, 0, .879, -.035, 10);
    vase.rotation.z = -.12;
    for (let i = 0; i < 3; i++) {
      const px = (i - 1) * .07;
      paper.line(desk, '#697758', .008, [[0, .96, -.035], [px / 2, 1.07, -.04], [px, 1.2 + i % 2 * .025, -.04]]);
      paper.ball(desk, '#c9656e', .038, .039, .033, px, 1.216 + i % 2 * .025, -.04);
    }
  }
  return (t, p) => {
    people.forEach((actor, index) => {
      actor.root.visible = showPair(t);
      actor.pose('sit', .72 + t + index * .55);
      actor.root.rotation.y = (index ? -1.19 : 1.2) + .05 * Math.sin(t * 1.43 + index);
    });
    stem.rotation.z = Math.sin(t * .9) * .053;
    steam.forEach(({ vapor, material }, i) => {
      const phase = (t * .54 + i / steam.length) % 1;
      vapor.position.set((i - 3) * .065 + Math.sin(phase * 3 + i) * .085,
        1.005 + phase * .75, Math.cos(i * 2.51) * .12);
      vapor.rotation.y = Math.sin(phase * 2 + i) * .9;
      vapor.scale.setScalar(.63 + phase * .69);
      material.opacity = Math.sin(phase * Math.PI) * (.26 + .22 * ease((p - .77) * 5));
    });
  };
}

function storefront(paper, root, x, z, index) {
  const shop = paper.group(root, 'shopfront', x, 0, z);
  const colors = ['#90595c', '#99685e', '#a6705a', '#7e565b'];
  const width = 1.65 + .26 * (index % 2);
  const height = 2.2 + ((index * 5) % 3) * .32;
  paper.box(shop, colors[index % colors.length], width, height, 1.28, 0, height / 2, .55);
  paper.box(shop, '#744a50', width + .09, .12, 1.38, 0, height + .03, .51);
  paper.box(shop, '#e2a66c', width * .78, .68, .09, 0, 1.15, -.13, .24);
  for (const xx of [-.32, .04, .35]) paper.box(shop, '#8a5661', .043, .71, .135, xx, 1.15, -.17);
  paper.box(shop, '#69505d', .43, .64, .07, 0, height - .54, -.15);
  paper.box(shop, '#dbad83', .37, .12, .1, 0, height - .79, -.17, .11);
  const awning = paper.box(shop, '#b97963', width + .12, .082, .48, 0, 1.6, -.34);
  awning.rotation.x = -.21;
  for (let i = 0; i < 7; i++) {
    paper.sheet(shop, i % 2 ? '#d89b75' : '#af695b', .15, .135, .03, .025, (i - 3) * .164, 1.53, -.57);
  }
  return shop;
}

export function street(paper, root, cold = false) {
  floor(paper, root, cold ? '#8c686c' : '#ab7566');
  hills(paper, root, 0, 11, cold);
  paper.box(root, cold ? '#7d646c' : '#8f655d', 4.8, .026, 16, 0, .014, 2);
  for (let i = 0; i < 13; i++) {
    const z = i * .89 - 3.9;
    for (const sign of [-1, 1]) {
      paper.box(root, '#c18b71', .47, .063, .84, sign * 2.55, .033, z);
      if (i % 3 === 0) {
        const shop = storefront(paper, root, sign * 3.7, z + .17, i % 4);
        shop.rotation.y = sign * -.28;
      }
      if (i % 4 === 2) tree(paper, root, sign * 3.08, z, .82, i);
    }
  }
  for (const z of [-.24, 3.13, 6.3]) {
    paper.line(root, '#56414f', .012, [[-3.4, 2.7, z], [0, 1.97, z + .16], [3.4, 2.7, z]]);
    for (let i = 0; i < 7; i++) lantern(paper, root, (i - 3) * .83, 1.8 + .09 * (i - 3) ** 2, z, .55);
  }
  leafScatter(paper, root, 41, 6.2, 11);
  const boy = person(paper, root, 'boy', .42, 2.12, -.08);
  const girl = person(paper, root, 'girl', -.42, 2.2, .08);
  paper.shadow(root, 2.4, 1.1, .02, .04, 1.65, .56);
  return (t, p) => walkPair(boy, girl, t, p, 2.14);
}

export function foregroundWipe(paper, root, name, color, direction, trim) {
  const shutter = paper.group(root, name);
  paper.box(shutter, color, 5, 5, .13, 0, 0, .02);
  trim(shutter);
  return (t, span, camera, atEnd = true) => {
    const phase = atEnd ? clamp((t - span + .35) / .35) : 1 - clamp(t / .34);
    shutter.visible = phase > 0;
    shutter.position.copy(camera.position);
    shutter.quaternion.copy(camera.quaternion);
    shutter.translateZ(-1.32);
    shutter.translateX(direction * mix(3.43, 0, ease(phase)));
  };
}
