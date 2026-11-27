import * as THREE from 'three';
import { autumnRandom } from '../leaves.js';
import { ease, floor, mix } from './paper.js';
import { cup, person, walkPair, windows } from './props.js';
import { glow } from './memory-light.js';
import { sign } from './first-meeting-scenery.js';
import { lantern } from './props.js';

export function snow(paper, parent, name, center, size, count, wind) {
  const random = autumnRandom(count * 31);
  const positions = [], phases = [];
  for (let i = 0; i < count; i++) {
    positions.push(center[0] + (random() - .5) * size[0], random() * size[1], center[2] + (random() - .5) * size[2]);
    phases.push(random() * Math.PI * 2);
  }
  const geometry = paper.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick: { value: 0 }, width: { value: size[0] }, height: { value: size[1] },
      base: { value: center[1] }, middle: { value: center[0] }, wind: { value: wind } },
    vertexShader: `
      uniform float tick, width, height, base, middle, wind;
      attribute float phase;
      varying float fade;
      void main() {
        vec3 p = position;
        p.x = mod(p.x - middle + width * .5 - tick * wind, width) + middle - width * .5 + .16 * sin(tick * 1.6 + phase);
        p.y = base + mod(p.y - tick * (.29 + .25 * sin(phase) * sin(phase)), height);
        vec4 mv = modelViewMatrix * vec4(p,1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((14. + phase * 6.) / -mv.z, 2., 10.);
        fade = smoothstep(0.,.19,p.y - base) * (1. - smoothstep(height - .25,height,p.y - base));
      }
    `,
    fragmentShader: `
      varying float fade;
      void main() {
        float d = length(gl_PointCoord - .5);
        gl_FragColor = vec4(.83,.89,1.,(1. - smoothstep(.08,.49,d)) * fade * .77);
      }
    `,
    transparent: true, depthWrite: false,
  }));
  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.frustumCulled = false;
  parent.add(points);
  return (t) => { material.uniforms.tick.value = t; };
}

export function frostWindow(paper, root) {
  const material = paper.own(new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 cell;
      void main() {
        cell = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader: `
      varying vec2 cell;
      void main() {
        vec2 rim = min(cell,1. - cell);
        float pattern = .48 + .25 * sin(cell.x * 89. + cell.y * 117.) + .24 * cos(cell.x * 201. - cell.y * 173.);
        float edge = 1. - smoothstep(.01,.18,min(rim.x * 1.82,rim.y) + pattern * .027);
        float veins = pow(.5 + .5 * cos((cell.y - cell.x * .33) * 159. + 4. * sin(cell.x * 24.)),7.);
        gl_FragColor = vec4(.70,.85,1.,edge * (.26 + .27 * veins));
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  paper.surface(root, new THREE.PlaneGeometry(3.83, 1.89), material, 0, 1.864, 2.18).name = 'newyear-frosted-train-glass';
}

export function stationDecor(paper, root) {
  const ceiling = paper.group(root, 'newyear-station-canopy', 0, 0, 0);
  paper.box(ceiling, '#676a83', 13, .16, 1.48, 0, 3.42, 2.6);
  paper.box(ceiling, '#bfc8d9', 13, .12, 1.62, 0, 3.54, 2.6);
  for (let i = -3; i <= 3; i++) {
    paper.box(ceiling, '#8a93a8', .063, .14, 1.43, i * 1.81, 3.305, 2.59);
  }
  sign(paper, ceiling, '站台 02', 1.43, .34, .04, 2.83, 2.51, '#3e4868', '#e6ebf7');
  for (const x of [-2.27, 2.27]) {
    paper.box(ceiling, '#3c455f', .99, .124, .28, x, 3.17, 2.37);
    paper.box(ceiling, '#fff0cc', .81, .044, .21, x, 3.07, 2.34, .31);
    glow(paper, ceiling, '#ffd5a7', x, 3.08, 2.22, 1.58, .78, .42);
  }
  for (let row = 0; row < 8; row++) {
    const z = -2 + row * .67;
    paper.box(root, '#897f88', 12.25, .007, .017, 0, .007, z);
    for (let i = -6; i <= 6; i++) {
      paper.box(root, '#94848b', .012, .007, .65, i * .92 + row % 2 * .36, .007, z + .33);
    }
  }
  for (const x of [-4.2, 4.1]) {
    paper.box(root, '#735264', .97, .10, .37, x, .475, 2.29);
    paper.box(root, '#8f6b74', .97, .27, .066, x, .70, 2.45);
    paper.box(root, '#60566c', .08, .46, .32, x - .35, .23, 2.29);
    paper.box(root, '#60566c', .08, .46, .32, x + .35, .23, 2.29);
  }
  const random = autumnRandom(194);
  for (let i = 0; i < 26; i++) {
    const x = (random() - .5) * 12.55;
    paper.ball(root, '#d3d9e8', .14 + random() * .31, .025 + random() * .040,
      .074 + random() * .113, x, .033, 3.34 + random() * .31);
  }
  const steam = [-3.3, -1.8, -.35, 1.1, 2.55, 4].map((x) =>
    ({ x, puff: glow(paper, root, '#9faeca', x, .31, 3.99, 2.4, .7, .29) }));
  const moveSnow = snow(paper, root, 'newyear-platform-snow', [0, 0, 1.8], [13, 5, 8], 194, .45);
  return (t) => {
    moveSnow(t);
    steam.forEach(({ x, puff }, i) => {
      puff.position.x = x + .34 * Math.sin(t * 1.7 + i);
      puff.position.y = .25 + .075 * Math.sin(t * 2.35 + i * .76);
      puff.scale.x = 1 + Math.sin(t * 1.43 + i) * .25;
      puff.material.uniforms.strength.value = .29 + .16 * Math.sin(t * 2.23 + i);
    });
  };
}

export function hotpotDecor(paper, room, desk) {
  for (const y of [1.56, 2.00, 2.46, 2.9, 3.34]) paper.box(room, '#935e55', 4.46, .037, .033, 0, y, 5.37);
  for (let i = -4; i <= 4; i++) {
    paper.box(room, '#956357', .036, 1.79, .036, i * .49, 2.45, 5.383);
    if (i % 2) paper.box(room, '#a76e5a', .103, .104, .041, i * .49 + .245, 2.69, 5.353).rotation.z = Math.PI / 4;
  }
  sign(paper, room, '铜锅小馆', 1.29, .32, 0, 2.62, 5.326, '#873e43', '#ffd68f');
  for (const x of [-2.68, 2.68]) {
    paper.box(room, '#6c4449', 1.19, 1.72, .29, x, 1.36, 4.23);
    paper.box(room, '#8e5653', 1.31, .087, .43, x, 2.243, 4.18);
    for (const y of [.94, 1.38, 1.81]) {
      paper.box(room, '#b08265', 1.19, .064, .44, x, y, 4.115);
      for (let i = 0; i < 4; i++) {
        const px = x + (i - 1.5) * .236;
        if (y > 1.7) {
          paper.disk(room, '#c99173', .083, .064, .144, px, y + .103, 4.08, 10);
          paper.disk(room, '#a56152', .092, .083, .028, px, y + .185, 4.08, 10);
        } else paper.disk(room, i % 2 ? '#e2c59e' : '#b98a79', .088, .058, .064, px, y + .066, 4.05, 12);
      }
    }
    const panel = sign(paper, room, x < 0 ? '热汤' : '暖冬', .32, .55, x * 1.25, 1.72, 4.0, '#9d4953', '#f5bb82');
    panel.rotation.z = x > 0 ? .065 : -.065;
    lantern(paper, room, x * .97, 2.72, 2.9, .71);
    glow(paper, room, '#ffc08a', x * .97, 2.72, 2.78, 1.35, 1.16, .46);
  }
  for (const x of [-.30, .31]) {
    paper.disk(desk, '#d3b298', .092, .064, .046, x, .805, -.438, 14);
    paper.disk(desk, x < 0 ? '#d98d5f' : '#8a605b', .075, .057, .013, x, .833, -.438, 14);
  }
  const embers = glow(paper, desk, '#fa9a48', 0, .833, -.369, .72, .28, .56);
  const bubbles = Array.from({ length: 13 }, (_, i) => {
    const radius = .060 + i % 4 * .053;
    const bubble = paper.ball(desk, '#ffe0a0', .018, .017, .018, Math.sin(i * 2.4) * radius, 1.035, Math.cos(i * 2.4) * radius, .37);
    bubble.name = 'newyear-broth-bubble';
    return bubble;
  });
  return (t) => {
    embers.material.uniforms.strength.value = .44 + .18 * Math.sin(t * 9.28);
    bubbles.forEach((bubble, i) => {
      const phase = (t * (.86 + i % 3 * .17) + i * .27) % 1;
      const size = Math.sin(phase * Math.PI) ** .8;
      bubble.scale.set(.024 * size, .024 * size, .024 * size);
      bubble.position.y = 1.029 + phase * .082;
    });
  };
}
