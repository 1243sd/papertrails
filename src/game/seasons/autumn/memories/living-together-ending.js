import * as THREE from 'three';
import { autumnRandom } from '../leaves.js';
import { ease, floor } from './paper.js';
import { glow, lightTrail } from './memory-light.js';
import { planter } from './living-together-details.js';

function aurora(paper, root) {
  const tick = { value: 0 };
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick },
    vertexShader: `
      varying vec2 plane;
      void main() {
        plane = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader: `
      uniform float tick;
      varying vec2 plane;
      float random(float id) { return fract(sin(id * 127.1) * 43758.5453); }
      void main() {
        vec2 p = vec2(plane.x, (plane.y - .5) * 2.75 + .5);
        vec3 dusk = mix(vec3(.55,.29,.42),vec3(.055,.059,.19),smoothstep(.33,.81,p.y));
        float horizon = exp(-5.2 * length((p - vec2(.47,.39)) * vec2(1.4,2.1)));
        dusk += vec3(.19,.083,.092) * horizon;
        float wave = .61 + .043 * sin(p.x * 12.7 - tick * .39) + .024 * cos(p.x * 22. + tick * .62);
        float window = smoothstep(.095,.28,p.x) * (1. - smoothstep(.73,.92,p.x));
        float d = p.y - wave;
        float curtain = exp(-abs(d) * 25.) * (.49 + .51 * pow(.5 + .5 * sin(p.x * 168. + tick * 2.),3.7));
        float border = exp(-abs(d) * 109.) * .71;
        float echo = exp(-abs(p.y - wave + .050 + .014 * sin(p.x * 17. - tick)) * 67.);
        vec3 ribbon = mix(vec3(.49,.78,.98),vec3(.92,.36,.76),.5 + .5 * sin(7.8 * p.x + tick * .63));
        dusk += window * (ribbon * (curtain * .55 + border * .45) + echo * vec3(.28,.16,.31));
        float highArc = p.y - (.731 + .046 * sin(p.x * 10.2 + tick * .34) - .021 * cos(p.x * 18.));
        float highFade = smoothstep(.18,.35,p.x) * (1. - smoothstep(.70,.86,p.x));
        vec3 upperRibbon = mix(vec3(.39,.57,.97),vec3(.91,.39,.71),.5 + .5 * cos(12. * p.x - tick * .41));
        dusk += highFade * upperRibbon * (exp(-abs(highArc) * 24.) * .29 + exp(-abs(highArc) * 117.) * .30);
        vec2 cells = p * vec2(67.,48.);
        float id = floor(cells.x) + floor(cells.y) * 67.;
        vec2 star = fract(cells) - vec2(.21 + .57 * random(id),.18 + .61 * random(id + 12.));
        float shine = step(.76,random(id + 7.)) * (1. - smoothstep(.019,.091,length(star)));
        dusk += shine * (.49 + .34 * sin(tick * 2.2 + id)) * vec3(.68,.60,.85) * smoothstep(.40,.61,p.y);
        gl_FragColor = vec4(dusk,1.);
      }
    `,
    side: THREE.DoubleSide,
  }));
  const sky = paper.surface(root, new THREE.PlaneGeometry(54, 55), material, 0, 4.75, 24);
  sky.name = 'home-city-aurora';
  return (t) => { tick.value = t; };
}

function skyline(paper, root) {
  const city = paper.group(root, 'home-dream-city-skyline');
  const random = autumnRandom(3058);
  const panes = [];
  paper.box(city, '#4a354c', 54, .13, 29, 0, -1.19, 14);
  // Distant towers fill the spaces between the nearer buildings.
  for (let depth = 0; depth < 3; depth++) {
    const count = depth === 2 ? 10 : 17;
    for (let i = 0; i < count; i++) {
      const edge = Math.abs((i + .5) / count - .5) * 2;
      const x = (i - (count - 1) / 2) * (depth === 2 ? 2.08 : 1.69) + (depth - 1) * .68;
      const z = 17.2 - depth * 3.82 + random() * 1.30;
      const width = 1.04 + random() * .67;
      const height = 2.66 + edge * 1.46 + random() * 2.39 + (depth === 2 ? -.75 : .38);
      const offset = depth === 2 ? -1.07 : -.42;
      const tones = [['#5b426b','#684773','#744b70'], ['#473957','#564161','#554060'], ['#39364e','#483754','#523b54']][depth];
      const facadeHeight = height + offset + 1.15;
      paper.box(city, tones[i % 3], width, facadeHeight, .69, x, facadeHeight / 2 - 1.15, z);
      paper.box(city, '#8f6382', width + .045, .043, .72, x, height + offset, z);
      if ((i + depth) % 3 === 0) {
        paper.box(city, tones[i % 3], width * .72, .28, .55, x - .06, height + offset + .139, z);
        if (i % 2) paper.box(city, '#936c8e', .023, .43, .023, x + .077, height + offset + .431, z);
      }
      if (depth > 0 && (i + depth) % 3 === 1) {
        const edgeLight = paper.box(city, '#c58cad', .026, height - .20, .021,
          x - width * .43, height / 2 + offset, z - .356, .22);
        edgeLight.name = 'home-city-roofline';
      }
      const columns = depth === 2 ? 4 : 3;
      for (let row = .40; row < height - .19; row += .29) {
        for (let j = 0; j < columns; j++) {
          if (random() < .25) continue;
          const dx = (j - (columns - 1) / 2) * width / (columns + .57);
          panes.push({
            x: x + dx, y: row + offset, z: z - .349, width: width / columns * .56,
            color: new THREE.Color(['#ffc47e','#ef9da7','#ba94d6','#c49ac2','#ffd7aa'][(i + Math.floor(random() * 8)) % 5]),
            seed: random(),
          });
        }
      }
    }
  }
  const windowGeometry = paper.own(new THREE.PlaneGeometry(1, 1));
  windowGeometry.rotateY(Math.PI);
  const windowMaterial = paper.own(new THREE.MeshBasicMaterial({ toneMapped: false }));
  const windows = paper.own(new THREE.InstancedMesh(windowGeometry, windowMaterial, panes.length));
  windows.name = 'home-city-window-lights';
  city.add(windows);
  const dummy = new THREE.Object3D();
  const shade = new THREE.Color();
  panes.forEach(({ x, y, z, width }, i) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(width, .087, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(i, dummy.matrix);
  });
  windows.instanceMatrix.needsUpdate = true;
  return (t) => {
    panes.forEach(({ x, y, color, seed }, i) => {
      const crest = .5 + .5 * Math.sin(t * 2.1 - x * .27 + y * .81);
      const brightness = .41 + .14 * seed + crest ** 5 * .51;
      windows.setColorAt(i, shade.copy(color).multiplyScalar(brightness));
    });
    windows.instanceColor.needsUpdate = true;
  };
}

function terrace(paper, root) {
  floor(paper, root, '#695367', 18, 14);
  const overlook = paper.group(root, 'home-city-overlook');
  for (let row = 0; row < 5; row++) {
    const z = -1.58 + row * .65;
    paper.box(overlook, '#60495f', 13.0, .008, .016, 0, .007, z);
    for (let j = -6; j <= 6; j++) paper.box(overlook, '#775e70', .012, .008, .63,
      j * .99 + row % 2 * .47, .007, z + .32);
  }
  paper.box(overlook, '#8c6d7d', 14.5, .16, .31, 0, .08, 2.32);
  paper.box(overlook, '#a9828a', 14.51, .049, .127, 0, .657, 2.32);
  paper.box(overlook, '#806074', 14.38, .037, .074, 0, .259, 2.32);
  for (let i = -10; i <= 10; i++) {
    paper.box(overlook, '#977483', .031, .47, .049, i * .675, .43, 2.32);
    if (i % 2 === 0) paper.box(overlook, '#c29595', .057, .059, .061, i * .675, .454, 2.30).rotation.z = Math.PI / 4;
  }
  const lamps = [];
  for (const side of [-1,1]) {
    const lanternX = side * 4.45;
    paper.disk(overlook, '#926a7d', .056, .095, 1.39, lanternX, .70, .89, 8);
    paper.box(overlook, '#b08796', .221, .061, .175, lanternX, 1.412, .89);
    paper.box(overlook, '#efba8b', .147, .282, .131, lanternX, 1.58, .89, .51);
    paper.box(overlook, '#957387', .247, .069, .189, lanternX, 1.759, .89);
    lamps.push(glow(paper, overlook, '#ffbda0', lanternX, 1.57, .816, 1.41, 1.88, .73));
    for (const [x,z,size] of [[2.86,1.94,.76],[3.99,.36,1.16],[4.99,1.39,1.02]]) {
      const worldX = side * x;
      paper.disk(overlook, '#89687a', .18 * size, .23 * size, .19 * size, worldX, .10 * size, z, 8);
      const lamp = paper.group(overlook, 'home-terrace-amber-lantern', worldX, .29 * size, z);
      lamp.scale.setScalar(size);
      paper.box(lamp, '#9d7888', .25, .051, .22, 0, .023, 0);
      paper.box(lamp, '#ffc184', .155, .251, .153, 0, .158, 0, .54);
      paper.box(lamp, '#957080', .232, .045, .219, 0, .299, 0);
      const halo = glow(paper, lamp, '#ffb987', 0, .153, -.082, .83, 1.20, .67);
      lamps.push(halo);
    }
    for (const [x,z,size] of [[3.35,.58,.85],[4.32,1.3,1.04],[4.96,1.81,1.08],[2.7,1.76,.62]]) {
      planter(paper, overlook, side * x, 0, z, size, ['#e68caa','#eeaa92','#e8bf9f']);
    }
    const puddle = glow(paper, overlook, '#b885ac', side * 2.82, .014, 1.21, 3.17, 2.8, .45);
    puddle.rotation.x = -Math.PI / 2;
  }
  return (t) => lamps.forEach((halo, i) => { halo.material.uniforms.strength.value = .63 + .11 * Math.sin(t * 1.8 + i); });
}

function risingLights(paper, root) {
  const random = autumnRandom(4029);
  const vertices = [], phases = [];
  for (let i = 0; i < 169; i++) {
    const side = i % 2 ? 1 : -1;
    vertices.push(side * (1.42 + random() * 5.2), random() * 5.6, 1.5 + random() * 13.6);
    phases.push(random() * Math.PI * 2);
  }
  const geometry = paper.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const tick = { value: 0 };
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick },
    vertexShader: `
      uniform float tick;
      attribute float phase;
      varying float strength;
      varying float hue;
      void main() {
        vec3 p = position;
        p.x += .26 * sin(phase + tick * 1.3);
        p.y = mod(p.y + tick * (.29 + .13 * sin(phase)), 5.6);
        vec4 mv = modelViewMatrix * vec4(p,1.);
        gl_Position = projectionMatrix * mv;
        strength = (1. - smoothstep(4.8,5.6,p.y)) * smoothstep(0.,.37,p.y) * (.58 + .39 * sin(phase + tick * 2.));
        hue = .5 + .5 * sin(phase * 4.);
        gl_PointSize = clamp((27. + phase * 13.) / -mv.z,2.,19.);
      }
    `,
    fragmentShader: `
      varying float strength;
      varying float hue;
      void main() {
        vec2 p = abs(gl_PointCoord * 2. - 1.);
        float soft = pow(1. - smoothstep(.06,1.,length(p)),2.);
        float core = (1. - smoothstep(.08,.29,length(p)));
        vec3 color = mix(vec3(.99,.70,.42),vec3(.66,.51,1.),hue);
        gl_FragColor = vec4(mix(color,vec3(1.,.93,.81),core), strength * (soft * .68 + core * .56));
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const air = new THREE.Points(geometry, material);
  air.name = 'home-city-rising-lights';
  air.frustumCulled = false;
  root.add(air);
  return (t) => { tick.value = t; };
}

export function livingTogetherEnding(paper, root) {
  const sky = aurora(paper, root);
  const windows = skyline(paper, root);
  const lanterns = terrace(paper, root);
  const air = risingLights(paper, root);
  const arcs = [
    [[-9,3.49,11],[-6.7,4.65,11.7],[-3.9,5.34,12.3],[-1,5.04,12.6],[2,4.55,13],[4.95,4.9,14]],
    [[8.8,2.22,9.8],[7.2,3.62,10.4],[4.7,4.63,11.4],[2.0,5.23,12.4],[-1.32,5.02,12.9],[-4.5,4.5,13.25]],
    [[-8.9,2.64,9.8],[-6.6,3.59,10.7],[-3.8,3.87,11.4],[-.6,3.82,11.7],[2.9,4.21,12.7],[4.8,5.09,13.7]],
  ].map((arc, i) => lightTrail(paper, root, arc, .019 + i * .003, ['#ffc4a7','#dba5ff','#a9dbff'][i], .23 + i * .085, .35 * i));
  return (t) => {
    sky(t);
    windows(t);
    lanterns(t);
    air(t);
    const arrival = ease(t / .73);
    arcs.forEach((arc, i) => { arc.value = t + arrival * (.21 + i * .14); });
  };
}
