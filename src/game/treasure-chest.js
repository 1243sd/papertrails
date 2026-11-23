import * as THREE from 'three';

const GOLD = '#e6b96e';
const DARK_GOLD = '#a76b3f';

export function createTreasureChest(materials, color, season) {
  const group = new THREE.Group();
  const model = new THREE.Group();
  group.add(model);
  const winter = season === 'winter';
  const openingTime = winter ? 1.12 : 0.84;
  const parts = new Set();
  const paper = materials.paper({ color: winter ? '#436c87' : color });
  const gold = materials.paper({ color: GOLD });
  const dark = materials.paper({ color: DARK_GOLD });
  const inside = materials.paper({ color: '#6b3b36' });
  const light = winter ? '#b5e2ff' : '#ffce75';
  const glowMaterial = new THREE.MeshBasicMaterial({ color: light, transparent: true, depthWrite: false, opacity: 0 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: light, transparent: true, depthWrite: false, opacity: 0 });
  const sparksMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false });

  function mesh(parent, geometry, material, x, y, z) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    parent.add(part);
    parts.add(geometry);
    return part;
  }

  function box(parent, material, w, h, d, x, y, z) {
    return mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }

  const base = new THREE.Group();
  model.add(base);
  box(base, inside, 0.53, 0.045, 0.35, 0, 0.031, 0);
  for (const side of [-1, 1]) {
    box(base, paper, 0.54, 0.235, 0.035, 0, 0.145, side * 0.163);
    box(base, paper, 0.035, 0.235, 0.30, side * 0.25, 0.145, 0);
    box(base, gold, 0.56, 0.026, 0.021, 0, 0.058, side * 0.178);
    box(base, gold, 0.021, 0.026, 0.34, side * 0.269, 0.058, 0);
    box(base, gold, 0.035, 0.235, 0.017, side * 0.207, 0.149, 0.185);
    box(base, dark, 0.055, 0.054, 0.024, side * 0.197, 0.263, -0.185);
  }
  const lock = box(base, dark, 0.088, 0.085, 0.022, 0, 0.226, 0.186);
  lock.rotation.z = Math.PI / 4;
  const latch = box(base, gold, 0.065, 0.063, 0.025, 0, 0.226, 0.198);
  latch.rotation.z = Math.PI / 4;
  box(base, inside, 0.016, 0.029, 0.008, 0, 0.225, 0.213);

  const lid = new THREE.Group();
  lid.position.set(0, 0.265, -0.18);
  model.add(lid);
  const profile = new THREE.Shape();
  for (const [i, [x, y]] of [[0, 0], [0.36, 0], [0.36, 0.055], [0.284, 0.128], [0.076, 0.128], [0, 0.055]].entries()) {
    if (i === 0) profile.moveTo(x, y); else profile.lineTo(x, y);
  }
  profile.closePath();
  const cover = new THREE.ExtrudeGeometry(profile, { depth: 0.55, bevelEnabled: false }).rotateY(-Math.PI / 2);
  mesh(lid, cover, paper, 0.275, 0, 0);
  for (const x of [-0.219, 0.219]) {
    const band = new THREE.ExtrudeGeometry(profile, { depth: 0.031, bevelEnabled: false }).rotateY(-Math.PI / 2);
    band.scale(1, 1.06, 1.012);
    mesh(lid, band, gold, x + 0.015, 0.004, -0.002);
  }
  box(lid, gold, 0.55, 0.022, 0.025, 0, 0.009, 0.36);

  const seal = new THREE.Shape();
  const [rays, inset, width, depth] = ({
    spring: [5, 0.74, 0.066, 0.066],
    summer: [9, 0.65, 0.067, 0.067],
    autumn: [4, 0.88, 0.046, 0.074],
    winter: [6, 0.39, 0.071, 0.071],
  })[season];
  for (let i = 0; i < rays * 2; i++) {
    const angle = Math.PI * i / rays;
    const r = i % 2 ? inset : 1;
    const x = width * r * Math.sin(angle);
    const y = depth * r * Math.cos(angle);
    if (i === 0) seal.moveTo(x, y); else seal.lineTo(x, y);
  }
  seal.closePath();
  mesh(lid, new THREE.ShapeGeometry(seal).rotateX(-Math.PI / 2), gold, 0, 0.13, 0.18);

  if (winter) {
    const frost = materials.paper({ color: '#c6e6f2' });
    const ribbon = materials.paper({ color: '#b64352' });
    const lining = materials.paper({ color: '#733e5c' });
    box(base, lining, 0.495, 0.018, 0.31, 0, 0.06, 0);
    box(base, frost, 0.51, 0.028, 0.02, 0, 0.116, 0.184);
    for (const side of [-1, 1]) {
      box(base, frost, 0.022, 0.027, 0.315, side * 0.275, 0.116, 0);
      box(base, ribbon, 0.055, 0.19, 0.025, side * 0.129, 0.161, 0.184);
      const corner = box(base, gold, 0.048, 0.048, 0.02, side * 0.246, 0.085, 0.194);
      corner.rotateZ(Math.PI / 4);
      const band = new THREE.ExtrudeGeometry(profile, { depth: 0.053, bevelEnabled: false }).rotateY(-Math.PI / 2);
      band.scale(1, 1.05, 1.007);
      mesh(lid, band, ribbon, side * 0.129 + 0.026, 0.004, -0.001);
    }
    mesh(lid, new THREE.ShapeGeometry(seal).rotateX(-Math.PI / 2).scale(0.74, 1, 0.74), frost, 0, 0.133, 0.18);
  }

  const glow = mesh(model, new THREE.PlaneGeometry(0.47, 0.3), glowMaterial, 0, 0.19, 0);
  glow.rotation.x = -Math.PI / 2;
  const ring = mesh(group, new THREE.TorusGeometry(0.26, 0.009, 4, 32), ringMaterial, 0, 0.16, 0.04);
  ring.rotation.x = -Math.PI / 2;
  const leaflet = new THREE.Group();
  const cream = materials.paper({ color: winter ? '#fff0d4' : '#fff9db' });
  box(leaflet, cream, 0.24, 0.153, 0.009, 0, 0, 0);
  const flap = box(leaflet, gold, 0.223, 0.016, 0.008, 0, 0.052, 0.007);
  flap.rotation.z = -0.08;
  const wax = box(leaflet, materials.paper({ color: winter ? '#b64352' : color }), 0.043, 0.043, 0.008, 0, -0.004, 0.008);
  wax.rotation.z = Math.PI / 4;
  group.add(leaflet);

  const sparkle = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const radius = i % 2 ? 0.22 : 0.78;
    const x = Math.cos(angle) * radius * 0.73;
    const y = Math.sin(angle) * radius;
    if (i === 0) sparkle.moveTo(x, y); else sparkle.lineTo(x, y);
  }
  sparkle.closePath();
  const sparkGeometry = new THREE.ShapeGeometry(sparkle);
  parts.add(sparkGeometry);
  const sparks = new THREE.InstancedMesh(sparkGeometry, sparksMaterial, winter ? 28 : 16);
  sparks.name = 'treasure-paper-sparks';
  sparks.frustumCulled = false;
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(sparks);
  const sparkColors = (winter ? ['#fff1bc', '#9fe7f9', '#fff8e7', '#e9929c'] : ['#fff3c9', color, '#ffb764']).map((value) => new THREE.Color(value));
  for (let i = 0; i < sparks.count; i++) sparks.setColorAt(i, sparkColors[i % sparkColors.length]);
  const piece = new THREE.Object3D();
  ring.visible = leaflet.visible = sparks.visible = false;
  let openness = 0;
  let celebrating = false;
  let time = 0;

  return {
    group,
    get opened() { return openness >= 1; },
    celebrate() { celebrating = true; },
    update(dt, open, snap = false) {
      time += dt;
      openness = snap ? Number(open) : THREE.MathUtils.clamp(openness + (open ? 1 : -1) * dt / openingTime, 0, 1);
      if (snap || !open || openness === 1) celebrating = false;
      const lift = THREE.MathUtils.clamp((openness - 0.16) / 0.84, 0, 1);
      const flare = celebrating ? Math.sin(lift * Math.PI) : 0;
      model.position.y = 0.014 + 0.009 * Math.sin(time * 2.4);
      model.position.y += flare * (winter ? 0.04 : 0.025);
      const lidLift = THREE.MathUtils.smoothstep(openness, 0.09, 0.58);
      lid.rotation.x = -1.38 * lidLift;
      glowMaterial.opacity = Math.min(1, lidLift * 0.59 + flare * 0.39);
      glow.visible = lidLift > 0;
      ring.visible = leaflet.visible = sparks.visible = flare > 0;
      if (sparks.visible) {
        const spread = 1 - (1 - lift) ** 2;
        leaflet.position.set(0, 0.25 + spread * (winter ? 0.63 : 0.43), 0.07 + spread * 0.41);
        leaflet.rotation.set(-0.3, 0.42 * Math.cos(lift * Math.PI), 0.25 - lift * 0.48);
        leaflet.scale.setScalar(flare ** 0.45);
        ring.scale.setScalar(0.72 + spread * (winter ? 2.8 : 1.8));
        ringMaterial.opacity = 0.74 * flare * (1 - lift);
        sparksMaterial.opacity = Math.min(1, flare * 1.55);
        for (let i = 0; i < sparks.count; i++) {
          const angle = i * 2.4 + lift * 0.65;
          const radius = spread * (0.26 + (i % 5) * 0.08) * (winter ? 1.52 : 1);
          const height = spread * (0.36 + (i % 6) * 0.09) * (winter ? 1.32 : 1);
          piece.position.set(Math.cos(angle) * radius, 0.24 + height - 0.13 * lift ** 3, 0.075 + spread * (winter ? 0.27 : 0.11) + Math.sin(angle) * radius * 0.65);
          piece.rotation.set(-0.55 + Math.cos(i) * lift, Math.sin(i) * lift, i + lift * 3);
          piece.scale.setScalar((0.053 + (i % 4) * 0.013) * flare ** 0.46);
          piece.updateMatrix();
          sparks.setMatrixAt(i, piece.matrix);
        }
        sparks.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      group.removeFromParent();
      for (const geometry of parts) geometry.dispose();
      sparks.dispose();
      glowMaterial.dispose();
      ringMaterial.dispose();
      sparksMaterial.dispose();
    },
  };
}
