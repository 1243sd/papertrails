import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

export function petalShape(width, length, notch = 0.08) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-width * .42, length * .19, -width * .71, length * .82, -width * .28, length);
  shape.bezierCurveTo(-width * .14, length * 1.055, -width * .065, length * (1 - notch), 0, length * (1 - notch));
  shape.bezierCurveTo(width * .1, length * (1 - notch), width * .23, length * 1.05, width * .37, length * .96);
  shape.bezierCurveTo(width * .68, length * .76, width * .44, length * .17, 0, 0);
  return shape;
}

export function createBloom({ group, mesh, paper }, garden) {
  const root = group(garden, 'bloom-memory-flower', 0, 1.76, .66);
  root.rotation.x = -.31;
  const stem = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-.14, .03, .64), new THREE.Vector3(.3, .59, .53),
    new THREE.Vector3(-.15, 1.26, .57), root.position.clone(),
  );
  mesh(garden, new THREE.TubeGeometry(stem, 20, .072, 8), paper('#68896b'));

  for (const [x, y, angle, color] of [[.03, .59, 1.16, '#809e72'], [-.02, .89, -1.06, '#a8be91']]) {
    const leaf = mesh(garden, new THREE.ExtrudeGeometry(petalShape(.38, .91, .015), {
      depth: .022, bevelEnabled: false, curveSegments: 18,
    }), paper(color), x, y, .65);
    leaf.rotation.set(-.18, x > 0 ? -.23 : .29, angle);
    mesh(leaf, new THREE.BoxGeometry(.012, .62, .006), paper('#cfdbac'), 0, .36, .026);
  }

  const petals = [];
  const colors = ['#eb9aaf', '#f3bacb', '#eaa5b8', '#f1b6c3', '#e99bb0', '#f2b5c8'];
  const modifier = new TessellateModifier(.12, 5);
  const petalsPaper = paper('#fffbf6', true);
  petalsPaper.emissive.set('#c96e87');
  petalsPaper.emissiveIntensity = .27;
  const veinsPaper = paper('#edb5c2');
  for (let i = 0; i < 6; i++) {
    const radial = group(root, 'bloom-radial-' + i);
    radial.rotation.z = (i - .5) * Math.PI / 3;
    const pivot = group(radial, 'bloom-petal-' + i, 0, .17, i % 2 * -.055);
    const length = 1.39 + (i % 3) * .06;
    const cut = new THREE.ExtrudeGeometry(petalShape(1.23, length), {
      depth: .033, bevelEnabled: true, bevelSize: .014, bevelThickness: .009,
      bevelSegments: 2, curveSegments: 28,
    });
    const geometry = modifier.modify(cut);
    cut.dispose();
    const vertices = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const normal = new THREE.Vector3();
    const tip = new THREE.Color('#f9d4d7');
    const blush = new THREE.Color(colors[i]);
    const color = new THREE.Color();
    const heights = [];
    const curl = (x, y) => {
      const u = y / length;
      return .28 * u ** 2 - .44 * u ** 3 + .24 * x * x;
    };
    for (let j = 0; j < vertices.count; j++) {
      const x = vertices.getX(j), y = vertices.getY(j);
      const u = y / length;
      vertices.setZ(j, vertices.getZ(j) + curl(x, y));
      const nz = normals.getZ(j);
      normal.set(normals.getX(j) - .48 * x * nz, normals.getY(j) - (.56 * u - 1.32 * u ** 2) * nz / length, nz).normalize();
      normals.setXYZ(j, normal.x, normal.y, normal.z);
      color.copy(blush).lerp(tip, .31 + Math.max(0, u) * .43).multiplyScalar(.85 + Math.abs(nz) * .15);
      heights.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(heights, 3));
    const surface = mesh(pivot, geometry, petalsPaper);
    surface.receiveShadow = false;
    for (const side of [-1, 0, 1]) {
      const stroke = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_, p) => {
        const u = p / 6;
        const x = side * (.065 + u * .27);
        const y = length * (.30 + u * (side ? .44 : .54));
        return new THREE.Vector3(x, y, .036 + curl(x, y));
      }));
      const vein = mesh(pivot, new THREE.TubeGeometry(stroke, 10, side ? .0037 : .0053, 4), veinsPaper);
      vein.castShadow = vein.receiveShadow = false;
    }
    petals.push(pivot);
  }

  const bud = mesh(root, new THREE.SphereGeometry(.24, 24, 12), paper('#e4a2b3'), 0, 0, .38);
  const heart = group(root, 'bloom-heart', 0, 0, .12);
  mesh(heart, new THREE.SphereGeometry(.59, 40, 18), paper('#edba6e')).scale.z = .24;
  mesh(heart, new THREE.SphereGeometry(.49, 40, 18), paper('#f7d58c'), 0, 0, .065).scale.z = .24;
  for (let i = 0; i < 26; i++) {
    const a = i * Math.PI * 2 / 26;
    const radius = .49 + .02 * Math.sin(i * 9);
    mesh(heart, new THREE.SphereGeometry(.032, 8, 6), paper('#fff1bb'),
      radius * Math.cos(a), radius * Math.sin(a), .14);
  }
  const glow = new THREE.PointLight('#ffdb9c', 0, 2.8, 2);
  glow.position.z = .64;
  root.add(glow);
  return { root, petals, bud, heart, glow };
}
