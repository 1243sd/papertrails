import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const greens = ['#2d5644', '#3f7351', '#598960'];
const decorations = ['#b93c4c', '#e7ae55', '#5eabc5', '#ecd9bc'];
const bulbColors = ['#ffbd54', '#ff706f', '#86e8e5', '#fff2ab', '#bdd2ff'].map((color) => new THREE.Color(color));
const starColor = new THREE.Color('#ffcf68');

/** Folded, scalloped paper with a crease down the middle of each point. */
function foldLayer(radius, y, height, shade) {
  const points = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    if (i % 3 !== shade) continue;
    const angle = i / count * 2 * Math.PI;
    const inset = radius * 0.76;
    const left = angle - Math.PI / count;
    const right = angle + Math.PI / count;
    points.push(
      0, y + height, 0, Math.sin(left) * inset, y + 0.07, Math.cos(left) * inset,
      Math.sin(angle) * radius, y, Math.cos(angle) * radius,
      0, y + height, 0, Math.sin(angle) * radius, y, Math.cos(angle) * radius,
      Math.sin(right) * inset, y + 0.07, Math.cos(right) * inset,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  const uv = new Float32Array(points.length / 3 * 2);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function makeStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI * (0.5 + i / 5);
    const radius = i % 2 ? 0.062 : 0.146;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.021, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.008, bevelThickness: 0.006 });
}

export function createChristmasTree(materials) {
  const group = new THREE.Group();
  group.name = 'christmas-tree';
  const byColor = new Map();
  const own = [];
  function add(color, geometry) {
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    if (!byColor.has(color)) byColor.set(color, []);
    byColor.get(color).push(geometry);
  }
  function box(color, w, h, d, x, y, z, angle = 0) {
    add(color, new THREE.BoxGeometry(w, h, d).rotateY(angle).translate(x, y, z));
  }

  box('#886048', 0.14, 0.46, 0.14, 0, 0.23, 0);
  add('#adc9cc', new THREE.CylinderGeometry(0.51, 0.54, 0.035, 14).scale(1, 1, 1.02).translate(0, 0.018, 0.06));
  add('#e5efea', new THREE.CylinderGeometry(0.507, 0.513, 0.023, 14).scale(1, 1, 1.02).translate(0, 0.039, 0.06));
  const lightPositions = [];
  for (let row = 0; row < 5; row++) {
    const y = 0.39 + row * 0.193;
    const radius = 0.545 - row * 0.095;
    const turn = row * 0.34;
    for (let shade = 0; shade < greens.length; shade++) {
      add(greens[shade], foldLayer(radius, y, 0.30, shade).rotateY(turn));
    }
    for (let i = 0; i < 10; i++) {
      const angle = i * 2 * Math.PI / 10 + turn;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      const r = radius * 0.96;
      if (i % 2 === row % 2) {
        const size = 0.05 - row * 0.006;
        const wrap = decorations[(i / 2 + row * 1.5) % decorations.length];
        add(wrap, new THREE.OctahedronGeometry(size).scale(1, 1.2, 1).translate(x * r, y + 0.014, z * r));
        box('#e7ae55', size * 0.44, 0.027, size * 0.44, x * r, y + 0.014 + size * 1.18, z * r);
      }
    }
    const ribbon = [];
    const bulbs = 14 - row * 2;
    for (let i = 0; i <= bulbs; i++) {
      const angle = turn + i / bulbs * Math.PI * 2;
      const flare = radius * (0.8 + 0.08 * Math.cos((angle - turn) * 10));
      const point = new THREE.Vector3(Math.sin(angle) * flare, y + 0.09 + 0.028 * Math.sin(angle * 2 + row), Math.cos(angle) * flare);
      ribbon.push(point);
      if (i < bulbs) lightPositions.push(point.clone().add(new THREE.Vector3(0, 0.026, 0)));
    }
    add('#f0c36e', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribbon), 28, 0.01, 4, false));
    if (row < 4) {
      const garland = ribbon.map((point) => point.clone().multiplyScalar(0.91).setY(point.y + 0.072));
      add('#b93c4c', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(garland), 28, 0.018, 4, false));
    }
  }

  for (const [x, z, size, angle, wrap] of [
    [0.34, 0.14, 0.20, 0.24, '#b93c4c'], [-0.35, 0.25, 0.17, -0.27, '#e7ae55'],
    [0.22, -0.3, 0.17, 0.44, '#b93c4c'], [-0.44, -0.07, 0.13, -0.53, '#5eabc5'],
    [0.45, 0.28, 0.11, 0.36, '#5eabc5'], [-0.23, -0.28, 0.14, -0.44, '#b93c4c'],
  ]) {
    const height = size * 0.75;
    box(wrap, size, height, size, x, height / 2 + 0.043, z, angle);
    const ribbon = wrap === '#b93c4c' ? '#f0c36e' : '#b93c4c';
    box(ribbon, size + 0.004, 0.011, 0.029, x, height + 0.047, z, angle);
    box(ribbon, 0.029, height + 0.009, size + 0.004, x, height / 2 + 0.045, z, angle);
    for (const side of [-1, 1]) {
      add(ribbon, new THREE.OctahedronGeometry(0.027).scale(1.2, 0.57, 0.65)
        .rotateZ(side * 0.3).rotateY(angle).translate(x + side * 0.025, height + 0.063, z));
    }
  }
  box('#f0c36e', 0.028, 0.16, 0.028, 0, 1.46, 0);

  for (const [color, geometries] of byColor) {
    const geometry = mergeGeometries(geometries);
    own.push(geometry);
    for (const part of geometries) part.dispose();
    group.add(new THREE.Mesh(geometry, materials.paper({ color })));
  }

  const starGeometry = makeStar();
  const star = new THREE.Mesh(starGeometry, new THREE.MeshBasicMaterial({ color: starColor }));
  star.name = 'christmas-star';
  star.position.set(0, 1.56, 0.026);
  star.rotation.y = -0.24;
  group.add(star);
  const lights = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.028), new THREE.MeshBasicMaterial(), lightPositions.length);
  lights.name = 'christmas-lights';
  const piece = new THREE.Object3D();
  const color = new THREE.Color();
  lightPositions.forEach((position, i) => {
    piece.position.copy(position);
    piece.scale.set(1, 1.24, 1);
    piece.updateMatrix();
    lights.setMatrixAt(i, piece.matrix);
    lights.setColorAt(i, bulbColors[i % bulbColors.length]);
  });
  lights.instanceColor.setUsage(THREE.DynamicDrawUsage);
  group.add(lights);
  const snow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.87, depthWrite: false,
  }), 68);
  snow.name = 'christmas-snow';
  snow.frustumCulled = false;
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < snow.count; i++) snow.setColorAt(i, color.set(i % 5 === 0 ? '#b9dcf0' : '#fffaf3'));
  group.add(snow);
  let time = 0;

  return {
    group,
    update(dt, reveal = 1) {
      time += dt;
      star.material.color.copy(starColor).multiplyScalar((1.8 + 0.42 * Math.sin(time * 2 + 0.7)) * (0.2 + 0.8 * reveal));
      for (let i = 0; i < lights.count; i++) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * (4.2 + (i % 3) * 0.63) + i * 2.17);
        const on = THREE.MathUtils.smoothstep(reveal, i * 0.87 / lights.count, i * 0.87 / lights.count + 0.13);
        lights.setColorAt(i, color.copy(bulbColors[i % bulbColors.length]).multiplyScalar((0.44 + 2.2 * twinkle ** 2) * (0.06 + 0.94 * on)));
      }
      lights.instanceColor.needsUpdate = true;
      if (!snow.visible) return;
      for (let i = 0; i < snow.count; i++) {
        const angle = i * 2.39996;
        const radius = 0.22 + 1.53 * Math.sqrt(i / snow.count);
        const height = THREE.MathUtils.euclideanModulo(0.8 + i * 0.756 - time * (0.42 + (i % 6) * 0.057), 2.55);
        const size = 0.016 + (i % 4) * 0.005;
        piece.position.set(Math.cos(angle) * radius + 0.14 * Math.sin(time * 1.25 + i), height + 0.055, Math.sin(angle) * radius + 0.14 * Math.cos(time * 0.85 + i));
        piece.rotation.set(time * 0.8 + i, angle, time * 0.62 + i);
        piece.scale.set(size, size * 1.16, size * 0.57);
        piece.updateMatrix();
        snow.setMatrixAt(i, piece.matrix);
      }
      snow.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.removeFromParent();
      for (const geometry of own) geometry.dispose();
      for (const object of [star, lights, snow]) {
        object.geometry.dispose();
        object.material.dispose();
        object.dispose?.();
      }
    },
  };
}
