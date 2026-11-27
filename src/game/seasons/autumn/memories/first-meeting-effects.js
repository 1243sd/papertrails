import * as THREE from 'three';
import { autumnRandom, mapleGeometry } from '../leaves.js';
import { ease, mix } from './paper.js';
import { glow, lightTrail } from './memory-light.js';

function dust(paper, parent, count, [x, y, z], [width, height, depth], color, seed) {
  const random = autumnRandom(seed);
  const positions = [], phases = [];
  for (let i = 0; i < count; i++) {
    positions.push(x + width * (random() - .5), y + height * (random() - .5), z + depth * (random() - .5));
    phases.push(random() * Math.PI * 2);
  }
  const geometry = paper.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick: { value: 0 }, tint: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float tick;
      attribute float phase;
      varying float fade;
      void main() {
        vec3 p = position + vec3(.15 * sin(phase + tick * 1.1), .11 * cos(phase + tick * 1.78), .082 * sin(phase * 2. + tick));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        fade = .30 + .70 * pow(.5 + .5 * sin(tick * 2.8 + phase), 2.);
        gl_PointSize = clamp((23. + 24. * fade) / max(1., -mv.z), 3., 15.);
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      varying float fade;
      void main() {
        vec2 p = abs(gl_PointCoord * 2. - 1.);
        float core = 1. - smoothstep(.13, .29, length(p));
        float cross = (1. - smoothstep(.06, .16, min(p.x,p.y))) * (1. - smoothstep(.13,.90,max(p.x,p.y)));
        gl_FragColor = vec4(tint, fade * (core * .74 + cross * .5));
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const points = new THREE.Points(geometry, material);
  points.name = 'memory-drifting-sparks';
  parent.add(points);
  return (t) => { material.uniforms.tick.value = t; };
}

export function routeEffects(paper, map, path, river) {
  const comet = paper.group(map, 'gold-route-afterglow');
  const halo = glow(paper, comet, '#ffb34d', 0, 0, .056, .46, .46, .86);
  const sparks = [];
  for (let i = 0; i < 13; i++) {
    sparks.push(glow(paper, map, i % 3 ? '#ffac43' : '#ffe7a5', 0, 0, 0,
      .09 + i % 3 * .018, .09 + i % 3 * .018, .84));
  }
  const tide = lightTrail(paper, map, river.map(([x, y, z]) => [x, y + .017, z + .096]), .016, '#f1f5c1', -.34, .21);
  return (t, traveled) => {
    path.getPoint(traveled, comet.position);
    halo.material.uniforms.strength.value = .82 + Math.sin(t * 11) * .18;
    sparks.forEach((spark, i) => {
      const u = traveled - (i + 1) * .009;
      spark.visible = u > 0;
      if (!spark.visible) return;
      path.getPoint(u, spark.position);
      spark.position.y += Math.sin(i * 2.4 + t * 8) * (.018 + i * .003);
      spark.position.z += .056 + (i % 4) * .031;
      spark.material.uniforms.strength.value = (1 - i / 16) * (1.14 + Math.sin(i + t * 6) * .31);
    });
    tide.value = t;
  };
}

export function travelEffects(paper, root) {
  const sun = glow(paper, root, '#ffd381', -3.45, 2.76, 10.9, 5.3, 3.6, .62);
  sun.name = 'autumn-window-sunset';
  const shafts = [
    glow(paper, root, '#ffc981', 0, 1.86, 1.89, 3.45, .68, .49),
    glow(paper, root, '#ffdca5', 0, 2.14, 1.88, 3.75, .38, .62),
    glow(paper, root, '#eabc92', 0, 1.35, 1.87, 3.45, .25, .38),
  ];
  const leaf = mapleGeometry();
  const leaves = Array.from({ length: 15 }, (_, i) => {
    const mesh = paper.surface(root, leaf, paper.material(['#bd6347', '#dc8e4e', '#c66346'][i % 3], .29));
    mesh.scale.setScalar(.12 + i % 3 * .049);
    return mesh;
  });
  const mote = dust(paper, root, 24, [.35, 1.79, 1.74], [5.7, 1.14, .42], '#ffda8e', 88);
  return (t) => {
    const sweep = Math.sin(t * 2.6 + .5);
    shafts.forEach((shaft, i) => {
      shaft.position.x = -.28 + sweep * .88 + i * .22;
      shaft.rotation.z = -.38 + .085 * sweep;
      shaft.material.uniforms.strength.value = (.50 - i * .072) * (.74 + .26 * Math.sin(t * 5.8 + i));
    });
    leaves.forEach((mesh, i) => {
      const progress = (i * .173 + t * (.27 + i % 3 * .081)) % 1;
      mesh.position.set(mix(5.7, -4.9, progress), 1.02 + i % 9 * .173 + Math.sin(i + t * 4.8) * .18, 2.42 + i % 6 * .19);
      mesh.rotation.set(t * 3.1 + i, t * 2.5 + i, i + progress * 8);
    });
    mote(t);
  };
}

export function meetingEffects(paper, root) {
  const water = glow(paper, root, '#dad7a0', -.28, -.112, 3.72, 5.7, 3.25, .54);
  water.rotation.x = -Math.PI / 2;
  const light = [
    lightTrail(paper, root, [[-3.7, -.103, 3.5], [-2.76, -.103, 2.95], [-1.71, -.103, 2.13], [-.32, -.103, 2.4],
      [1.04, -.103, 2.1], [1.45, -.103, 1.49]], .012, '#ffe4ab', .37, .5),
    lightTrail(paper, root, [[-4.3, -.101, 1.8], [-2.7, -.101, 1.47], [-1.38, -.101, 1.13], [-.44, -.101, 1.46], [.87, -.101, 1.1]],
      .016, '#bde7cc', -.31, .43),
  ];
  const star = dust(paper, root, 35, [0, 1.75, 2.07], [6.5, 3.1, 3.54], '#ffd19a', 552);
  const petals = paper.group(root, 'bouquet-petal-swirl');
  const outline = [[0, -.11], [-.09, -.015], [-.089, .066], [-.04, .096], [.014, .08], [.079, .057], [.079, -.035]];
  const leaves = Array.from({ length: 17 }, (_, i) => {
    const petal = paper.cut(petals, ['#f799a1', '#e27387', '#ffd2bf'][i % 3], outline, .004, 0, 0, 0);
    petal.scale.setScalar(.36 + i % 3 * .082);
    return petal;
  });
  return (t, bouquet) => {
    const progress = ease((t - 1.52) / 1.2);
    petals.visible = t > 1.52 && t < 2.95;
    petals.position.copy(bouquet.position);
    petals.position.y -= .25;
    leaves.forEach((petal, i) => {
      const phase = (i * .068 + progress * .61) % 1;
      const angular = i * 2.4 + progress * 5.3;
      const size = Math.sin(Math.PI * phase);
      const envelope = ease((t - 1.52) / .36) * (1 - ease((t - 2.63) / .32));
      petal.position.set(Math.cos(angular) * (.24 + .9 * size) * progress, .064 + Math.sin(angular) * .28 * size + phase * .2,
        .14 + Math.sin(angular) * .54 * size);
      petal.scale.setScalar((.3 + i % 3 * .095) * size * envelope);
      petal.rotation.set(i + t * 2.8, angular, t * 3.1 + i);
    });
    water.material.uniforms.strength.value = .43 + Math.sin(t * 2.1) * .13;
    light.forEach((tick) => { tick.value = t; });
    star(t);
  };
}

function dinnerWindow(paper, room) {
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick: { value: 0 } },
    vertexShader: `
      varying vec2 uvPoint;
      void main() {
        uvPoint = vec2(1. - uv.x, uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float tick;
      varying vec2 uvPoint;
      float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        vec2 uv = uvPoint;
        float horizon = .385;
        vec3 sky = mix(vec3(.44,.37,.56),vec3(.067,.098,.25),smoothstep(.32,1.,uv.y));
        vec2 moon = (uv - vec2(.70,.78)) * vec2(2.25,1.);
        float r = length(moon);
        float disk = 1. - smoothstep(.061,.068,r);
        sky += vec3(.42,.41,.64) * exp(-r * 10.) * .85;
        sky = mix(sky,vec3(.97,.90,.84),disk);
        vec2 starGrid = uv * vec2(32.,19.);
        vec2 cell = floor(starGrid);
        float id = cell.x + cell.y * 32.;
        vec2 point = fract(starGrid) - vec2(.20 + .6 * hash(id),.18 + .64 * hash(id + 23.));
        float star = (1. - smoothstep(.028,.100,length(point))) * step(.73,hash(id + 29.));
        sky += star * vec3(.78,.83,1.) * (.50 + .28 * sin(tick * 1.4 + id)) * smoothstep(.45,.62,uv.y);

        float hill = .431 + .047 * sin(uv.x * 12. + .2) + .022 * sin(uv.x * 22.);
        sky = mix(sky, vec3(.26,.24,.40), 1. - smoothstep(hill,hill + .007,uv.y));
        float building = floor(uv.x * 35.);
        float top = .443 + .163 * hash(building) + .038 * sin(building * .44);
        float width = step(.10,fract(uv.x * 35.)) * step(fract(uv.x * 35.),.92);
        float belowRoof = 1. - smoothstep(top, top + .005, uv.y);
        float facade = width * belowRoof * step(horizon,uv.y);
        vec3 stone = mix(vec3(.108,.132,.263),vec3(.204,.214,.36),hash(building + 16.));
        sky = mix(sky,stone,facade);
        vec2 grid = fract(vec2(uv.x * 70.,uv.y * 50.));
        float lit = step(.27,grid.x) * step(grid.x,.63) * step(.19,grid.y) * step(grid.y,.62);
        float roomLight = facade * lit * step(uv.y,top - .025) * step(.29,hash(floor(uv.x * 70.) * 19. + floor(uv.y * 50.)));
        sky = mix(sky,vec3(.99,.73,.39),roomLight * .88);

        float wave = sin(uv.y * 166. + tick * 1.8 + sin(uv.x * 18.) * 1.9);
        float ripples = max(0.,wave) * (.53 + .47 * sin(floor(uv.y * 96.) + uv.x * 39. + tick));
        vec3 river = mix(vec3(.085,.132,.274),vec3(.247,.27,.434),smoothstep(.06,horizon,uv.y));
        float silver = exp(-abs(uv.x - .70 + .011 * wave) * (17. + uv.y * 28.));
        float gold = pow(hash(floor((uv.x + wave * .004) * 44.)),2.5) * smoothstep(.07,horizon,uv.y);
        river += ripples * (silver * vec3(.21,.23,.37) + gold * vec3(.33,.19,.092));
        sky = mix(river,sky,smoothstep(horizon - .007,horizon + .008,uv.y));
        gl_FragColor = vec4(sky,1.);
      }
    `,
    side: THREE.DoubleSide,
  }));
  const window = paper.surface(room, new THREE.PlaneGeometry(4.47, 1.97), material, 0, 2.45, 5.415);
  window.name = 'dinner-moonlit-window';
  paper.box(room, '#83514f', .063, 2.02, .055, 0, 2.45, 5.412);
  return material.uniforms.tick;
}

export function dinnerEffects(paper, room, desk) {
  const skyline = dinnerWindow(paper, room);
  const lanterns = [[-2.25, 2.69, 2.24], [2.25, 2.69, 2.24], [0, 2.74, .79]].map(([x, y, z]) =>
    glow(paper, room, '#ffb46f', x, y, z, 1.67, 1.39, .49));
  const vapors = [];
  for (const x of [-.482, .545]) {
    for (let i = 0; i < 3; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(-.016, 0);
      shape.bezierCurveTo(.13, .13, -.16, .22, .032, .42);
      shape.bezierCurveTo(-.092, .23, .087, .12, -.016, 0);
      const material = paper.own(new THREE.MeshBasicMaterial({
        color: '#ffebd1', transparent: true, depthWrite: false, side: THREE.DoubleSide,
      }));
      const steam = paper.surface(desk, new THREE.ShapeGeometry(shape, 14), material, x, .94, .39);
      steam.name = 'dinner-cup-steam';
      vapors.push({ steam, material, x });
    }
  }
  paper.disk(desk, '#d7a67d', .036, .043, .092, .246, .824, .105, 9);
  const candle = paper.ball(desk, '#ffca87', .022, .052, .019, .246, .91, .105, .70);
  const halo = glow(paper, desk, '#ff9d57', .246, .91, .076, .62, .55, .59);
  return (t) => {
    skyline.value = t;
    lanterns.forEach((light, i) => {
      light.material.uniforms.strength.value = .59 + .15 * Math.sin(t * 2.9 + i);
    });
    vapors.forEach(({ steam, material, x }, i) => {
      const phase = (t * .68 + i / 3) % 1;
      steam.position.set(x + .049 * Math.sin(i + phase * 4.), .935 + phase * .26, .366 + i % 3 * .015);
      steam.scale.setScalar(.51 + phase * .61);
      steam.rotation.y = Math.sin(phase * 2.3 + i) * .85;
      material.opacity = Math.sin(phase * Math.PI) * .44;
    });
    candle.rotation.z = Math.sin(t * 11) * .18;
    candle.scale.y = .044 + Math.sin(t * 13.3) * .008;
    halo.material.uniforms.strength.value = .53 + Math.sin(t * 8) * .105;
  };
}

export function marketEffects(paper, root) {
  const lamps = [];
  for (const z of [2.48, 5.21, 7.82]) {
    for (let i = -3; i <= 3; i++) {
      lamps.push(glow(paper, root, i % 2 ? '#ffb86f' : '#ffd49b', i * 1.02, 2.43 + .049 * i * i, z + .025, .96, .93, .74));
    }
  }
  const dustLeft = dust(paper, root, 35, [-2.13, 1.74, 2.6], [1.88, 2.97, 7.3], '#ffcc87', 131);
  const dustRight = dust(paper, root, 39, [2.16, 1.75, 2.6], [1.88, 2.96, 7.3], '#ffcc99', 787);
  const wind = [-1, 1].map((side) =>
    lightTrail(paper, root, [[side * 4.4, 2.7, 4.55], [side * 3.19, 2.2, 2.75], [side * 2.17, 1.39, 1.34],
      [side * 2.25, .82, -.1], [side * 1.62, .31, -1.4]], .015, '#ffc5a5', .27 + side * .049, side * .28));
  return (t) => {
    lamps.forEach((light, i) => {
      light.material.uniforms.strength.value = .68 + .37 * Math.sin(t * 3.1 - i * .51);
    });
    wind.forEach((tick) => { tick.value = t; });
    dustLeft(t);
    dustRight(t);
  };
}
