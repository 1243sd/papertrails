import * as THREE from 'three';
import { autumnRandom } from '../leaves.js';
import { floor } from './paper.js';
import { glow } from './memory-light.js';
import { sign } from './first-meeting-scenery.js';
import { snow } from './new-year-scenery.js';

function fireworks(paper, root) {
  const bursts = [
    [-4.46, 3.88, 7.85, '#fbad83', .18, 1.19],
    [4.65, 3.90, 8.72, '#c4cfff', .83, 1.41],
    [-1.54, 5.58, 11.75, '#ffe0ae', 1.09, 1.34],
    [2.37, 5.31, 10.82, '#eab0cf', .25, .91],
  ];
  const random = autumnRandom(2201);
  const tick = { value: 0 };
  for (const tails of [true, false]) {
    const positions = [], directions = [], timings = [], colors = [], offsets = [];
    const rng = autumnRandom(2202);
    bursts.forEach(([x, y, z, color, timing, radius], index) => {
      const tint = new THREE.Color(color);
      for (let i = 0; i < 67; i++) {
        const angle = i * 2.399963;
        const ring = i % 4 ? .76 + rng() * .35 : .32 + rng() * .39;
        const speed = radius * ring;
        const direction = [Math.cos(angle) * speed, Math.sin(angle) * speed, (rng() - .5) * .8];
        const delay = timing + (i % 3) * .035;
        const sparkle = .84 + (i + index) % 5 * .037;
        for (let vertex = 0; vertex < (tails ? 2 : 1); vertex++) {
          positions.push(x, y, z);
          directions.push(...direction);
          timings.push(delay);
          colors.push(tint.r, tint.g * sparkle, tint.b * sparkle);
          offsets.push(vertex * (.10 + random() * .036));
        }
      }
    });
    const geometry = paper.own(new THREE.BufferGeometry());
    for (const [name, values, size] of [['position', positions, 3], ['direction', directions, 3],
      ['timing', timings, 1], ['tint', colors, 3], ['offset', offsets, 1]]) {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
    }
    const material = paper.own(new THREE.ShaderMaterial({
      uniforms: { tick }, defines: tails ? { TAIL: 1 } : {},
      vertexShader: `
        uniform float tick;
        attribute vec3 direction, tint;
        attribute float timing, offset;
        varying vec3 hue;
        varying float fade;
        void main() {
          float age = mod(tick - timing, 2.74);
          float stepTime = max(0., age - offset);
          vec3 p = position + direction * (1. - exp(-stepTime * 2.38)) - vec3(0., .19 * stepTime * stepTime, 0.);
          float pulse = .76 + .24 * cos(stepTime * 14. + direction.x * 19.);
          hue = tint;
          fade = smoothstep(.0,.11,age) * (1. - smoothstep(.87,1.72,age)) * pulse * (1. - 7.0 * offset);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
          gl_PointSize = 2.4 + fade * 3.1;
        }
      `,
      fragmentShader: `
        varying vec3 hue;
        varying float fade;
        void main() {
          #ifdef TAIL
          gl_FragColor = vec4(hue, fade * .84);
          #else
          float r = length(gl_PointCoord - .5);
          gl_FragColor = vec4(hue, fade * (1. - smoothstep(.09,.5,r)));
          #endif
          #include <colorspace_fragment>
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const mesh = tails ? new THREE.LineSegments(geometry, material) : new THREE.Points(geometry, material);
    mesh.name = tails ? 'newyear-firework-trails' : 'newyear-firework-stars';
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  return (t) => { tick.value = t; };
}

export function newYearEnding(paper, root) {
  floor(paper, root, '#615d7a', 18, 12.7);
  const backdrop = paper.own(new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 plane;
      void main() {
        plane = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader: `
      varying vec2 plane;
      void main() {
        vec3 blue = mix(vec3(.31,.28,.45),vec3(.04,.055,.15), smoothstep(.24,.72,plane.y));
        float glow = exp(-3.7 * length((plane - vec2(.57,.32)) * vec2(1.,3.)));
        gl_FragColor = vec4(blue + glow * vec3(.14,.07,.09),1.);
      }
    `,
    side: THREE.DoubleSide,
  }));
  paper.surface(root, new THREE.PlaneGeometry(47, 18), backdrop, 0, 4.3, 21);
  paper.box(root, '#6b687f', 18, .23, 7.7, 0, -.07, 1.44);
  for (let row = 0; row < 8; row++) {
    const z = -2.37 + row * .58;
    paper.box(root, '#575470', 16.7, .008, .017, 0, .047, z);
    for (let i = -6; i <= 6; i++) paper.box(root, '#5e5a75', .013, .008, .55, i * 1.05 + row % 2 * .40, .047, z + .29);
  }
  const random = autumnRandom(22);
  for (let i = 0; i < 24; i++) {
    const x = (i - 11.5) * 1.16;
    const z = 10.85 + random() * 3.4;
    const height = 1.15 + random() * 1.56;
    const width = .93 + random() * .39;
    const color = ['#545675', '#645c7c', '#585467'][i % 3];
    paper.box(root, color, width, height, .92, x, height * .5 - .28, z);
    paper.cut(root, '#88879f', [[-width * .55, 0], [.06, .24 + random() * .4], [width * .58, 0]], .98, x, height - .28, z - .5);
    for (const px of [-.24, .02, .25]) {
      paper.box(root, i % 3 ? '#dfaa80' : '#a59aac', .104, .23, .018, x + px, height - .64, z - .47, .31);
      paper.box(root, '#ba8b78', .096, .18, .033, x + px, height - .985, z - .475, .15);
    }
  }
  const terrace = paper.group(root, 'newyear-snowy-overlook', 0, 0, 2.32);
  paper.box(terrace, '#89869e', 17, .38, .48, 0, .23, 0);
  paper.box(terrace, '#c4c8dd', 17.1, .11, .56, 0, .473, 0);
  for (let i = -7; i <= 7; i++) {
    paper.box(terrace, '#9595ac', .14, .39, .52, i * 1.02, .29, 0);
    paper.ball(terrace, '#cfd4e6', .37 + random() * .11, .047, .12, i * 1.03, .514, -.15 + random() * .13);
  }
  for (const side of [-1, 1]) {
    const lamp = paper.group(root, 'newyear-terrace-lamp', side * 3.37, 0, -.16);
    paper.box(lamp, '#777692', .33, .54, .37, 0, .28, 0);
    paper.box(lamp, '#c3c5dc', .39, .09, .42, 0, .56, 0);
    paper.box(lamp, '#ffbd8b', .24, .31, .25, 0, .759, 0, .58);
    for (const x of [-.132,.132]) paper.box(lamp, '#695973', .041, .34, .31, x, .759, 0);
    paper.cut(lamp, '#aba9bd', [[-.19,0], [0,.14], [.19,0]], .34, 0, .928, -.174);
    glow(paper, lamp, '#f9a57c', 0, .748, -.162, 1.48, 1.39, .69);
  }
  const board = sign(paper, terrace, '2022', 1.58, .43, 0, .372, -.281, '#793f57', '#ffd4a7');
  board.name = 'newyear-date-plaque';
  const sparkle = fireworks(paper, root);
  const falling = snow(paper, root, 'newyear-finale-snow', [0, .0, 3.1], [17, 7, 12], 227, .48);
  return (t) => {
    sparkle(t);
    falling(t);
  };
}
