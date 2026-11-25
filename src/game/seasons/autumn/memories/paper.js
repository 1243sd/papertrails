import * as THREE from 'three';
import { polygon, roundedSheet } from '../../../winter/paper.js';

export const clamp = (value) => THREE.MathUtils.clamp(value, 0, 1);
export const mix = THREE.MathUtils.lerp;
export const ease = (value) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

function makeTexture(size, pixel) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) data.set(pixel(x, y), (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createPaper() {
  const resources = new Set();
  const swatches = new Map();
  const own = (resource) => {
    resources.add(resource);
    return resource;
  };
  const grain = own(makeTexture(128, (x, y) => {
    const fleck = (x * 127 + y * 31 + x * y * 17) % 41;
    const tone = 232 + fleck % 19 - (fleck < 4 ? 13 : 0);
    return [tone, tone, tone, 255];
  }));
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(2, 2);
  const shade = own(makeTexture(64, (x, y) => {
    const distance = Math.hypot(x - 31.5, y - 31.5) / 31.5;
    return [255, 255, 255, Math.floor(185 * (1 - clamp(distance)) ** 2)];
  }));
  function material(color, glow = 0) {
    const key = color + ':' + glow;
    if (!swatches.has(key)) swatches.set(key, own(new THREE.MeshStandardMaterial({
      color, map: grain, roughness: .92, side: THREE.DoubleSide,
      emissive: color, emissiveIntensity: glow,
    })));
    return swatches.get(key);
  }
  function surface(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(own(geometry), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function group(parent, name, x = 0, y = 0, z = 0) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function box(parent, color, w, h, d, x, y, z, glow) {
    return surface(parent, new THREE.BoxGeometry(w, h, d), material(color, glow), x, y, z);
  }
  function sheet(parent, color, w, h, radius, depth, x, y, z) {
    return cut(parent, color, roundedSheet(w, h, radius), depth, x, y, z);
  }
  function cut(parent, color, outline, depth, x, y, z) {
    const shape = Array.isArray(outline) ? polygon(outline) : outline;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelSize: .009, bevelThickness: .008, bevelSegments: 1, curveSegments: 6,
    });
    const edge = new THREE.Color(color).multiplyScalar(.74).getHex();
    return surface(parent, geometry, [material(color), material('#' + edge.toString(16).padStart(6, '0'))], x, y, z);
  }
  function ball(parent, color, w, h, d, x, y, z, glow) {
    const mesh = surface(parent, new THREE.SphereGeometry(1, 10, 8), material(color, glow), x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  }
  function disk(parent, color, top, bottom, height, x, y, z, segments = 18, glow) {
    return surface(parent, new THREE.CylinderGeometry(top, bottom, height, segments),
      material(color, glow), x, y, z);
  }
  function line(parent, color, radius, positions, glow) {
    const points = positions.map((p) => new THREE.Vector3(...p));
    const path = new THREE.CatmullRomCurve3(points);
    return surface(parent, new THREE.TubeGeometry(path, Math.max(4, points.length * 3), radius, 5, false),
      material(color, glow));
  }
  function shadow(parent, w, d, x, y, z, opacity = .7) {
    const mesh = surface(parent, new THREE.PlaneGeometry(w, d), own(new THREE.MeshBasicMaterial({
      color: '#442031', transparent: true, depthWrite: false, map: shade, opacity,
    })), x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  return {
    own, material, surface, group, box, cut, sheet, ball, disk, line, shadow,
    dispose() {
      resources.forEach((resource) => resource.dispose());
      resources.clear();
    },
  };
}

export function floor(paper, root, color, width = 14, depth = 16) {
  paper.box(root, '#735044', width + .18, .21, depth + .1, 0, -.32, 2);
  paper.box(root, '#b5825b', width + .09, .12, depth + .08, 0, -.163, 2);
  paper.box(root, color, width, .1, depth, 0, -.05, 2);
}

export function cameraFrame(camera, aspect, settings, progress) {
  const { from, to = from, focus, endFocus = focus, lens = 39 } = settings;
  camera.position.set(...from.map((v, i) => mix(v, to[i], progress)));
  const target = focus.map((v, i) => mix(v, endFocus[i], progress));
  camera.lookAt(...target);
  camera.fov = THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(lens) / 2) * Math.max(1, .92 / aspect)),
  );
  camera.updateProjectionMatrix();
}
