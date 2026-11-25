import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { petalShape } from './bloom.js';

export function createGardenFence({ group, mesh, paper }, garden, outline) {
  const fence = group(garden, 'garden-perimeter-fence');
  const ivory = [], gold = [], leaves = [], petals = [];
  const turn = Math.PI * 2;
  const start = 4.73;
  const end = 4.46 + turn;
  const panels = 29;
  const point = (angle, y = .008) => {
    const [x, z] = outline(angle, .95);
    return new THREE.Vector3(x, y, -z);
  };
  const top = (angle) => .30 + .075 * (1 + Math.sin(angle)) / 2;

  function bar(parts, a, b, radius) {
    const delta = new THREE.Vector3().subVectors(b, a);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    const cut = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
    cut.applyQuaternion(rotation).translate(...a.clone().lerp(b, .5));
    parts.push(cut);
  }

  function curve(parts, points, radius) {
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, radius, 6));
  }

  function post(angle, gate) {
    const h = gate ? .56 : top(angle) + .065;
    const size = gate ? .119 : .072;
    const tangent = point(angle + .01).sub(point(angle - .01));
    const yaw = Math.atan2(-tangent.z, tangent.x);
    const timber = (w, d, height) => new THREE.BoxGeometry(w, height, w)
      .rotateY(yaw).translate(...point(angle, d));
    ivory.push(timber(size, h / 2 + .008, h), timber(size * 1.3, h - .023, .038));
    gold.push(new THREE.SphereGeometry(gate ? .048 : .027, 10, 8)
      .scale(.85, 1.25, .85).translate(...point(angle, h + .011)));
  }

  for (let i = 0; i <= panels; i++) {
    const angle = THREE.MathUtils.lerp(start, end, i / panels);
    post(angle, i === 0 || i === panels);
    if (i === panels) break;
    const next = THREE.MathUtils.lerp(start, end, (i + 1) / panels);
    const at = (u, y) => point(THREE.MathUtils.lerp(angle, next, u), y);
    const crest = (u) => THREE.MathUtils.lerp(top(angle), top(next), u) + Math.sin(u * Math.PI) * .056;
    bar(ivory, at(0, .10), at(1, .10), .021);
    curve(ivory, [0, .25, .5, .75, 1].map((u) => at(u, crest(u))), .022);
    for (const u of [.24, .76]) {
      bar(ivory, at(u, .10), at(u, crest(u)), .012);
    }
    const lozenge = [at(.50, .12), at(.63, .218), at(.50, .31), at(.37, .218)];
    for (let j = 0; j < lozenge.length; j++) {
      bar(gold, lozenge[j], lozenge[(j + 1) % lozenge.length], .008);
    }

    if (i % 5 !== 2 && i !== panels - 2) continue;
    const vine = [at(.08, .055), at(.12, .19), at(.26, .30), at(.35, crest(.35) + .028)];
    curve(leaves, vine, .014);
    const facing = at(.5, 0).normalize();
    const yaw = Math.atan2(facing.x, facing.z);
    for (let j = 0; j < vine.length; j++) {
      const p = vine[j].clone().addScaledVector(facing, .023);
      leaves.push(new THREE.ShapeGeometry(petalShape(.063, .135, .03), 8)
        .rotateZ(j % 2 ? .92 : -.8).rotateY(yaw).translate(...p));
      if (j < 2) continue;
      for (let k = 0; k < 5; k++) {
        petals.push(new THREE.ShapeGeometry(petalShape(.039, .059, .1), 8)
          .translate(0, .016, 0).rotateZ(k * turn / 5 + j).rotateY(yaw).translate(...p));
      }
      gold.push(new THREE.SphereGeometry(.016, 8, 6).translate(...p.addScaledVector(facing, .007)));
    }
  }

  for (const [parts, color] of [[ivory, '#eddfc3'], [gold, '#c5a066'], [leaves, '#86a178'], [petals, '#edb7c4']]) {
    mesh(fence, mergeGeometries(parts), paper(color));
    for (const part of parts) part.dispose();
  }
  return fence;
}
