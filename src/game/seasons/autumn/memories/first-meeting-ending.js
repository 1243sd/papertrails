import * as THREE from 'three';
import { autumnRandom, mapleGeometry } from '../leaves.js';
import { ease, floor, mix } from './paper.js';
import { lantern, tree } from './props.js';

import { glow, lightTrail } from "./memory-light.js";

const canopy = ['#7f2949', '#b63e55', '#d25958', '#9d3553', '#e17b61', '#6c3154'];

function nightSky(paper, root) {
  const gradient = paper.own(new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 uvPoint;
      void main() {
        uvPoint = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 uvPoint;
      void main() {
        vec3 sky = mix(vec3(.31, .19, .35), vec3(.027, .031, .117), smoothstep(.15, .73, uvPoint.y));
        float haze = 1.0 - smoothstep(0.0, .53, length((uvPoint - vec2(.56, .32)) * vec2(1.6, 2.2)));
        sky += haze * vec3(.15, .084, .12);
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  }));
  paper.surface(root, new THREE.PlaneGeometry(66, 24), gradient, 0, 4.8, 22);
  const moon = paper.group(root, 'autumn-finale-moon', -3.57, 5.28, 14.5);
  glow(paper, moon, '#a99ffc', 0, 0, .04, 5.9, 5.9, .70);
  const surface = paper.own(new THREE.MeshBasicMaterial({ color: '#e6dbff', toneMapped: false }));
  paper.surface(moon, new THREE.CircleGeometry(.53, 48), surface, 0, 0, 0).rotation.y = Math.PI;
  for (const [x, y, width] of [[-.16, .11, .108], [.19, -.13, .137], [.18, .2, .062], [-.18, -.18, .068]]) {
    const crater = glow(paper, moon, '#a997d2', x, y, -.009, width * 3, width * 2.6, .27);
    crater.material.blending = THREE.NormalBlending;
  }
  for (let layer = 0; layer < 2; layer++) {
    const points = [[-14, -.25], [-11, .74], [-9, .33], [-6, 1.2], [-3, .43], [1, 1.03],
      [4, .62], [8, 1.30], [11, .61], [14, -.25], [14, -1], [-14, -1]];
    paper.cut(root, layer ? '#584568' : '#685074', points, .08, -.7 + layer * 2, .35, 12.3 - layer * 1.6);
  }
}

function luminousPoints(paper, root, count, sky, random) {
  const positions = [], seeds = [], sizes = [];
  for (let i = 0; i < count; i++) {
    const sign = i % 2 === 0 ? -1 : 1;
    const x = sky ? (random() - .5) * 25 : sign * (.86 + random() * 4.5);
    const y = sky ? 2.5 + random() * 8.6 : .14 + random() * 4.2;
    positions.push(x, y, sky ? 19 - random() * 2 : -1.35 + random() * 12.2);
    seeds.push(random() * Math.PI * 2);
    sizes.push(sky ? 18 + random() * 69 : 7 + random() * 18);
  }
  const geometry = paper.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick: { value: 0 }, drift: { value: sky ? .07 : 1 } },
    vertexShader: `
      uniform float tick;
      uniform float drift;
      attribute float phase;
      attribute float size;
      varying float pulse;
      varying float hue;
      void main() {
        vec3 p = position;
        p.x += drift * .48 * sin(tick * .62 + phase);
        p.y += drift * (.23 * cos(tick * .84 + phase) + .11 * sin(tick * 1.7 + phase));
        p.z += drift * .34 * cos(tick * .63 + phase * 1.9);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        pulse = .48 + .52 * pow(.5 + .5 * sin(tick * 1.9 + phase), 2.8);
        hue = .5 + .5 * cos(phase);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(size / max(1.0, -mv.z) * (3.3 + pulse), 2.0, 32.0);
      }
    `,
    fragmentShader: `
      varying float pulse;
      varying float hue;
      void main() {
        vec2 p = abs(gl_PointCoord * 2.0 - 1.0);
        float r = length(p);
        float halo = pow(1.0 - smoothstep(0.02, 1.0, r), 2.1);
        float rays = (1.0 - smoothstep(.01, .095, min(p.x, p.y))) * (1.0 - smoothstep(.15, .89, max(p.x, p.y)));
        float core = 1.0 - smoothstep(.08, .29, r);
        vec3 color = mix(vec3(.62, .51, 1.0), vec3(1.0, .72, .36), hue);
        gl_FragColor = vec4(mix(color, vec3(1.0, .94, .85), core), pulse * (halo * .55 + rays * .37 + core * .65));
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const mesh = new THREE.Points(geometry, material);
  mesh.name = sky ? 'autumn-finale-stars' : 'autumn-finale-fireflies';
  root.add(mesh);
  return material.uniforms.tick;
}

export function firstMeetingEnding(paper, root) {
  const random = autumnRandom(1654);
  nightSky(paper, root);
  floor(paper, root, '#322b4e', 16, 20);
  const water = paper.group(root, 'autumn-finale-moon-pond', 0, 0, 4.6);
  paper.ball(water, '#3f395d', 5.5, .061, 4.9, 0, .024, 0);
  paper.ball(water, '#384b6c', 5.3, .047, 4.65, 0, .053, 0);
  paper.ball(water, '#4b5375', 4.65, .028, 3.91, -.32, .077, .28);
  const reflection = glow(paper, water, '#c899fc', -1.6, .112, .44, 4.3, 8.7, .51);
  reflection.rotation.x = -Math.PI / 2;
  const waves = [];
  for (let i = 0; i < 54; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * .92;
    const x = 4.5 * Math.cos(angle) * radius;
    const z = 4.05 * Math.sin(angle) * radius;
    const width = .15 + random() * .78;
    const ripple = paper.line(water, i % 3 ? '#7777a6' : '#d097ba', .005 + i % 3 * .002,
      [[-width / 2, 0, 0], [0, .001, .048], [width / 2, 0, 0]], .25);
    ripple.position.set(x, .118, z);
    waves.push({ ripple, x });
  }
  const pads = [[-2.45, .78], [2.29, 1.47], [-2.09, 2.64], [2.64, 3.24], [-1.49, 5.93], [1.19, 5.18]];
  for (const [i, [x, z]] of pads.entries()) {
    paper.ball(root, '#435f60', .25, .026, .18, x, .126, z);
    for (let petal = 0; petal < 5; petal++) {
      const angle = petal * 2.4;
      const bud = paper.ball(root, i % 2 ? '#ca76ac' : '#de8b8d', .068, .041, .10,
        x + .05 * Math.cos(angle), .163, z + .06 * Math.sin(angle), .33);
      bud.rotation.set(-.33, angle, .35);
    }
    paper.ball(root, '#ffc590', .038, .038, .041, x, .186, z, .32);
  }
  for (let i = 0; i < 12; i++) {
    const z = -2.23 + i * .73;
    const stone = paper.disk(root, i % 3 ? '#a288a2' : '#b499aa', .42 + i % 3 * .048,
      .45 + i % 3 * .048, .118, Math.sin(i * .48) * .61, .133, z, 7);
    stone.scale.z = .61;
    stone.rotation.y = i * .54;
  }
  const lamps = [];
  const leafMesh = mapleGeometry();
  const petals = [];
  for (const side of [-1, 1]) {
    for (const [i, [x, z, size]] of [[2.94, -.33, 1.55], [3.98, 1.31, 1.84], [3.18, 3.36, 1.55],
      [4.99, 4.3, 2.09], [2.67, 6.65, 1.37], [4.4, 8.52, 1.53]].entries()) {
      const grove = tree(paper, root, side * (x + (side < 0 ? .13 : 0)), z + (side < 0 ? .34 : 0), size, i, canopy);
      grove.rotation.y = side * .33 + i * .52;
    }
    for (let i = 0; i < 30; i++) {
      const z = -2.13 + random() * 8.8;
      const x = side * (1.75 + random() * 2.8);
      const mound = paper.ball(root, i % 3 ? '#445060' : '#55506d', .18 + random() * .23, .085 + random() * .16,
        .23 + random() * .27, x, .085, z);
      for (let k = 0; k < 3; k++) {
        paper.ball(root, ['#d07fa5', '#c45f87', '#f1aa91'][(i + k) % 3], .051, .035, .057,
          x + (k - 1) * .13, mound.position.y + mound.scale.y * .78, z - k * .07, .22);
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = side * (1.45 + .49 * i), z = -.58 + i * 1.18;
      const y = i % 2 ? .59 : .36;
      paper.disk(root, '#666381', .19, .24, .15, x, .182, z, 6);
      paper.disk(root, '#a084a0', .13, .13, y, x, y * .5 + .1, z, 6);
      const light = lantern(paper, root, x, y + .26, z, .65);
      const halo = glow(paper, root, '#ff8f56', x, y + .28, z - .04, 1.44, 1.44, .69);
      lamps.push({ light, halo });
    }
    for (let i = 0; i < 16; i++) {
      const leaf = paper.surface(root, leafMesh, paper.material(canopy[i % canopy.length], .38));
      leaf.scale.setScalar(.10 + random() * .19);
      petals.push({ leaf, side, offset: random(), z: -1.5 + random() * 9.3, speed: .09 + random() * .1 });
    }
  }
  const ticks = [luminousPoints(paper, root, 145, true, random), luminousPoints(paper, root, 142, false, random)];
  for (const side of [-1, 1]) {
    for (let strand = 0; strand < 4; strand++) {
      const points = Array.from({ length: 12 }, (_, i) => {
        const f = i / 11;
        return [side * (5.6 - f * 4 + Math.sin(f * 5 + strand * .3) * (.91 - strand * .11)),
          .22 + Math.sin(Math.PI * f) * (1.38 + strand * .28) + strand * .052, 7.8 - f * 10 + strand * .14];
      });
      ticks.push(lightTrail(paper, root, points, .008 + strand * .005,
        ['#ffca85', '#ffa57f', '#cf93ff', '#9dbeff'][strand], side * (.24 + strand * .039), side * .18 + strand * .24));
    }
  }
  for (let i = 0; i < 3; i++) {
    const arc = Array.from({ length: 28 }, (_, step) => {
      const angle = .32 + step / 27 * Math.PI * 1.76 + i * .49;
      return [Math.cos(angle) * (2.27 + i * .38), .15 + i * .046 + .036 * Math.sin(angle * 2),
        3.9 + Math.sin(angle) * (1.66 + i * .24)];
    });
    ticks.push(lightTrail(paper, root, arc, .014 + i * .003,
      ['#ffcb8e', '#fca5de', '#b7b7ff'][i], .21 + i * .058, .26 * i));
  }
  ticks.push(lightTrail(paper, root, [[5.38, 7.58, 16.4], [3.94, 6.78, 16.3], [1.94, 5.92, 16.2], [.22, 5.29, 16.1]],
    .019, '#d2ccff', .28, .38));
  return (t) => {
    const reveal = ease(t / .92);
    ticks.forEach((tick) => { tick.value = t; });
    lamps.forEach(({ light, halo }, i) => {
      light.rotation.z = Math.sin(t * 1.9 + i) * .064;
      halo.material.uniforms.strength.value = (.49 + .13 * Math.sin(t * 2.18 + i)) * mix(.54, 1.20, reveal);
    });
    waves.forEach(({ ripple, x }, i) => {
      ripple.position.x = x + .09 * Math.sin(t * 1.19 + i);
      ripple.scale.x = .78 + .22 * Math.sin(i * 1.88 + t * 1.85);
    });
    petals.forEach(({ leaf, side, offset, z, speed }, i) => {
      const fall = (offset + t * speed) % 1;
      leaf.position.set(side * mix(4.52, .72, fall) + .28 * Math.sin(i + t * 1.4),
        mix(4.43, .1, fall), z - fall * 1.9);
      leaf.rotation.set(i + t * 2.1, t * -1.3 + i, t + fall * 5);
    });
  };
}
