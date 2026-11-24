import * as THREE from 'three';

const snowCounts = { low: [36, 52, 22], med: [60, 88, 38], high: [95, 130, 58] };
const clamp = (n) => Math.max(0, Math.min(1, n));
export const ease = (t, start, duration) => {
  const n = clamp((t - start) / duration);
  return n * n * (3 - 2 * n);
};

export function createWinterMotion(stage, initialQuality) {
  const { scene, camera, covers, leaves, snow, tree, treePedestal, village, clouds, starlight, glow, foreground,
    cats, traveller, puppet, poseCat, chimneys, windows, owned, random } = stage;
  const particleTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, '#fffdf4');
    gradient.addColorStop(.24, '#fffdf4ee');
    gradient.addColorStop(.62, '#fffdf490');
    gradient.addColorStop(1, '#fffdf400');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    owned.add(texture);
    return texture;
  })();
  function points(name, count, color, size, opacity) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3 * count);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({ color, size, opacity, map: particleTexture, transparent: true, depthWrite: false });
    const mesh = new THREE.Points(geometry, material);
    mesh.name = name;
    mesh.frustumCulled = false;
    scene.add(mesh);
    owned.add(geometry);
    owned.add(material);
    return { mesh, geometry, positions };
  }
  const layers = [[38, 13, -17, -5, .128, .44], [19, 9.5, -6, 3.8, .098, .66], [15, 8, 3.7, 8.2, .095, .73]]
    .map(([w, h, z1, z2, size, opacity], i) => {
      const layer = points('snow-layer-' + (i + 1), snowCounts.high[i], '#edf5fc', size, opacity);
      const flakes = Array.from({ length: snowCounts.high[i] }, () => [
        (random() - .5) * w, random() * h, THREE.MathUtils.lerp(z1, z2, random()), .34 + random() * .48, random() * 7,
      ]);
      return { ...layer, h, flakes, count: 0 };
    });
  const smoke = points('chimney-smoke', chimneys.length * 7, '#c1d5de', .22, .35);
  const bulbs = tree.group.getObjectByName('christmas-lights');
  const aura = points('christmas-lantern-halos', bulbs.count, '#ffbf69', .14, .21);
  aura.mesh.material.blending = THREE.AdditiveBlending;
  tree.group.add(aura.mesh);
  const bulbMatrix = new THREE.Matrix4();
  const bulbPosition = new THREE.Vector3();
  for (let i = 0; i < bulbs.count; i++) {
    bulbs.getMatrixAt(i, bulbMatrix);
    bulbPosition.setFromMatrixPosition(bulbMatrix);
    bulbPosition.toArray(aura.positions, 3 * i);
  }
  const pipe = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const sway = new THREE.Vector2();
  const origin = new THREE.Vector2();
  const target = new THREE.Vector3();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let time = 0;
  let chapter = 0;
  let chapterBlend = 0;
  let frameAmount = 1;
  let firstFrame = true;
  let quality;

  function setQuality(level) {
    const schedule = snowCounts[level] ?? snowCounts.med;
    if (quality === schedule) return;
    quality = schedule;
    layers.forEach((layer, i) => {
      layer.count = schedule[i];
      layer.geometry.setDrawRange(0, layer.count);
    });
    smoke.geometry.setDrawRange(0, level === 'low' ? 14 : chimneys.length * 7);
  }

  function update(dt) {
    const reduced = reducedMotion.matches;
    time += dt;
    const t = reduced ? 100 : time;
    const ambient = reduced ? 0 : time;
    sway.lerp(reduced ? origin : pointer, reduced ? 1 : 1 - Math.exp(-dt * 3.4));
    chapterBlend = reduced ? (chapter === 1 ? 1 : 0) : THREE.MathUtils.damp(chapterBlend, chapter === 1 ? 1 : 0, 3.2, dt);
    const push = ease(t, .20, 5.8);
    camera.position.set(sway.x * .32, 6.18 - push * .20 + sway.y * .16, 13.6 - push * 1.25 - chapterBlend * .33);
    target.set(sway.x * .13, 1.04 - chapterBlend * .05, .14 * chapterBlend);
    camera.lookAt(target);
    for (const { hinge, side } of covers) {
      hinge.rotation.z = side < 0 ? -.10 * (1 - ease(t, .12, .64)) : 2.81 * (1 - ease(t, .16, 1.15));
    }
    for (const { hinge, side } of leaves) {
      hinge.rotation.z = side * (side < 0 ? .72 : 1.47) * (1 - ease(t, .63, 1.04));
      hinge.visible = t >= .50;
    }
    snow.scale.y = Math.max(.01, ease(t, 1.07, .54));
    snow.visible = t >= 1.07;
    for (const { pivot, delay } of village) {
      const raised = ease(t, 1.25 + delay, .82);
      pivot.visible = raised > 0;
      pivot.rotation.x = (1 - raised) * -1.45;
    }
    const rise = ease(t, 1.63, 1.08);
    treePedestal.visible = rise > 0;
    treePedestal.scale.y = Math.max(.005, rise);
    const light = ease(t, 2.05, 1.65);
    tree.update(reduced ? 0 : dt, light);
    aura.mesh.material.opacity = light * (.22 + Math.sin(ambient * 1.29) * .035);
    foreground.visible = t > 1.81;
    traveller.visible = t > 1.94;
    traveller.scale.y = Math.max(.02, ease(t, 1.94, .54));
    puppet.rotation.z = Math.sin(ambient * 1.31) * .018;
    puppet.rotation.x = Math.sin(ambient * 1.09) * .012;
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const start = 2.05 + i * .36;
      const walk = ease(t, start, .98);
      cat.root.visible = t >= start;
      cat.root.position.x = cat.x + cat.side * (1 - walk) * 1.00;
      cat.root.position.z = .16 + i * .07 + (1 - walk) * .22;
      cat.card.rotation.z = walk === 1 ? Math.sin(ambient * 1.6 + i) * .011 : Math.sin(ambient * 22) * .047;
      poseCat(cat, walk < 1 && Math.floor((t - start) * 8) % 2 === 0 ? 'walk_a' : walk < 1 ? 'walk_b' : 'sit');
    }
    frameAmount = ease(t, 2.33, .76);
    clouds.forEach(({ cloud, x }, i) => { cloud.position.x = x + Math.sin(ambient * (.12 + i * .023) + i) * .73; });
    starlight.forEach((star, i) => star.scale.setScalar(.91 + Math.sin(ambient * .91 + i * 1.9) * .14));
    glow.uniforms.opacity.value = .58 + Math.sin(ambient * .71) * .055;
    windows[0].material.color.set('#ffd99a').multiplyScalar(.90 + Math.sin(ambient * 2.6) * .075);
    if (!reduced || firstFrame) {
      firstFrame = false;
      for (const { count, positions, geometry, h, flakes } of layers) {
        for (let i = 0; i < count; i++) {
          const [x, y, z, speed, phase] = flakes[i];
          positions[i * 3] = x + Math.sin(ambient * .62 + phase) * .66;
          positions[i * 3 + 1] = THREE.MathUtils.euclideanModulo(y - ambient * speed, h) - .1;
          positions[i * 3 + 2] = z + Math.cos(ambient * .41 + phase) * .26;
        }
        geometry.attributes.position.needsUpdate = true;
      }
    }
    smoke.mesh.visible = t > 2.3 && !reduced;
    if (smoke.mesh.visible) {
      chimneys.forEach(({ root, origin }, i) => {
        pipe.copy(origin);
        root.localToWorld(pipe);
        for (let j = 0; j < 7; j++) {
          const progress = THREE.MathUtils.euclideanModulo(j / 7 + ambient * .25 + i * .19, 1);
          const offset = (i * 7 + j) * 3;
          smoke.positions[offset] = pipe.x + progress ** 1.6 * .76;
          smoke.positions[offset + 1] = pipe.y + progress * 1.35;
          smoke.positions[offset + 2] = pipe.z - progress * .35;
        }
      });
      smoke.geometry.attributes.position.needsUpdate = true;
    }
  }

  setQuality(initialQuality);
  return {
    update,
    setQuality(level) { setQuality(level); firstFrame = true; },
    setChapter(index) { chapter = index; },
    aim(x, y) { pointer.set(x, y); },
    get frameAmount() { return frameAmount; },
    get cover() { return reducedMotion.matches ? 0 : 1 - ease(time, 0, .63); },
  };
}
