import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCharacter } from './characters.js';
import { autumnRandom, populateAutumnForest } from './leaves.js';

const PI = Math.PI;
const BENCH_TITLES = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '第六幕'];

export function createAutumnStage({ reducedMotion = false } = {}) {
  const scene = new THREE.Scene();
  scene.name = 'autumn-avenue';
  scene.background = new THREE.Color('#e6aa7d');
  scene.fog = new THREE.FogExp2('#e8a878', .027);

  const camera = new THREE.PerspectiveCamera(48, 1, .055, 126);
  camera.position.set(1.09, 2.02, 4.38);
  camera.lookAt(0, 1.53, -4.6);

  const owned = new Set();
  const own = (resource) => { owned.add(resource); return resource; };
  const swatches = new Map();
  const random = autumnRandom(16102);
  const range = (min, max) => min + (max - min) * random();
  const box = own(new THREE.BoxGeometry());
  const rounded = own(new THREE.CylinderGeometry(.86, 1, 1, 7));

  function paper(color) {
    if (!swatches.has(color)) {
      swatches.set(color, own(new THREE.MeshStandardMaterial({ color, roughness: .92 })));
    }
    return swatches.get(color);
  }

  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function solid(parent, color, width, height, depth, x, y, z, geometry = box) {
    const object = mesh(parent, geometry, paper(color), x, y, z);
    object.scale.set(width, height, depth);
    object.receiveShadow = true;
    return object;
  }

  function group(parent, name, x, y, z) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function canvasTexture(width, height, draw) {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    draw(canvas.getContext('2d'));
    const map = own(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }

  const sunDirection = new THREE.Vector3(.22, .20, -1).normalize();
  const sky = mesh(scene, own(new THREE.SphereGeometry(94, 28, 16)), own(new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sun: { value: sunDirection },
      rim: { value: new THREE.Color('#f8d29a') },
      zenith: { value: new THREE.Color('#c78b72') },
      haze: { value: new THREE.Color('#ffbb79') },
      disk: { value: new THREE.Color('#ffedb8') },
    },
    vertexShader: `
      varying vec3 ray;
      void main() {
        ray = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 sun, rim, zenith, haze, disk;
      varying vec3 ray;
      void main() {
        vec3 direction = normalize(ray);
        float rise = smoothstep(-.055, .63, direction.y);
        float angle = length(direction - sun);
        vec3 color = mix(rim, zenith, rise);
        color = mix(color, haze, .42 * exp(-angle * 3.9));
        color = mix(color, disk, .77 * exp(-angle * 20.0));
        color = mix(color, disk, 1.0 - smoothstep(.033, .038, angle));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })), 0, 0, -20);
  sky.name = 'late-afternoon-paper-sky';
  sky.renderOrder = -100;

  scene.add(new THREE.HemisphereLight('#fff3df', '#b78376', 1.76));
  const fill = new THREE.DirectionalLight('#ffdfb3', .65);
  fill.position.set(-3, 8, 6);
  scene.add(fill);
  const sun = new THREE.DirectionalLight('#ffcc89', 2.16);
  sun.position.set(6, 10, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 35 });
  sun.shadow.normalBias = .022;
  sun.shadow.bias = -.00024;
  scene.add(sun, sun.target);

  const grain = canvasTexture(256, 256, (ink) => {
    ink.fillStyle = '#e9e3d9';
    ink.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14000; i++) {
      ink.fillStyle = i % 5 === 0 ? '#e0d7c9' : i % 3 === 0 ? '#f4ede2' : '#e7e0d6';
      ink.fillRect(range(0, 256), range(0, 256), range(.6, 2.8), range(.45, 1.1));
    }
    for (let i = 0; i < 29; i++) {
      ink.strokeStyle = i % 2 ? '#e3d9cd' : '#ede6db';
      ink.beginPath();
      const x = range(0, 256), y = range(0, 256);
      ink.moveTo(x, y);
      ink.lineTo(x + range(1, 7), y + range(-2, 2));
      ink.stroke();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;

  const mulch = own(new THREE.PlaneGeometry(42, 92, 22, 46).rotateX(-PI / 2));
  const groundPositions = mulch.getAttribute('position');
  const groundColors = [];
  const colors = ['#76503c', '#946043', '#895039', '#ab7145', '#aa6946'].map((ink) => new THREE.Color(ink));
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i);
    const z = groundPositions.getZ(i);
    const embankment = THREE.MathUtils.smoothstep(Math.abs(x), 4, 13);
    groundPositions.setY(i, embankment * (.46 + .34 * Math.sin(z * .34 + x * .41) + range(0, .58)));
    const color = colors[Math.floor(random() * colors.length)];
    groundColors.push(color.r, color.g, color.b);
  }
  mulch.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));
  mulch.computeVertexNormals();
  const forestFloor = mesh(scene, mulch, own(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, map: grain,
  })), 0, -.028, -22);
  forestFloor.receiveShadow = true;

  function ribbon(width, elevation, colors) {
    const vertices = [], tones = [], uv = [], faces = [];
    const count = colors.length;
    for (let i = 0; i <= 142; i++) {
      const z = 7.6 - i * .50;
      for (let j = 0; j < count; j++) {
        const side = 2 * j / (count - 1) - 1;
        const spread = .07 * Math.sin(z * .64) + .045 * Math.sin(z * 2.13 - side) + .025 * Math.cos(z * 5.3 + side);
        const x = (width + spread) * side + .037 * Math.sin(z * .72);
        vertices.push(x, elevation, z);
        const color = colors[j].clone().multiplyScalar(range(.94, 1.06));
        tones.push(color.r, color.g, color.b);
        uv.push(x / 1.9, z / 1.9);
        if (i < 142 && j < count - 1) {
          const a = i * count + j;
          faces.push(a, a + 1, a + count, a + 1, a + count + 1, a + count);
        }
      }
    }
    const geometry = own(new THREE.BufferGeometry());
    geometry.setIndex(faces);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(tones, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const material = own(new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 1 }));
    const path = mesh(scene, geometry, material);
    path.receiveShadow = true;
    return path;
  }

  const palette = (inks) => inks.map((ink) => new THREE.Color(ink));
  ribbon(2.49, -.002, palette(['#9e6146', '#b88355', '#a06a46'])).name = 'paper-avenue-deckled-edge';
  ribbon(2.31, .009, palette(['#b58052', '#c79460', '#cfa26b', '#d8af79', '#d0a670', '#c0915e', '#b47d54'])).name = 'paper-avenue';

  const shadowTexture = canvasTexture(96, 96, (ink) => {
    const shade = ink.createRadialGradient(48, 48, 5, 48, 48, 47);
    shade.addColorStop(0, 'rgba(63,32,31,.81)');
    shade.addColorStop(.47, 'rgba(68,37,32,.45)');
    shade.addColorStop(1, 'rgba(74,39,31,0)');
    ink.fillStyle = shade;
    ink.fillRect(0, 0, 96, 96);
  });

  const shadowGeometry = own(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2));
  const shadowMaterials = new Map();
  function shade(parent, x, z, width, depth, angle, opacity) {
    if (!shadowMaterials.has(opacity)) {
      shadowMaterials.set(opacity, own(new THREE.MeshBasicMaterial({
        map: shadowTexture, transparent: true, depthWrite: false, opacity,
      })));
    }
    const patch = mesh(parent, shadowGeometry, shadowMaterials.get(opacity), x, .017, z);
    patch.rotation.y = angle;
    patch.scale.set(width, 1, depth);
    return patch;
  }

  const forest = populateAutumnForest(scene, own, reducedMotion);
  for (const [x, z, radius] of forest.treeRoots) {
    if (Math.abs(x) > 5.4) continue;
    shade(scene, x - .17, z + .17, radius * 7.2, radius * 5.8, -.5, .56);
    shade(scene, x - 1.77, z + 1.56, radius * 14, radius * 7.6, -.53, .29);
  }

  const pebbleColors = ['#977257', '#9c7558', '#b68b65', '#ae815a', '#c7a078'];
  const paved = own(new THREE.InstancedMesh(rounded, paper('#ffffff'), 514));
  const pebble = new THREE.Object3D();
  const pebbleInk = new THREE.Color();
  for (let i = 0; i < paved.count; i++) {
    const side = i % 2 ? 1 : -1;
    const width = range(.03, .14);
    pebble.position.set(side * range(2.09, 2.71), range(.005, .025), range(-54, 7.5));
    pebble.rotation.set(range(-.16, .16), range(-PI, PI), 0);
    pebble.scale.set(width, range(.018, .062), width * range(.48, 1));
    pebble.updateMatrix();
    paved.setMatrixAt(i, pebble.matrix);
    paved.setColorAt(i, pebbleInk.set(pebbleColors[i % pebbleColors.length]));
  }
  paved.receiveShadow = true;
  paved.name = 'avenue-edge-stones';
  scene.add(paved);

  const beam = own(new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { amber: { value: new THREE.Color('#ffd39c') } },
    vertexShader: `
      varying vec2 cursor;
      void main() {
        cursor = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 cursor;
      uniform vec3 amber;
      void main() {
        float feather = pow(max(0.0, 1.0 - abs(cursor.x * 2.0 - 1.0)), 2.15);
        float fade = smoothstep(.03, .33, cursor.y) * (1.0 - smoothstep(.62, 1.0, cursor.y));
        gl_FragColor = vec4(amber, feather * fade * .104);
        #include <colorspace_fragment>
      }
    `,
  }));
  const sunshafts = [];
  for (let i = 0; i < 15; i++) {
    const z = -1.9 - i * 3.82 + range(-.43, .46);
    const x = range(-1.08, 2.7);
    const w = range(.76, 1.44);
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex([0, 1, 2, 1, 3, 2]);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      x - w, .08, z + 1.45, x + w, .08, z + 1.45,
      x + 3.05, 7.1, z - 2.7, x + 3.37, 7.1, z - 2.7,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    sunshafts.push(geometry);
  }
  mesh(scene, own(mergeGeometries(sunshafts)), beam).name = 'canopy-sunshafts';
  for (const shaft of sunshafts) shaft.dispose();

  function plaque(parent, title, subtitle, x, y, z, width, height) {
    const texture = canvasTexture(512, 300, (ink) => {
      const wash = ink.createLinearGradient(0, 0, 512, 300);
      wash.addColorStop(0, '#f6dec0');
      wash.addColorStop(1, '#dcb68f');
      ink.fillStyle = wash;
      ink.fillRect(0, 0, 512, 300);
      for (let i = 0; i < 1800; i++) {
        ink.fillStyle = i % 3 ? '#e9caa6' : '#f6e1c6';
        ink.fillRect(range(0, 512), range(0, 300), range(.7, 4), .62);
      }
      ink.strokeStyle = '#a76b52';
      ink.lineWidth = 3;
      ink.strokeRect(13, 13, 486, 274);
      ink.strokeStyle = '#c58c6a';
      ink.lineWidth = 1.5;
      ink.strokeRect(22, 22, 468, 256);
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.fillStyle = '#61352d';
      ink.font = '700 75px "Noto Serif CJK SC", "Songti SC", SimSun, serif';
      ink.fillText(title, 256, 132, 425);
      ink.fillStyle = '#86563f';
      ink.font = '500 33px "Noto Serif CJK SC", "Songti SC", SimSun, serif';
      ink.fillText(subtitle, 256, 223, 420);
    });
    texture.anisotropy = 4;
    return mesh(parent, own(new THREE.PlaneGeometry(width, height)), own(new THREE.MeshBasicMaterial({
      map: texture,
    })), x, y, z);
  }

  const paintedWood = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 }));
  function joinBenchParts(root, parts, castShadow) {
    const components = parts.filter((part) => part.castShadow === castShadow).map((part) => {
      part.updateMatrix();
      const geometry = part.geometry.clone().applyMatrix4(part.matrix);
      const color = part.material.color;
      const colors = Array.from({ length: geometry.getAttribute('position').count }, () => color.toArray()).flat();
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      part.removeFromParent();
      return geometry;
    });
    const body = mesh(root, own(mergeGeometries(components)), paintedWood);
    body.castShadow = castShadow;
    body.receiveShadow = true;
    for (const geometry of components) geometry.dispose();
  }

  const benches = BENCH_TITLES.map((title, i) => {
    const side = i % 2 ? 1 : -1;
    const root = group(scene, `autumn-bench-${i + 1}`, side * 2.55, 0, -6 * (i + 1));
    root.rotation.y = -side * (PI / 2 - .2);
    root.userData.index = i;
    shade(root, 0, .07, 2.17, 1.52, .02, .49);
    const parts = [];
    const part = (...args) => {
      const object = solid(root, ...args);
      parts.push(object);
      return object;
    };
    part('#b08b66', .98, .04, .49, 0, .024, .016, rounded);

    const woodColors = ['#994c32', '#a65a39', '#b46a45', '#a35839'];
    for (const position of [-.59, .59]) {
      const support = part('#58413a', .105, .474, .105, position, .246, .251);
      support.rotation.x = -.105;
      const brace = part('#674237', .102, .97, .10, position, .507, -.211);
      brace.rotation.x = -.107;
      part('#674237', .13, .075, .60, position, .385, .035);
      part('#875236', .13, .075, .62, position * 1.17, .685, .027).rotation.x = -.074;
      part('#634132', .062, .265, .062, position * 1.17, .549, .236).rotation.x = .15;
    }
    for (let j = 0; j < 4; j++) {
      const slat = part(woodColors[j], 1.48, .072, .13, 0, .446, -.231 + j * .153);
      slat.castShadow = true;
    }
    for (let j = 0; j < 3; j++) {
      const slat = part(woodColors[j], 1.47, .114, .075, 0, .63 + j * .137, -.226 - j * .024);
      slat.rotation.x = -.125;
      slat.castShadow = true;
      for (const x of [-.57, .57]) {
        const peg = part('#dbac78', .014, .015, .014, x, .63 + j * .137, -.184 - j * .024);
        peg.rotation.z = .45;
      }
    }
    joinBenchParts(root, parts, false);
    joinBenchParts(root, parts, true);

    const frontPlate = group(root, `autumn-bench-plaque-${i + 1}`, side * .91, .68, .42);
    frontPlate.rotation.y = -.08 * side;
    solid(frontPlate, '#82513a', .067, .69, .053, 0, -.29, 0).rotation.z = side * .08;
    solid(frontPlate, '#9a6846', .475, .27, .058, 0, .07, .011);
    plaque(frontPlate, title, '秋日长椅', 0, .07, .044, .439, .243);

    const highlight = mesh(root, own(new THREE.RingGeometry(.91, .938, 44).rotateX(-PI / 2)), own(new THREE.MeshBasicMaterial({
      color: '#ffe4a4', transparent: true, opacity: .9, depthWrite: false,
    })), 0, .063, .076);
    highlight.name = `autumn-bench-highlight-${i + 1}`;
    highlight.scale.set(1.10, 1, .72);
    highlight.visible = false;
    return { root, highlight };
  });

  function exitSign(key, z, turn) {
    const root = group(scene, `autumn-exit-post-${key}`, 1.88, 0, z);
    root.rotation.y = turn;
    shade(root, 0, .03, 1.05, 1.1, .5, .49);
    solid(root, '#6c4938', .106, 1.20, .108, 0, .60, 0).rotation.z = -.035;
    solid(root, '#8d5a40', .79, .49, .125, -.037, 1.02, 0);
    solid(root, '#ac7955', .83, .075, .148, -.037, 1.289, 0).rotation.z = -.023;
    const front = plaque(root, '返回绘本', key === 'entrance' ? '大道入口' : '大道尽头', -.037, 1.029, .072, .74, .451);
    front.name = `autumn-exit-${key}`;
    front.userData.exit = key;
    const back = mesh(front, front.geometry, front.material, 0, 0, -.144);
    back.rotation.y = PI;
    for (const side of [-1, 1]) {
      solid(root, '#ddb284', .03, .036, .018, side * .347 - .037, .827, .066).rotation.z = .26;
      const stone = solid(root, '#897160', .23, .10, .15, side * .23, .038, .028, rounded);
      stone.rotation.set(.15, side * .81, .29);
    }
    return front;
  }

  const exitSigns = { entrance: exitSign('entrance', .0, -.4), end: exitSign('end', -40.35, -.27) };
  const player = createCharacter('girl');
  player.root.position.z = .25;
  scene.add(player.root);
  const footShade = shade(scene, 0, .25, .74, .51, .3, .56);

  function update(dt = 0) {
    forest.update(Math.min(Math.max(0, dt), .1));
    const { x, z } = player.root.position;
    footShade.position.set(x + .035, .021, z + .05);
    sun.target.position.set(0, 0, z - 4);
    sun.position.set(6, 10, z - 12);
    sun.target.updateMatrixWorld();
  }

  return {
    scene, camera, player, benches, exitSigns, update,
    dispose() {
      player.dispose();
      sun.shadow.dispose();
      scene.clear();
      for (const resource of owned) resource.dispose();
      owned.clear();
    },
  };
}
