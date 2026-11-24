import * as THREE from 'three';

export function createWinterPaper(materials) {
  const copies = new Map();
  const uniforms = Object.fromEntries(Object.entries(materials.uniforms).map(([key, { value }]) => [
    key, { value: Array.isArray(value) ? value.map((v) => v.clone()) : value?.isTexture ? value : value?.clone?.() ?? value },
  ]));
  uniforms.uPaperHero2.value.y = 0;
  uniforms.uPaperPoolCol.value.w = 0;
  uniforms.uPaperRim2.value.x = 0.5;
  uniforms.uPaperFibre.value.multiply(new THREE.Vector4(1, .60, .48, .46));

  function copy(source) {
    if (copies.has(source)) return copies.get(source);
    const material = source.clone();
    material.alphaToCoverage = false;
    material.onBeforeCompile = (shader, renderer) => {
      source.onBeforeCompile(shader, renderer);
      if (source.name.startsWith('paper:')) Object.assign(shader.uniforms, uniforms);
    };
    material.customProgramCacheKey = () => source.customProgramCacheKey() + '|winter';
    copies.set(source, material);
    return material;
  }

  function model(prototype) {
    const clone = prototype.clone(true);
    clone.traverse((node) => {
      if (!node.isMesh) return;
      node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
      node.castShadow = node.receiveShadow = false;
    });
    return clone;
  }

  return {
    model,
    paper(options) { return copy(materials.paper(options)); },
    warmPools(points) {
      uniforms.uPaperPoolCol.value.set(1.0, .51, .23, 1.72);
      uniforms.uPaperPool.value.forEach((pool, i) => pool.set(...(points[i] ?? [0, 0, 0, 0])));
    },
    dispose() { for (const material of copies.values()) material.dispose(); },
  };
}

export function polygon(points) {
  const outline = new THREE.Shape();
  points.forEach(([x, y], i) => i ? outline.lineTo(x, y) : outline.moveTo(x, y));
  outline.closePath();
  return outline;
}

export function roundedSheet(width, depth, radius) {
  const w = width / 2, d = depth / 2, r = radius;
  const path = new THREE.Shape();
  path.moveTo(-w + r, -d);
  path.lineTo(w - r, -d); path.quadraticCurveTo(w, -d, w, -d + r);
  path.lineTo(w, d - r); path.quadraticCurveTo(w, d, w - r, d);
  path.lineTo(-w + r, d); path.quadraticCurveTo(-w, d, -w, d - r);
  path.lineTo(-w, -d + r); path.quadraticCurveTo(-w, -d, -w + r, -d);
  return path;
}
