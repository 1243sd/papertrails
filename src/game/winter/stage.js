import * as THREE from 'three';
import { createChristmasTree } from '../christmas-tree.js';
import { loadTreasureSprites } from '../treasure-companions.js';
import { CONFIG } from '../../core/config.js';
import { mulberry32 } from '../../core/rng.js';
import { createWinterPaper, polygon, roundedSheet } from './paper.js';

export function createWinterStage({ assets, materials }) {
  const scene = new THREE.Scene();
  scene.name = 'winter-storybook';
  scene.background = new THREE.Color('#15253e');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const paper = createWinterPaper(materials);
  const owned = new Set();
  const basicMaterials = new Map();
  const random = mulberry32(2452);
  let disposed = false;

  function basic(color) {
    if (!basicMaterials.has(color)) {
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      basicMaterials.set(color, material);
      owned.add(material);
    }
    return basicMaterials.get(color);
  }

  function group(parent, name, x = 0, y = 0, z = 0) {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    owned.add(geometry);
    const node = new THREE.Mesh(geometry, material);
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  function box(parent, color, w, h, d, x, y, z) {
    return mesh(parent, new THREE.BoxGeometry(w, h, d), paper.paper({ color }), x, y, z);
  }

  function cut(parent, points, color, x, y, z, thickness = 0.04) {
    return mesh(parent, new THREE.ExtrudeGeometry(polygon(points), { depth: thickness, bevelEnabled: false }),
      paper.paper({ color }), x, y, z);
  }

  function sheet(parent, color, w, d, h, x, y, z, radius = 0.18) {
    const geometry = new THREE.ExtrudeGeometry(roundedSheet(w, d, radius), { depth: h, bevelEnabled: false, curveSegments: 5 });
    geometry.rotateX(-Math.PI / 2);
    return mesh(parent, geometry, paper.paper({ color }), x, y, z);
  }

  function page(parent, color, side, w, d, h, y, z, curl) {
    const geometry = new THREE.BoxGeometry(w, h, d, 28, 1, 12);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) * side / w + .5;
      const v = p.getZ(i) / d + .5;
      const corners = Math.abs(2 * v - 1) ** 12;
      const edge = u ** 4;
      const curve = .72 * Math.sin(u * Math.PI * .91) + .24 * u ** 6;
      p.setXYZ(i,
        side * (w * u - .17 * edge * corners),
        p.getY(i) + h / 2 + curl * curve * (.82 + .25 * v),
        p.getZ(i) - .24 * u * (2 * v - 1) + .12 * Math.sin(Math.PI * u));
    }
    geometry.computeVertexNormals();
    return mesh(parent, geometry, paper.paper({ color }), 0, y, z);
  }

  function shadow(parent, x, z, w, d, y = 0.015, opacity = 0.21) {
    const material = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: opacity } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float opacity; varying vec2 vUv; void main() { float falloff = 1.0 - smoothstep(.05, .5, length(vUv - .5)); gl_FragColor = vec4(.10, .15, .25, falloff * opacity); }',
      transparent: true, depthWrite: false,
    });
    owned.add(material);
    const shade = mesh(parent, new THREE.PlaneGeometry(w, d), material, x, y, z);
    shade.rotation.x = -Math.PI / 2;
  }

  scene.add(new THREE.HemisphereLight('#f9edda', '#829cc6', 1.55));
  const key = new THREE.DirectionalLight('#ffd9a4', 1.58);
  key.position.set(-6, 10, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#abcdf7', 1.28);
  rim.position.set(5, 5, -8);
  scene.add(rim);

  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { upper: { value: new THREE.Color('#111e45') }, lower: { value: new THREE.Color('#62748b') } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 upper, lower;
      varying vec2 vUv;
      void main() {
        vec3 color = mix(lower, upper, smoothstep(.23, .46, vUv.y));
        float horizon = exp(-pow((vUv.y - .34) * 20.0, 2.0)) * exp(-pow((vUv.x - .49) * 6.0, 2.0));
        color += vec3(.042, .020, .018) * horizon;
        float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(color * (.95 + .09 * grain), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  owned.add(skyMaterial);
  mesh(scene, new THREE.PlaneGeometry(92, 59), skyMaterial, 0, 8, -31);

  const moon = group(scene, 'paper-moon', -6.8, 3.28, -11.8);
  const glow = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.65 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float opacity; varying vec2 vUv; void main() { gl_FragColor = vec4(1., .83, .58, pow(max(0., 1. - 2. * length(vUv - .5)), 2.2) * opacity); }',
    transparent: true, depthWrite: false,
  });
  owned.add(glow);
  mesh(moon, new THREE.PlaneGeometry(5.2, 5.2), glow, 0, 0, -0.08);
  mesh(moon, new THREE.CircleGeometry(0.73, 48), basic('#f8dfac'), 0, 0, 0.02);
  mesh(moon, new THREE.CircleGeometry(0.66, 48), basic('#ffebbd'), -0.03, 0.05, 0.03);
  for (const [x, y, r] of [[-0.25, 0.23, 0.12], [0.28, -0.17, 0.095], [-0.12, -0.34, 0.065]]) {
    mesh(moon, new THREE.CircleGeometry(r, 20), basic('#ecd2a5'), x, y, 0.04);
  }

  const starlight = [];
  const starDots = [];
  const starColors = [];
  for (let i = 0; i < 105; i++) {
    const x = (random() - 0.5) * 45;
    const y = 1.0 + random() * 8.5;
    const r = 0.018 + random() * 0.035;
    if (i % 10 === 0) {
      const points = Array.from({ length: 8 }, (_, j) => {
        const angle = j * Math.PI / 4;
        const radius = j % 2 ? r * 0.48 : r * 2.7;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius * 1.3];
      });
      starlight.push(mesh(scene, new THREE.ShapeGeometry(polygon(points)), basic('#ffe1a6'), x, y, -19));
    } else {
      starDots.push(x, y, -19);
      starColors.push(...new THREE.Color(i % 3 ? '#a9c9db' : '#f3d7ac').toArray());
    }
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starDots, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({ size: .057, vertexColors: true, transparent: true, opacity: .78 });
  owned.add(starGeometry);
  owned.add(starMaterial);
  scene.add(new THREE.Points(starGeometry, starMaterial));

  const clouds = [];
  for (const [x, y, z, size] of [[-8.4, 3.25, -10.8, 1.25], [6.3, 4.7, -12.1, 1.6], [12, 4.1, -10.5, 1.25], [-2.3, 7.25, -16, 0.70]]) {
    const cloud = group(scene, 'paper-cloud', x, y, z);
    cloud.scale.setScalar(size);
    const profile = new THREE.Shape();
    profile.moveTo(-1.34, 0); profile.bezierCurveTo(-1.7, .1, -1.4, .35, -.96, .34);
    profile.bezierCurveTo(-.91, .72, -.31, .76, -.08, .49);
    profile.bezierCurveTo(.06, .63, .49, .57, .63, .34);
    profile.bezierCurveTo(1.18, .41, 1.62, .07, 1.23, .01);
    profile.quadraticCurveTo(0, -.09, -1.34, 0);
    mesh(cloud, new THREE.ShapeGeometry(profile, 12), basic('#677f9d'), 0, -.071, -.04);
    mesh(cloud, new THREE.ShapeGeometry(profile, 12), basic('#94a5b9'), .048, -.035, -.02);
    mesh(cloud, new THREE.ShapeGeometry(profile, 12), basic('#bcc4cc'), 0, 0, 0);
    clouds.push({ cloud, x });
  }

  const ridgeColors = ['#536e8f', '#486683', '#395973', '#293f57'];
  for (let row = 0; row < ridgeColors.length; row++) {
    const z = -16 + 2 * row;
    const base = -55;
    const points = [[-31, base], [-31, 0]];
    for (let col = 0; col < 14; col++) {
      const x = -30 + col * 4.65 + (random() - .5) * 1.8;
      const peak = 1.43 + random() * 2.15 - row * .47;
      points.push([x, peak], [x + 1.65, peak - .78 - random() * .72], [x + 2.8, peak - 1.32]);
    }
    points.push([32, base]);
    mesh(scene, new THREE.ShapeGeometry(polygon(points)), basic(ridgeColors[row]), 0, 0, z);
    if (row < 2) {
      for (let j = 2; j < points.length - 1; j += 3) {
        const [x, y] = points[j];
        mesh(scene, new THREE.ShapeGeometry(polygon([[0, 0], [1.0, -.61], [.42, -.48], [.14, -.65], [-.14, -.44], [-.77, -.49]])),
          basic(row ? '#68859c' : '#89a7b9'), x, y, z + .018);
      }
    }
  }

  function groundY(x, z) {
    const rise = .62 * Math.exp(-(((z + 5.6) / 2.9) ** 2)) * (.86 + .13 * Math.cos(x * .49));
    return -.465 + rise + .036 * Math.sin(z * .56) * Math.sin(x * .39);
  }
  const ground = new THREE.PlaneGeometry(98, 24, 110, 66).rotateX(-Math.PI / 2).translate(0, 0, 2);
  const soil = ground.attributes.position;
  const snowInk = new THREE.Color();
  const snowBlue = new THREE.Color('#5b789a');
  const snowCream = new THREE.Color('#c1d3df');
  const hues = [];
  for (let i = 0; i < soil.count; i++) {
    const x = soil.getX(i), z = soil.getZ(i);
    soil.setY(i, groundY(x, z));
    const clearing = Math.exp(-((x / 7.2) ** 4)) * (.76 + .17 * Math.cos(z * .22));
    const damp = .045 * Math.sin(x * 1.8 + z * .9) * Math.cos(z * 2.1);
    const trail = .18 * Math.exp(-((x - Math.sin(z * .82) * .31) ** 2) * .95) * Math.exp(-((z - 2.8) ** 2) * .14);
    snowInk.copy(snowBlue).lerp(snowCream, THREE.MathUtils.clamp(clearing + damp + trail, 0, 1));
    hues.push(snowInk.r, snowInk.g, snowInk.b);
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(hues, 3));
  ground.computeVertexNormals();
  mesh(scene, ground, paper.paper({ color: '#b9ced9', vary: false, fibre: 'world' })).name = 'continuous-snowfield';
  shadow(scene, 0, .10, 10.8, 5.6, -.421, .66);

  const book = group(scene, 'storybook');
  book.position.y = -.055;
  book.scale.z = .72;
  const covers = [-1, 1].map((side) => {
    const hinge = group(book, side < 0 ? 'left-cover' : 'right-cover', 0, -.40);
    sheet(hinge, '#762f40', 4.5, 5.95, .14, side * 2.24, 0, .22);
    sheet(hinge, '#aa5763', 4.38, 5.81, .04, side * 2.21, .145, .22);
    sheet(hinge, '#d09961', 4.31, 5.73, .02, side * 2.17, .176, .22);
    return { hinge, side };
  });
  box(book, '#733344', .38, .23, 5.94, 0, -.34, .22);
  for (const z of [-2.54, 2.96]) box(book, '#d2936c', .41, .24, .07, 0, -.334, z);

  const leaves = [-1, 1].map((side) => {
    const hinge = group(book, side < 0 ? 'left-page' : 'right-page', 0, -.018);
    for (let j = 0; j < 13; j++) {
      const fan = j / 12;
      page(hinge, ['#cfaf88', '#f1ddba', '#d8bc94', '#e9cfaa'][j % 4], side,
        4.34 - fan * .30, 5.72 - fan * .19, .021, -.255 + j * .020, .23 - fan * .09, .10 + .40 * fan);
    }
    page(hinge, '#f7e8c7', side, 4.05, 5.51, .027, .003, .13, .54);
    page(hinge, side < 0 ? '#e4e9dc' : '#e7ece0', side, 3.75, 4.67, .017, .034, -.22, .50);
    return { hinge, side };
  });
  box(book, '#b7ac91', .083, .013, 5.47, 0, .025, .18);

  const snow = group(book, 'snow-covered-spread');
  function drift(x, z, w, d, color = '#e5ede5') {
    const rock = mesh(snow, new THREE.SphereGeometry(1, 16, 7), paper.paper({ color }), x, .046, z);
    rock.position.y += Math.abs(x) * .092;
    rock.scale.set(w, .088 + Math.abs(x) * .018, d);
  }
  for (const [x, z, w, d] of [[-2.6,-1.95,1.36,.48],[2.35,-1.94,1.52,.46],[-2.64,1.38,1.35,.90],[2.45,1.7,1.39,.44],[0,.62,1.47,1.32],[-1.98,-.17,1.61,1.19],[2.28,-.44,1.55,1.16]]) drift(x,z,w,d);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 22; i++) {
      const x = side * (.28 + i * .163);
      const u = Math.abs(x) / 4.05;
      const fleck = mesh(book, new THREE.CircleGeometry(i % 5 === 0 ? .029 : .013, 6), basic('#af886d'), x,
        .027 + .54 * (.72 * Math.sin(Math.PI * u * .91) + .24 * u ** 6), 2.65 - .22 * u + .12 * Math.sin(Math.PI * u));
      fleck.rotation.x = -Math.PI / 2;
    }
  }

  const village = [];
  const chimneys = [];
  const windows = [];
  const villageLayer = group(scene, 'winter-village-layer', 0, 0, -4);
  const woods = group(scene, 'winter-woodland');
  const nativeCedar = assets.getTilePrototype('snow_pines').getObjectByName('pine_a');
  const warmPools = [];

  function stand(name, x, z, delay, parent = book) {
    const u = Math.min(1, Math.abs(x) / 4.05);
    const y = parent === book ? .105 + .34 * Math.sin(u * Math.PI * .91) : groundY(x, parent.position.z + z) + .016;
    const pivot = group(parent, name + '-fold', x, y, z);
    village.push({ pivot, delay });
    return pivot;
  }

  function cabin(x, z, s, wall, roof, turn) {
    shadow(villageLayer, x, z, 2.13 * s, 1.48 * s, groundY(x, z - 4) + .045, .33);
    const house = stand('paper-cabin', x, z, .18 + (x + 6) * .035, villageLayer);
    const root = group(house, 'cabin');
    root.scale.setScalar(s);
    root.rotation.y = turn;
    box(root, wall, 1.29, .75, .89, 0, .41, 0);
    cut(root, [[-.65,.74],[.65,.74],[0,1.31]], wall, 0, 0, -.45, .9);
    for (const side of [-1, 1]) {
      box(root, '#533d49', .075, .72, .027, side * .583, .414, .461);
      const r = box(root, roof, .96, .085, 1.16, side * .358, 1.047, 0);
      r.rotation.z = -side * .71;
      const snowCap = box(root, '#edf4ed', .94, .055, 1.18, side * .358, 1.113, -.01);
      snowCap.rotation.z = r.rotation.z;
      const snowLip = cut(root, [[-.46,0],[-.31,-.025],[-.18,-.054],[-.09,-.019],[.03,-.071],
        [.17,-.032],[.29,-.063],[.46,-.019],[.46,.047],[-.46,.047]], '#eef2e6', side * .358, 1.095, .588, .035);
      snowLip.rotation.z = r.rotation.z;
      box(root, '#633e41', .28, .31, .037, side * .35, .409, .458);
      const pane = mesh(root, new THREE.PlaneGeometry(.205, .23), basic('#ffd99a'), side * .35, .41, .486);
      windows.push(pane);
      box(root, '#9e6651', .025, .232, .018, side * .35, .41, .50);
      box(root, '#9e6651', .205, .023, .018, side * .35, .41, .50);
      mesh(root, new THREE.PlaneGeometry(.67, .65), glow, side * .35, .41, .516);
      box(root, '#e4c8a3', .30, .035, .068, side * .35, .241, .50);
    }
    box(root, '#623b47', .25, .47, .05, 0, .266, .468);
    box(root, '#edd49b', .043, .045, .02, .072, .25, .50);
    mesh(root, new THREE.TorusGeometry(.084, .022, 6, 16), paper.paper({ color: '#47675b' }), 0, .99, .464);
    mesh(root, new THREE.OctahedronGeometry(.029), paper.paper({ color: '#b54e51' }), 0, .925, .485);
    box(root, '#684853', .22, .39, .21, .34, 1.21, -.24);
    box(root, '#dce7e1', .27, .055, .26, .34, 1.421, -.24);
    chimneys.push({ root, origin: new THREE.Vector3(.34, 1.46, -.24) });
    warmPools.push([x, groundY(x, z - 4) + .42, z - 3.36, 1.25]);
  }

  for (const [x, z] of [[-1.78,.59],[1.36,.81]]) {
    const lamp = stand('paper-lantern', x, z, .44);
    box(lamp, '#5f4652', .067, .69, .067, 0, .35, 0);
    box(lamp, '#694759', .265, .056, .265, 0, .68, 0);
    mesh(lamp, new THREE.BoxGeometry(.18, .22, .18), basic('#ffd99a'), 0,.812,0);
    mesh(lamp, new THREE.ConeGeometry(.19, .16, 4).rotateY(Math.PI / 4), paper.paper({ color: '#8e555d' }), 0,.977,0);
    const halo = mesh(lamp, new THREE.PlaneGeometry(.91, .91), glow, 0, .80, .135);
    halo.name = 'lantern-glow';
  }

  const heartOutline = new THREE.Shape();
  heartOutline.moveTo(0,-.16);
  heartOutline.bezierCurveTo(-.15,-.075,-.23,.02,-.14,.108);
  heartOutline.bezierCurveTo(-.08,.16,-.02,.113,0,.078);
  heartOutline.bezierCurveTo(.03,.12,.105,.157,.154,.098);
  heartOutline.bezierCurveTo(.217,.015,.14,-.08,0,-.16);
  mesh(book, new THREE.ExtrudeGeometry(heartOutline, {depth:.027, bevelEnabled:false, curveSegments: 8}),
    paper.paper({ color: '#b34c59' }), 0,-.18,3.186);

  const leavesOnStem = polygon([[0,0],[.12,.065],[.25,.082],[.18,.16],[.08,.12]]);
  const leafGeometry = new THREE.ExtrudeGeometry(leavesOnStem, { depth: .012, bevelEnabled: false });
  const berryGeometry = new THREE.SphereGeometry(.051, 8, 6);
  owned.add(leafGeometry);
  owned.add(berryGeometry);
  function sprig(parent, x, y, z, scale, turn) {
    const sprig = group(parent, 'paper-holly', x, y, z);
    sprig.scale.setScalar(scale);
    sprig.rotation.z = turn;
    const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(-.035, .24, 0), new THREE.Vector3(.04, .52, 0)]);
    mesh(sprig, new THREE.TubeGeometry(stem, 9, .011, 5, false), paper.paper({ color: '#865c5f' }));
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1;
      const leaf = new THREE.Mesh(leafGeometry, paper.paper({ color: i % 2 ? '#627f72' : '#45695c' }));
      leaf.position.set(0, .07 + i * .079, .017);
      leaf.scale.set(side, 1, 1);
      sprig.add(leaf);
    }
    for (const [x, y] of [[0,.31],[.09,.40],[-.067,.42],[.04,.53]]) {
      const berry = new THREE.Mesh(berryGeometry, paper.paper({ color: '#b94858' }));
      berry.position.set(x, y, .031);
      sprig.add(berry);
    }
  }
  for (const side of [-1, 1]) {
    sprig(book, side * 3.52, .40, 2.32, .68, side * -.68);
    for (let i = 0; i < 4; i++) {
      const x = side * (3.95 + i * .41);
      const z = 2.45 + i * .58;
      sprig(scene, x, groundY(x, z), z, .66 + i * .18, side * (.16 + i * .08));
    }
  }

  function pine(x, z, size, grove = villageLayer) {
    const root = grove === woods
      ? group(woods, 'forest-cedar', x, groundY(x, z), z)
      : stand('paper-cedar', x, z, .12 + (z + 1.5) * .13, grove);
    root.scale.set(size, size, size);
    if (nativeCedar) {
      const model = paper.model(nativeCedar);
      model.position.set(0, 0, 0);
      const bounds = new THREE.Box3().setFromObject(model);
      model.scale.multiplyScalar(1.66 / Math.max(.15, bounds.max.y - bounds.min.y));
      model.position.y = -bounds.min.y * model.scale.y;
      root.add(model);
      return root;
    }
    box(root, '#906956', .13, .49, .18, 0, .26, 0);
    for (let row = 0; row < 4; row++) {
      const w = .60 - row * .087;
      const y = .27 + row * .28;
      const h = .65 - row * .035;
      const width = w * .54;
      cut(root, [[-w,-.033],[-.81*w,.11],[-.66*w,.105],[-.43*w,.29],[-.27*w,.28],[0,h],[0,.018]],
        ['#244f4c','#31605a','#366b5d','#437767'][row], 0,y,.006);
      cut(root, [[0,.018],[0,h],[.25*w,.31],[.48*w,.32],[.62*w,.17],[.79*w,.17],[w,-.033]], '#5b8879', 0,y,0);
      cut(root, [[-width,h*.47],[-width*.47,h*.68],[0,h],[width*.68,h*.57],[width,h*.43],
        [width*.43,h*.48],[width*.2,h*.39],[0,h*.46],[-width*.41,h*.39]], '#dcebe2', 0,y,.048,.021);
    }
    return root;
  }

  const forestPlots = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 17; i++) {
      const row = Math.floor(i / 6);
      const x = side * (5.95 + (i % 6) * 1.32 + (random() - .5) * .62);
      const z = -7.9 + row * 2.75 + (random() - .5) * 1.18;
      forestPlots.push([x, z, 1.09 + random() * .93]);
    }
    forestPlots.push([side * 6.25, 1.06, 1.58], [side * 7.23, 2.07, 2.24], [side * 5.52, 3.22, 1.80], [side * 4.30, 6.20, 1.94]);
  }
  const cedar = pine(0, 0, 1, woods);
  cedar.position.set(0, 0, 0);
  cedar.updateMatrixWorld(true);
  const placement = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  cedar.traverse((part) => {
    if (!part.isMesh) return;
    const row = new THREE.InstancedMesh(part.geometry, part.material, forestPlots.length);
    forestPlots.forEach(([x, z, scale], i) => {
      placement.position.set(x, groundY(x, z), z);
      placement.rotation.y = Math.sin(i * 7) * .31;
      placement.scale.setScalar(scale);
      placement.updateMatrix();
      row.setMatrixAt(i, matrix.multiplyMatrices(placement.matrix, part.matrixWorld));
    });
    woods.add(row);
    owned.add(row);
  });
  cedar.removeFromParent();
  for (const [x, z, size] of [[-6.9,-.08,1.54],[-5.35,-1.04,1.81],[-3.68,-1.08,1.56],[-2.05,-.65,1.22],[1.95,-.82,1.62],[3.46,-1.3,1.79],[5.48,-1.06,1.47],[7.03,.12,1.35],[-6.24,.92,.99],[6.21,.68,1.0]]) pine(x, z, size);
  cabin(-4.65, .37, 1.29, '#b75e62', '#643b4f', .24);
  cabin(-2.67, .04, .94, '#bb936c', '#764c55', .13);
  cabin(4.31, .32, 1.22, '#73968c', '#4c5768', -.22);
  const hamlet = paper.model(assets.getTilePrototype('snow_hamlet'));
  hamlet.getObjectByName('base')?.removeFromParent();
  hamlet.scale.setScalar(1.22);
  hamlet.rotation.y = -.35;
  stand('snow-hamlet', 6.12, -.24, .53, villageLayer).add(hamlet);
  warmPools.push([6.05, .46, -3.60, 1], [-1.81, .54, .65, 1.05], [1.36, .54, .74, 1.05]);
  paper.warmPools(warmPools);

  const tower = stand('paper-clocktower', -3.19, -1.87, .40, villageLayer);
  box(tower, '#dbb18b', .73, 1.99, .65, 0, .99, 0);
  box(tower, '#e2c39b', .81, .06, .75, 0, 1.95, 0);
  cut(tower, [[-.48,0],[-.22,.36],[-.10,.69],[0,1.02],[.10,.69],[.22,.36],[.48,0]],
    '#914b60', 0, 1.94, .34, .045);
  cut(tower, [[-.50,0],[-.21,.42],[-.08,.71],[0,1.07],[.09,.69],[.04,.57],[-.11,.44],[-.29,.27],[-.34,.09]],
    '#f2eada', 0, 1.98, .395, .035);
  mesh(tower, new THREE.OctahedronGeometry(.093), basic('#ffdc8b'), 0, 3.08, .375);
  box(tower, '#5d3e4c', .29, .37, .035, 0, 1.61, .34);
  mesh(tower, new THREE.PlaneGeometry(.19, .25), basic('#ffd99a'), 0, 1.61, .363);
  mesh(tower, new THREE.PlaneGeometry(.83, .81), glow, 0, 1.61, .385);

  const snowTile = paper.model(assets.getTilePrototype('snow_drifts'));
  snowTile.name = 'snow-drifts-model';
  snowTile.getObjectByName('base')?.removeFromParent();
  snowTile.scale.setScalar(.48);
  stand('snow-drifts', -3.11, .47, .66).add(snowTile);

  const stream = sheet(book, '#7caaa9', 2.28, .74, .016, 2.12, .394, .68, .33);
  stream.rotation.y = -.16;
  const bridge = stand('paper-bridge', 1.92, .79, .40);
  bridge.rotation.y = 1.06;
  for (let i = -4; i <= 4; i++) {
    const z = i * .14;
    const y = .31 - .59 * z * z;
    box(bridge, i % 2 ? '#ad7870' : '#c28c7f', .72, .053, .145, 0, y, z).rotation.x = 1.05 * z;
    for (const side of [-1, 1]) {
      box(bridge, '#714958', .052, .067, .15, side * .36, y + .23, z).rotation.x = 1.05 * z;
      box(bridge, '#e0c28b', .042, .022, .15, side * .36, y + .272, z).rotation.x = 1.05 * z;
      if (i % 2 === 0) box(bridge, '#95606a', .056, .26, .058, side * .36, y + .12, z);
    }
  }
  const tree = createChristmasTree(paper);
  tree.group.getObjectByName('christmas-snow').visible = false;
  const treePedestal = group(scene, 'tree-popup', 0, .111, 0);
  treePedestal.add(tree.group);
  tree.group.scale.setScalar(2.48);
  const star = tree.group.getObjectByName('christmas-star');
  mesh(tree.group, new THREE.PlaneGeometry(.66, .66), glow, 0, star.position.y + .026, .17).name = 'tree-star-halo';
  for (let i = 0; i < 5; i++) {
    const y = .39 + i * .193;
    const r = .545 - i * .095;
    for (const angle of [-1.10, -.37, .34, 1.08]) {
      const frosting = cut(tree.group, [[-.15,0],[-.086,.025],[-.04,.105],[.008,.152],[.059,.103],[.104,.044],[.15,0],
        [.094,-.018],[.02,-.006],[-.049,-.032],[-.103,-.015]], '#d9e7dc', Math.sin(angle) * r * .63,
      y + .092, Math.cos(angle) * r * .67 + .021, .012);
      frosting.scale.setScalar(r / .52);
      frosting.rotation.y = angle;
      frosting.rotation.x = -.44;
    }
  }
  shadow(book, 0, 0, 3.25, 2.62, .15, .43);

  const foreground = group(scene, 'winter-foreground', 0, groundY(0, 3.58), 3.58);
  const traveller = group(foreground, 'winter-traveller', 0, .013, .035);
  traveller.rotation.y = Math.PI;
  const puppet = paper.model(assets.travellerSkins?.get('winter') ?? assets.traveller);
  puppet.traverse((node) => { if (node.name.includes('base_tab')) node.visible = false; });
  puppet.scale.setScalar(2.0);
  traveller.add(puppet);
  shadow(foreground, 0, .09, 1.24, .79, .023, .38);

  const cats = CONFIG.animals.companion.members.map(({ coat }, i) => {
    const side = i === 0 ? -1 : 1;
    const x = side * 1.25;
    const floor = groundY(x, 3.74 + i * .07) - foreground.position.y;
    const root = group(foreground, coat, x, floor + .012, .16 + i * .07);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 192;
    const ink = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .18, side: THREE.DoubleSide });
    owned.add(texture);
    owned.add(material);
    const card = mesh(root, new THREE.PlaneGeometry(1.29, .9675), material, 0, .483, 0);
    card.visible = false;
    root.rotation.y = -side * .46;
    shadow(foreground, x, .16 + i * .07, .92, .62, floor + .025, .31);
    return { root, card, coat, ink, canvas, texture, side, x, pose: '' };
  });
  let sprites;
  function poseCat(cat, pose) {
    if (!sprites || cat.pose === pose) return;
    const { ink, canvas, texture, side, coat } = cat;
    const frame = sprites.frames[coat]?.poses[pose] ?? sprites.frames[coat]?.poses.sit;
    if (!frame) return;
    const { x, y, w, h, ax, footY } = frame;
    const scale = Math.min(.74, 216 / w, 164 / h);
    ink.clearRect(0, 0, canvas.width, canvas.height);
    ink.filter = coat === 'cat_black' ? 'saturate(.42) brightness(.83)' : 'saturate(.48)';
    ink.setTransform(-side, 0, 0, 1, side > 0 ? canvas.width : 0, 0);
    ink.drawImage(sprites.sheet, x, y, w, h, canvas.width / 2 - ax * scale, canvas.height - 2 - footY * scale, w * scale, h * scale);
    ink.resetTransform();
    texture.needsUpdate = true;
    cat.pose = pose;
    cat.card.visible = true;
  }
  const ready = loadTreasureSprites().then((result) => {
    if (disposed || !result) return;
    sprites = result;
    for (const cat of cats) poseCat(cat, 'sit');
  });

  return {
    scene, camera, book, covers, leaves, snow, tree, treePedestal, village, chimneys, windows, foreground,
    traveller, puppet, cats, poseCat, clouds, starlight, glow, ready,
    group, mesh, box, sheet, shadow, basic, owned, random, groundY,
    dispose() {
      disposed = true;
      tree.dispose();
      for (const resource of owned) resource.dispose();
      paper.dispose();
      scene.clear();
    },
  };
}
