import * as THREE from 'three';

const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);
const CANOPY = ['#811d33', '#a92237', '#ba2d3d', '#cf3b42', '#df4a42', '#e85a41', '#ef814b'];
const LITTER = ['#8e3b2c', '#a1422b', '#b84b2b', '#c96432', '#d98a3e', '#e1a354', '#e9bf6b'];
const BARK = ['#492d29', '#5b382b', '#60382c', '#704732', '#825139'];

export function autumnRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function paperFan(outline, fold) {
  const positions = [0, 0, fold];
  const colors = [1, 1, 1];
  const indices = [];
  for (let i = 0; i < outline.length; i++) {
    const [x, y, z] = outline[i];
    const ink = .84 + Math.sin(i * 5.52) * .065;
    positions.push(x, y, z ?? 0);
    colors.push(ink, ink, ink);
    indices.push(0, i + 1, (i + 1) % outline.length + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function mapleGeometry() {
  return paperFan([
    [0, .55, -.02], [.082, .255], [.159, .292, -.018], [.141, .16], [.392, .31, -.092], [.326, .154],
    [.526, .129, -.012], [.439, .032], [.466, -.024], [.215, -.155], [.26, -.271, -.055], [.104, -.252],
    [.025, -.218], [.005, -.424, -.03], [-.028, -.427], [-.034, -.219], [-.119, -.249], [-.265, -.26, -.028],
    [-.211, -.149], [-.457, -.017], [-.426, .035], [-.513, .128, -.063], [-.314, .153], [-.377, .308, -.077],
    [-.135, .169], [-.158, .292, -.016], [-.083, .251],
  ], .057);
}

function crownGeometry() {
  const outline = [];
  for (let i = 0; i < 39; i++) {
    const angle = -i * PI * 2 / 39;
    const scallop = .78 + .19 * Math.sin(angle * 5 + .17) + .11 * Math.cos(angle * 9 + .41);
    const tooth = i % 3 === 1 ? .09 : -.021;
    const radius = scallop + tooth;
    outline.push([Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 5) * .09]);
  }
  return paperFan(outline, .18);
}

export function populateAutumnForest(scene, own, reducedMotion) {
  const random = autumnRandom(9189);
  const range = (min, max) => min + (max - min) * random();
  const pick = (items) => items[Math.floor(random() * items.length)];
  const trunks = [];
  const grooves = [];
  const crowns = [];
  const leaves = [];
  const litter = [];
  const treeRoots = [];
  const barkPositions = [], barkColors = [], barkFaces = [];
  const vector = (x, y, z) => new THREE.Vector3(x, y, z);
  const orientation = new THREE.Quaternion();
  const form = new THREE.Object3D();
  const color = new THREE.Color();

  function branch(list, start, end, radius, width, ink) {
    const direction = end.clone().sub(start);
    const length = direction.length();
    orientation.setFromUnitVectors(UP, direction.normalize());
    const mid = start.clone().lerp(end, .5);
    list.push({ position: mid.toArray(), scale: [radius, length + radius * .36, radius * width], quaternion: orientation.clone(), ink });
  }

  function foldedTrunk(points, radii, bark) {
    const sideCount = 7;
    const first = barkPositions.length / 3;
    const trunkInk = new THREE.Color(bark);
    const tangent = new THREE.Vector3();
    const offset = new THREE.Vector3();
    for (const [index, point] of points.entries()) {
      tangent.copy(points[Math.min(index + 1, points.length - 1)]).sub(points[Math.max(0, index - 1)]).normalize();
      orientation.setFromUnitVectors(UP, tangent);
      for (let side = 0; side < sideCount; side++) {
        const angle = side * PI * 2 / sideCount;
        const radius = radii[index] * (1 + Math.sin(side * 4.17) * .08);
        offset.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * .89).applyQuaternion(orientation);
        barkPositions.push(point.x + offset.x, point.y + offset.y, point.z + offset.z);
        const tint = .76 + .31 * Math.sin(side * 2.08 + .6) ** 2;
        barkColors.push(trunkInk.r * tint, trunkInk.g * tint, trunkInk.b * tint);
        if (index === points.length - 1) continue;
        const a = first + index * sideCount + side;
        const b = first + index * sideCount + (side + 1) % sideCount;
        barkFaces.push(a, a + sideCount, b, b, a + sideCount, b + sideCount);
      }
    }
  }

  function sprig(point, size, stem, shade, detail = 18) {
    const layers = detail < 12 ? 2 : 3;
    for (let index = 0; index < layers; index++) {
      const spread = index === 0 ? .19 : .48;
      const s = size * range(.63, 1.17);
      const ink = CANOPY[Math.min(CANOPY.length - 1, Math.max(0, shade + index - 1))];
      crowns.push({
        position: [point.x + range(-spread, spread), point.y + range(-spread, spread), point.z + (index - 1) * .29],
        rotation: [range(-.58, .66), stem + range(-.65, .65), range(-.48, .48)],
        scale: [s * range(.89, 1.14), s * range(.53, .85), s * 1.15], ink,
      });
    }
    for (let index = 0; index < detail; index++) {
      const a = range(0, PI * 2);
      const r = size * range(.45, 1.23);
      const s = size * range(.078, .235);
      leaves.push({
        position: [point.x + Math.cos(a) * r, point.y + Math.sin(a) * r * .59, point.z + range(-.45, .69)],
        rotation: [range(-1.65, 1.65), range(-1.25, 1.25), range(0, PI * 2)],
        scale: [s, s * range(.75, 1.2), s], ink: pick(CANOPY),
      });
    }
  }

  function tree(x, z, height, radius, side, outer, background = false) {
    treeRoots.push([x, z, radius]);
    const bark = pick(BARK);
    const base = vector(x, background ? .24 : -.10, z);
    const bend = vector(x + side * range(-.29, .24), height * .28, z + range(-.26, .27));
    const knot = vector(bend.x + side * range(-.57, -.10), height * .54, z + range(-.52, .19));
    const stem = vector(knot.x + side * range(-.84, .07), height * .82, z + range(-.64, .09));
    const top = vector(stem.x + side * range(-.69, -.21), height, stem.z + range(-.45, .56));
    foldedTrunk([base, base.clone().lerp(bend, .26), bend, knot, stem, top],
      [radius, radius * .82, radius * .72, radius * .53, radius * .32, radius * .11], bark);
    for (let i = 0; i < 3; i++) {
      const point = base.clone().add(vector(range(-1.8, 1.8) * radius, .04, range(-2.5, 2.5) * radius));
      const pivot = base.clone().lerp(bend, range(.06, .13));
      branch(trunks, pivot, point, radius * range(.53, .66), .66, pick(BARK));
    }
    for (let i = 0; i < (background ? 1 : 4); i++) {
      const theta = i * 1.6 + .4;
      const dx = Math.cos(theta) * radius * .74;
      const dz = Math.sin(theta) * radius * .76;
      const toe = base.clone().add(vector(dx * 1.27, range(.13, .38), dz * 1.34));
      const ridge = bend.clone().add(vector(dx * .64, range(-.23, .12), dz * .64));
      branch(grooves, toe, ridge, radius * .068, .58, i % 2 ? '#956244' : '#402629');
    }

    const foliage = height * range(.198, .233);
    const shade = Math.floor(range(1, 6));
    const detail = background ? 5 : outer ? 12 : 20;
    sprig(top, foliage, .2 * side, shade, detail);
    const count = background ? 4 : outer ? 5 : 7;
    for (let i = 0; i < count; i++) {
      const a = i * 2.42 + range(-.29, .29);
      const start = bend.clone().lerp(stem, range(.32, .73));
      const reach = height * range(.18, .41);
      const lift = height * range(.22, .36);
      const joint = start.clone().add(vector(Math.sin(a) * reach * .59, lift * .6, Math.cos(a) * reach * .54));
      const tip = start.clone().add(vector(Math.sin(a) * reach, lift, Math.cos(a) * reach * .88));
      branch(trunks, start, joint, radius * .42, .84, bark);
      branch(trunks, joint, tip, radius * .255, .83, bark);
      sprig(tip, foliage * range(.64, 1.08), Math.cos(a) * .56, (shade + i) % 5 + 1, detail);
      if (!background && i % 3 === 0) {
        const fork = joint.clone().add(vector(Math.cos(a) * reach * .49, lift * .41, Math.sin(a) * reach * .47));
        branch(trunks, joint, fork, radius * .17, .78, bark);
        sprig(fork, foliage * .64, -Math.cos(a) * .35, shade, detail);
      }
    }
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const z = 7 - i * 3.57 + range(-.74, .76) + (side === 1 ? -1.43 : 0);
      const x = side * range(3.45, 4.61);
      tree(x, z, range(4.95, 7.15), range(.23, .45), side, false);
      tree(side * range(5.3, 9.4), z + range(-2.51, 1.39), range(4.11, 7.05), range(.19, .40), side, true);
      tree(side * range(9.35, 15.5), z + range(-3.03, 1.9), range(4.29, 7.75), range(.21, .40), side, true, true);
    }
    for (let i = 0; i < 63; i++) {
      const height = range(.27, .96);
      const point = vector(side * range(3.78, 12), height, range(-56, 7));
      branch(trunks, vector(point.x - .1, -.04, point.z), point, .046, .88, pick(BARK));
      sprig(point, range(.29, .89), range(-.4, .4), Math.floor(range(0, 4)), 9);
    }
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 16; i++) {
      const z = 9 - i * 4.95 + range(-1.3, 1.3);
      tree(side * range(16, 20.2), z, range(4.85, 7.35), range(.20, .35), side, true, true);
    }
  }

  for (let i = 0; i < 4860; i++) {
    const paved = i % 8 === 0;
    const side = i % 2 ? 1 : -1;
    const edge = 2.08 + Math.pow(random(), 2.45) * 6.8;
    const x = paved ? range(-2.32, 2.32) : side * edge;
    const z = range(-58, 8);
    const size = range(.065, .25) * (paved ? .89 : 1);
    litter.push({
      position: [x, .028 + range(0, .027) * (paved ? .3 : 1), z],
      rotation: [-PI / 2 + range(-.16, .16), range(-.18, .18), range(0, PI * 2)],
      scale: [size, size * range(.72, 1.08), size], ink: pick(LITTER),
    });
  }

  const paper = own(new THREE.MeshStandardMaterial({
    roughness: .94, side: THREE.DoubleSide, vertexColors: true, emissive: '#6d2034', emissiveIntensity: .14,
  }));
  const wood = own(new THREE.MeshStandardMaterial({ roughness: .98, flatShading: true }));
  const bark = own(new THREE.MeshStandardMaterial({ roughness: .98, flatShading: true, vertexColors: true }));
  const maple = own(mapleGeometry());
  const mapleTip = own(paperFan([
    [0, .55], [.11, .17], [.382, .32, -.05], [.33, .14], [.526, .12], [.214, -.14], [.256, -.262],
    [.028, -.204], [0, -.366], [-.031, -.205], [-.254, -.262], [-.212, -.145], [-.52, .12], [-.326, .143], [-.385, .30], [-.11, .17],
  ], .043));
  const crown = own(crownGeometry());
  const woodside = own(new THREE.CylinderGeometry(.67, 1, 1, 7));
  const root = new THREE.Group();
  root.name = 'autumn-layered-maple-groves';
  scene.add(root);

  function applyInstances(mesh, items) {
    items.forEach(({ position, rotation, quaternion, scale, ink }, i) => {
      form.position.fromArray(position);
      form.scale.fromArray(scale);
      if (quaternion) form.quaternion.copy(quaternion);
      else form.rotation.fromArray(rotation);
      form.updateMatrix();
      mesh.setMatrixAt(i, form.matrix);
      if (ink) mesh.setColorAt(i, color.set(ink));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  function instanced(name, geometry, material, items, shadows = false) {
    const mesh = own(new THREE.InstancedMesh(geometry, material, items.length));
    mesh.name = name;
    mesh.castShadow = shadows;
    applyInstances(mesh, items);
    root.add(mesh);
    return mesh;
  }

  const barkGeometry = own(new THREE.BufferGeometry());
  barkGeometry.setIndex(barkFaces);
  barkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(barkPositions, 3));
  barkGeometry.setAttribute('color', new THREE.Float32BufferAttribute(barkColors, 3));
  barkGeometry.computeVertexNormals();
  const barkMesh = new THREE.Mesh(barkGeometry, bark);
  barkMesh.name = 'folded-maple-trunks';
  barkMesh.castShadow = true;
  barkMesh.receiveShadow = true;
  root.add(barkMesh);
  instanced('maple-branches', woodside, wood, trunks, true).receiveShadow = true;
  instanced('bark-grain', woodside, wood, grooves);
  instanced('maple-cut-paper-crowns', crown, paper, crowns, true);
  instanced('maples-canopy-tips', mapleTip, paper, leaves);
  const floor = instanced('maple-leaf-litter', maple, paper, litter);
  floor.receiveShadow = true;

  const drift = Array.from({ length: reducedMotion ? 36 : 205 }, () => {
    const size = range(.072, .245);
    return {
      x: range(-6.0, 6.0), z: range(-56, 6), y: range(0, 7.7), speed: range(.27, .81),
      wave: range(.3, 1.5), phase: range(0, PI * 2), spin: range(.25, 1.32),
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [size, size * .89, size], ink: pick(LITTER),
    };
  });
  const air = instanced('airborne-spinning-maples', maple, paper, drift);
  air.frustumCulled = false;
  air.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  let time = 0;
  function update(dt) {
    if (reducedMotion && time !== 0) return;
    time += reducedMotion ? .001 : dt;
    for (const leaf of drift) {
      const phase = leaf.phase + time * leaf.wave;
      const y = (leaf.y - time * leaf.speed) % 7.7;
      leaf.position[0] = leaf.x + Math.sin(phase) * .58 + Math.sin(time * .34) * .37;
      leaf.position[1] = (y + 7.7) % 7.7 + .05;
      leaf.position[2] = leaf.z + Math.cos(phase * .63) * .73;
      leaf.rotation[0] = .81 + Math.cos(phase) * .65;
      leaf.rotation[1] = Math.sin(phase * .62) * 1.1;
      leaf.rotation[2] = leaf.phase + time * leaf.spin;
    }
    applyInstances(air, drift);
  }

  update(0);
  return { treeRoots, update };
}
