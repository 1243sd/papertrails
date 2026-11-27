import * as THREE from 'three';
import { autumnRandom } from '../leaves.js';
import { ease, floor, mix } from './paper.js';
import { person, walkPair } from './props.js';
import { glow } from './memory-light.js';
import { sign } from './first-meeting-scenery.js';

function jiefangbei(paper, root) {
  const monument = paper.group(root, 'chongqing-jiefangbei-monument', 0, 0, 7.6);
  function ring(color, top, bottom, height, y) {
    paper.disk(monument, color, top, bottom, height, 0, y, 0, 8).rotation.y = Math.PI / 8;
  }
  ring('#aca6b1', 1.35, 1.43, .17, .085);
  ring('#c6b6b0', 1.16, 1.21, .13, .235);
  ring('#b0a3a5', .91, 1.06, .43, .5);
  ring('#ece0cd', .66, .82, 3.18, 2.215);
  ring('#c2b0aa', .75, .78, .11, .70);
  ring('#c7b6ac', .685, .69, .063, 3.38);
  ring('#d9c4b5', .727, .682, .13, 3.77);
  ring('#e5d4be', .594, .697, .71, 4.147);
  ring('#c9b5ac', .709, .675, .11, 4.512);
  ring('#927d87', .674, .744, .105, 4.62);
  ring('#ac9ba4', .39, .666, .22, 4.754);
  ring('#c4b2b1', .11, .394, .242, 4.985);
  ring('#d4b2a6', .022, .10, .16, 5.17);
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#675149';
  ctx.font = 'bold 53px Microsoft YaHei, sans-serif';
  [...'重庆人民解放纪念碑'].forEach((character, i) => ctx.fillText(character, 45, 40 + i * 62));
  const texture = paper.own(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const ink = paper.own(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  const inscription = new THREE.PlaneGeometry(.35, 2.14).rotateY(Math.PI);
  const letters = inscription.attributes.position;
  for (let i = 0; i < letters.count; i++) letters.setZ(i, letters.getY(i) * .047);
  paper.surface(monument, inscription, ink, 0, 2.27, -.695);
  for (let side = 0; side < 4; side++) {
    const face = paper.group(monument, 'jiefangbei-clock-face');
    face.rotation.y = side * Math.PI / 2;
    paper.box(face, '#9b8a8c', .43, .49, .073, 0, 4.151, -.596);
    paper.disk(face, '#4e4a5b', .193, .192, .057, 0, 4.168, -.642, 32).rotation.x = Math.PI / 2;
    paper.disk(face, '#fff0bf', .162, .162, .023, 0, 4.168, -.681, 32, .31).rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const rad = i * Math.PI / 6;
      paper.box(face, '#695863', .009, .028, .01, Math.sin(rad) * .135, 4.168 + Math.cos(rad) * .135, -.700).rotation.z = -rad;
    }
    paper.box(face, '#534653', .013, .096, .015, .011, 4.22, -.703).rotation.z = -.19;
    paper.box(face, '#534653', .014, .073, .016, -.035, 4.175, -.705).rotation.z = 1.37;
    paper.ball(face, '#534653', .017, .017, .011, 0, 4.168, -.708);
    paper.box(face, '#9d8e91', .149, .31, .035, 0, 3.47, -.662);
    glow(paper, face, '#ffe7ad', 0, 4.168, -.719, .70, .76, .28);
  }
}

function shoppingBlock(paper, root, x, z, index) {
  const block = paper.group(root, 'jiefangbei-shopping-block', x, 0, z);
  block.rotation.y = Math.sign(x) * .49;
  const height = 4.8 + (index * 3 % 7) * .65;
  const width = 2.20 + index % 3 * .37;
  const frame = ['#494e6c', '#696181', '#5a637a', '#716478'][index % 4];
  paper.box(block, frame, width, height, 1.29, 0, height / 2, .6);
  paper.box(block, '#958197', width + .06, .12, 1.36, 0, height, .6);
  const unit = (width - .18) / 5;
  for (let story = 0; story < Math.floor((height - 1.9) / .54); story++) {
    const y = 2.24 + story * .54;
    for (let col = 0; col < 5; col++) {
      const color = ['#859bc0', '#515e83', '#c18ba5', '#a78aa5', '#dac099'][((col * 31 + story * 7 + index * 3) % 11) % 5];
      paper.box(block, color, unit * .78, .32, .052, (col - 2) * unit, y, -.081, col % 2 ? .19 : .07);
    }
  }
  const panel = ['#356588', '#914b6b', '#6c4b80', '#326a7e'][index % 4];
  paper.box(block, panel, width + .046, .108, .49, 0, 1.63, -.24, .45);
  paper.box(block, '#f6c692', width - .19, .96, .057, 0, .663, -.085, .32);
  for (const y of [.41, .67, .92]) {
    paper.box(block, '#ae8290', width - .21, .033, .08, 0, y, -.124);
    for (let packet = 0; packet < 7; packet++) {
      const pack = ['#b17d8b', '#6993a0', '#cd9e80', '#a68cac'][(packet + index) % 4];
      paper.box(block, pack, .085 + packet % 3 * .017, .08 + packet % 2 * .024, .057,
        (packet - 3) * width * .12, y + .06, -.139);
    }
  }
  paper.box(block, '#8c7389', .27, .99, .069, 0, .665, -.174);
  paper.box(block, '#bba2ad', .026, .114, .022, .061, .61, -.22);
  for (let i = -1; i <= 1; i++) {
    paper.box(block, frame, .055, .98, .062, i * width / 3, .662, -.123);
  }
  const signs = ['解放碑步行街', '山城百货', '渝中小吃', '城市书店', '山城咖啡', '重庆好礼', '钟楼广场', '重庆·渝中'];
  sign(paper, block, signs[index], width - .16, .30, 0, 1.91, -.146, panel, index % 2 ? '#ffd0a4' : '#c6effa');
  const bloom = glow(paper, block, index % 2 ? '#ff9c8f' : '#87c5ea', 0, 1.83, -.205, width + .8, 1.28, .45);
  return bloom;
}

function plaza(paper, root) {
  floor(paper, root, '#62576f', 21, 24);
  paper.box(root, '#73677c', 16, .054, 17, 0, .025, 3.65);
  for (let row = 0; row < 21; row++) {
    const z = row * .72 - 3.4;
    paper.box(root, '#544d67', 15.2, .005, .019, 0, .054, z);
    for (let j = -7; j <= 7; j++) paper.box(root, '#645d73', .016, .005, .71, j * .96 + row % 2 * .43, .054, z + .352);
  }
  const reflections = [], signs = [];
  for (let i = 0; i < 5; i++) {
    for (const side of [-1, 1]) {
      const setback = side < 0 && i === 0 ? 1.12 : 0;
      signs.push(shoppingBlock(paper, root, side * (3.43 + i * .31 + setback), .82 + i * 2.83, (i * 2 + Number(side < 0)) % 8));
    }
  }
  for (const x of [-2.36, -1.49, 1.5, 2.48]) {
    const mat = glow(paper, root, x > 0 ? '#86d4ff' : '#ff9caf', x, .059, 2.4, 1.69, 7, .54);
    mat.rotation.x = -Math.PI / 2;
    reflections.push(mat);
  }
  const facadeLights = [['#78d3ee', '#365f93'], ['#ed98bd', '#95619e'], ['#d9b6f6', '#6752a6']];
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 2.28;
    const height = 4.35 + (i * 5 % 9) * .56;
    const z = 14 + i % 2 * 1.4;
    paper.box(root, '#494761', 2.18, height, .92, x, height / 2, z);
    for (let row = 0; row < Math.floor((height - .6) / .58); row++) {
      const colors = facadeLights[(i + row) % 3];
      paper.box(root, colors[row % 2], 1.81, .061, .027, x, .5 + row * .58, z - .473, .21);
    }
  }
  jiefangbei(paper, root);
  const visitors = [];
  const random = autumnRandom(982);
  for (let i = 0; i < 15; i++) {
    const direction = i % 2 ? 1 : -1;
    const x = direction * (1.38 + random() * 1.16), z = 2.78 + random() * 8.7;
    const actor = paper.group(root, 'plaza-visitor', x, .057, z);
    const coat = ['#463e57', '#644f68', '#805671', '#5d687f', '#907983'][i % 5];
    paper.disk(actor, coat, .114, .147, .43, 0, .42, 0, 9);
    paper.ball(actor, '#bb8f85', .093, .109, .086, 0, .744, -.022);
    paper.ball(actor, '#483d52', .099, .066, .094, 0, .801, -.001);
    const feet = [-1,1].map((sign) => paper.box(actor, '#4c4059', .077, .21, .069, sign * .066, .114, 0));
    visitors.push({ actor, z, feet, direction });
  }
  return (t) => {
    signs.forEach((light, i) => { light.material.uniforms.strength.value = .41 + .14 * Math.sin(t * 2.7 + i); });
    reflections.forEach((light, i) => { light.material.uniforms.strength.value = .46 + .20 * Math.sin(t * 2.3 + i); });
    visitors.forEach(({ actor, z, feet, direction }, i) => {
      actor.position.z = z + direction * t * .23;
      actor.position.y = .056 + .02 * Math.abs(Math.sin(t * 6.2 + i));
      actor.rotation.y = direction === 1 ? Math.PI : 0;
      feet[0].rotation.x = Math.sin(t * 6.2 + i) * .46;
      feet[1].rotation.x = -feet[0].rotation.x;
    });
  };
}

export function jiefangbeiWalk(paper, root) {
  const bustle = plaza(paper, root);
  const girl = person(paper, root, 'girl', -.49, 2.32, .08);
  const boy = person(paper, root, 'boy', .46, 2.15, -.08);
  return (t, p) => {
    bustle(t);
    walkPair(boy, girl, t, p, 2.3);
  };
}

export function jiefangbeiSelfie(paper, root) {
  const bustle = plaza(paper, root);
  const couple = paper.group(root, 'newyear-selfie-couple', -2.97, 0, 0);
  const boy = person(paper, couple, 'boy', .32, .14, -.07);
  const girl = person(paper, couple, 'girl', -.38, .12, .12);
  const holdingArm = boy.root.getObjectByName('autumn-left-arm');
  const phone = paper.group(couple, 'newyear-selfie-phone');
  paper.sheet(phone, '#38364d', .117, .207, .02, .025, 0, .058, -.031);
  paper.sheet(phone, '#8da5c7', .094, .176, .012, .009, 0, .058, -.006);
  paper.disk(phone, '#82718f', .019, .019, .006, .026, .122, -.040, 12).rotation.x = Math.PI / 2;
  paper.disk(phone, '#262738', .010, .010, .007, .026, .122, -.045, 12).rotation.x = Math.PI / 2;
  const lens = paper.group(phone, 'newyear-selfie-lens', 0, .122, .023);
  const gestures = [
    { actor: boy, arm: 'right', side: 1, color: '#e9b491' },
    { actor: girl, arm: 'left', side: -1, color: '#efc1a1' },
  ].map(({ actor, arm, side, color }) => {
    const fingers = paper.group(couple, 'newyear-selfie-peace-sign');
    paper.ball(fingers, color, .030, .023, .016, 0, -.007, 0);
    for (const direction of [-1, 1]) {
      const finger = paper.ball(fingers, color, .0105, direction === side ? .046 : .041, .011,
        direction * .019, .031, -.002);
      finger.rotation.z = -direction * .285;
    }
    return { actor, arm, side, fingers };
  });
  const flashMaterial = paper.own(new THREE.MeshBasicMaterial({
    color: '#fff2e4', transparent: true, opacity: 0, depthTest: false, depthWrite: false,
  }));
  const flash = paper.surface(root, new THREE.PlaneGeometry(1, 1), flashMaterial);
  flash.name = 'newyear-selfie-shutter';
  flash.renderOrder = 50;
  const viewfinder = paper.group(root, 'newyear-selfie-viewfinder');
  const frameInk = paper.own(new THREE.MeshBasicMaterial({
    color: '#fff1d7', transparent: true, opacity: .7, depthTest: false, depthWrite: false,
  }));
  const corners = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      const corner = paper.group(viewfinder, 'viewfinder-corner');
      paper.surface(corner, new THREE.PlaneGeometry(.071, .004), frameInk, -x * .032, 0, 0).renderOrder = 40;
      paper.surface(corner, new THREE.PlaneGeometry(.004, .058), frameInk, 0, -y * .027, 0).renderOrder = 40;
      corners.push({ corner, x, y });
    }
  }
  const hand = new THREE.Vector3();
  const lensPosition = new THREE.Vector3();
  return (t, _p, camera) => {
    bustle(t + 3);
    const lift = ease((t - .11) / .72);
    const close = ease(t / .75);
    const gesture = ease((t - .61) / .60);
    const throughPhone = t >= 1.53;
    boy.root.position.x = mix(.34, .203, close);
    girl.root.position.x = mix(-.53, -.201, close);
    boy.root.rotation.z = .025 * close;
    girl.root.rotation.z = -.043 * close;
    boy.pose('idle', t);
    girl.pose(t < .30 ? 'walk' : 'idle', t);
    hand.set(mix(.19, 0, lift), mix(.75, 1.20, lift), mix(.077, -.309, lift) - .013 * Math.sin(t * 2.5));
    couple.localToWorld(hand);
    boy.reachHand('left', hand).getWorldPosition(phone.position);
    couple.worldToLocal(phone.position);
    phone.rotation.set(mix(.21, -.07, lift), .08 * (1 - lift), mix(.17, -.04, lift));
    phone.visible = holdingArm.visible = !throughPhone;
    lens.getWorldPosition(lensPosition);
    boy.lookToward(lensPosition, .115, lift);
    girl.lookToward(lensPosition, -.155, lift);
    gestures.forEach(({ actor, arm, side, fingers }) => {
      hand.set(side * mix(.38, .48, gesture), mix(.77, 1.355, gesture), mix(.10, -.11, gesture));
      couple.localToWorld(hand);
      actor.reachHand(arm, hand).getWorldPosition(fingers.position);
      couple.worldToLocal(fingers.position);
      fingers.position.x += side * .004;
      fingers.position.y += .010;
      fingers.position.z += .007;
      fingers.rotation.z = -side * .24;
      fingers.visible = gesture > .83;
      fingers.scale.setScalar(gesture);
    });
    if (!camera) return;
    if (throughPhone) {
      camera.position.set(lensPosition.x, lensPosition.y + .10, lensPosition.z - .72);
      const lead = .145 * ease((camera.aspect - .55) / .45);
      camera.lookAt(couple.position.x + lead, 1.60, .105);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(.66 * Math.max(1, 1.02 / camera.aspect)));
      camera.updateProjectionMatrix();
    }
    viewfinder.position.copy(camera.position);
    viewfinder.quaternion.copy(camera.quaternion);
    viewfinder.translateZ(-1.2);
    const top = 1.2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const edge = top * camera.aspect;
    corners.forEach(({ corner, x, y }) => { corner.position.set(x * edge * .745, y * top * .715, 0); });
    frameInk.opacity = .70 * ease((t - .63) / .28) * (1 - ease((t - 2.45) / .35));
    flash.position.copy(viewfinder.position);
    flash.quaternion.copy(camera.quaternion);
    flash.scale.set(edge * 2.04, top * 2.04, 1);
    flashMaterial.opacity = .67 * Math.max(0, 1 - Math.abs(t - 1.92) / .15);
  };
}
