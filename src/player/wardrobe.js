import * as THREE from 'three';

const FORM = {
  spring: { panels: 8, radius: 0.36, dome: 0.14, peak: 0.035, scallop: 0.028, edge: 0.028, palette: ['#f4bdcd', '#e885a8', '#fff1df', '#b65469'], motif: 5 },
  summer: { panels: 6, radius: 0.34, dome: 0.12, peak: 0.036, scallop: 0.008, edge: 0.014, palette: ['#9bd9c0', '#4b9d88', '#fcf1c5', '#d7a755'], motif: 8 },
  autumn: { panels: 10, radius: 0.35, dome: 0.17, peak: 0.054, scallop: 0.017, edge: 0.024, palette: ['#c88866', '#914052', '#fae0ac', '#d4a05d'], motif: 4 },
  winter: { panels: 12, radius: 0.39, dome: 0.15, peak: 0.024, scallop: 0.036, edge: 0.039, palette: ['#b6d8f0', '#719fcc', '#fff8f2', '#b9a374'], motif: 6 },
};

const SEASON = { blossom: 'spring', desert: 'summer', heartland: 'autumn', pinewood: 'autumn', snow: 'winter' };
const GARMENT_PARTS = ['head', 'body', 'arm_l', 'arm_r', 'leg_l', 'leg_r'];
const TAU = Math.PI * 2;

function createParasol(season, materials) {
  const design = FORM[season];
  const [base, dark, light, trim] = design.palette;
  const parasol = new THREE.Group();
  parasol.name = 'lolita-parasol-' + season;
  const open = new THREE.Group();
  open.name = 'parasol-open';
  const cane = new THREE.Group();
  cane.name = 'parasol-cane';
  const swivel = new THREE.Group();
  swivel.add(open);
  parasol.add(swivel, cane);
  const paper = (color) => materials.paper({ color, variant: 'traveller' });
  const owned = [];
  function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    group.add(m);
    owned.push(geometry);
    return m;
  }
  const stem = paper(trim);
  const rise = season === 'winter' ? 0.065 : 0;
  mesh(open, new THREE.CylinderGeometry(0.008, 0.009, 0.64 + rise, 6), stem, 0, 0.28 + rise / 2);
  mesh(open, new THREE.SphereGeometry(0.016, 8, 5), stem, 0, 0.607 + rise);
  mesh(cane, new THREE.CylinderGeometry(0.007, 0.01, 0.345, 6), stem, 0, -0.076);
  mesh(cane, new THREE.CylinderGeometry(design.edge * 0.46 + 0.009, 0.008, 0.195, design.panels), paper(dark), 0, -0.113);
  mesh(cane, new THREE.CylinderGeometry(design.edge * 0.46 + 0.008, 0.014, 0.024, 8), paper(light), 0, -0.11);
  if (season === 'winter') {
    mesh(cane, new THREE.OctahedronGeometry(0.023), paper('#a7dbfa'), 0, 0.108).scale.y = 1.4;
  } else if (season === 'autumn') {
    mesh(cane, new THREE.TorusGeometry(0.027, 0.008, 6, 14, Math.PI * 1.2), stem, -0.026, 0.085).rotation.z = -Math.PI / 6;
  } else {
    const handle = mesh(cane, new THREE.SphereGeometry(0.017, 8, 6), paper(season === 'spring' ? base : trim), 0, 0.102);
    handle.scale.set(season === 'spring' ? 1.25 : 1, season === 'summer' ? 1.3 : 0.76, 1);
  }
  open.rotation.z = season === 'winter' ? -0.73 : -0.63;
  cane.rotation.z = 0.13;
  const cloth = new THREE.Group();
  cloth.position.y = 0.43 + rise;
  open.add(cloth);

  function clothPoint(angle, t, fold = 0) {
    const scallop = Math.cos(angle * design.panels);
    const radius = t * (design.radius + design.peak * scallop + fold);
    const top = design.dome * Math.pow(1 - Math.min(t, 1), 0.7);
    return [Math.sin(angle) * radius, top - design.scallop * (1 - scallop) * t ** 4 * 0.5, Math.cos(angle) * radius];
  }
  const position = [];
  const colors = [];
  const index = [];
  const ribs = design.panels * 12;
  const rows = [0.012, 0.22, 0.43, 0.64, 0.83, 0.90, 0.943, 1, 1 + design.edge / design.radius];
  const tones = [base, dark, light, trim].map((value) => new THREE.Color(value));
  const shade = new THREE.Color();
  for (let row = 0; row < rows.length; row++) {
    const radius = rows[row];
    for (let i = 0; i <= ribs; i++) {
      const angle = i / ribs * TAU;
      const fold = row === rows.length - 1 ? (Math.cos(angle * design.panels * 5) * 0.009) : 0;
      const point = clothPoint(angle, radius, fold);
      if (row === rows.length - 1) point[1] += Math.cos(angle * design.panels * 5) * 0.008 - 0.014;
      position.push(...point);
      const panel = Math.floor((i % ribs) / 12);
      const stripe = i % 12;
      if (row >= rows.length - 2) shade.copy(tones[1]).lerp(tones[2], (stripe % 2) * 0.30 + 0.35);
      else if (row === rows.length - 3) shade.copy(tones[2]);
      else if (season === 'winter' && (stripe === 2 || stripe === 10)) shade.copy(tones[1]);
      else if (season === 'winter' && panel % 3 === 0 && row > 2) shade.copy(tones[2]).lerp(tones[0], 0.3);
      else if (season === 'summer') shade.copy(tones[panel % 2 === 0 ? 0 : 2]);
      else shade.copy(tones[0]).lerp(tones[panel % 2 === 0 ? 2 : 1], 0.26 * (1 + Math.cos(angle * design.panels)));
      colors.push(shade.r, shade.g, shade.b);
      if (row > 0 && i > 0) {
        const b = row * (ribs + 1) + i;
        const a = b - ribs - 1;
        index.push(a - 1, a, b - 1, b - 1, a, b);
      }
    }
  }
  const canopy = new THREE.BufferGeometry();
  canopy.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  canopy.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  canopy.setIndex(index);
  canopy.computeVertexNormals();
  mesh(cloth, canopy, paper('#ffffff')).name = 'parasol-canopy';

  // The motifs are small die-cut appliqués on alternate canopy panels.
  const appliques = new THREE.Shape();
  const leaf = [[0,1], [.18,.41], [.66,.73], [.55,.26], [1,.32], [.67,-.23], [.77,-.48], [.2,-.47], [.07,-.98], [-.06,-.98], [-.17,-.48], [-.74,-.49], [-.61,-.20], [-.94,.28], [-.48,.25], [-.59,.70], [-.16,.41]];
  const count = season === 'spring' ? 40 : season === 'autumn' ? leaf.length : design.motif * 4;
  for (let i = 0; i < count; i++) {
    const a = i / count * TAU;
    let r = 0.025;
    if (season === 'spring') r *= 0.82 + 0.2 * Math.cos(a * 5);
    else if (season === 'winter') r *= [1.18, 0.30, 0.52, 0.30][i % 4];
    else if (season === 'summer') r *= i % 4 < 2 ? 1 : 0.70;
    const x = season === 'autumn' ? leaf[i][0] * 0.028 : Math.cos(a) * r;
    const y = season === 'autumn' ? leaf[i][1] * 0.036 : Math.sin(a) * r;
    if (i === 0) appliques.moveTo(x, y); else appliques.lineTo(x, y);
  }
  appliques.closePath();
  const patch = new THREE.ShapeGeometry(appliques);
  owned.push(patch);
  for (let i = 0; i < design.panels; i++) {
    const angle = (i + 0.5) / design.panels * TAU;
    const motif = new THREE.Mesh(patch, paper(i % 2 === 0 && season === 'winter' ? '#9b344c' : trim));
    motif.position.set(...clothPoint(angle, season === 'autumn' ? 0.61 : 0.71));
    motif.position.y += 0.006;
    motif.rotation.order = 'YXZ';
    motif.rotation.set(-Math.PI / 2 + 0.23, angle, 0);
    cloth.add(motif);
  }
  return {
    group: parasol,
    pose(amount, tilt) {
      open.visible = amount > 0.32;
      cane.visible = !open.visible;
      swivel.rotation.y = tilt;
      const spread = Math.max(0.08, amount);
      cloth.scale.set(spread, 0.84 + 0.16 * spread, spread);
    },
    dispose() { parasol.removeFromParent(); for (const geometry of owned) geometry.dispose(); },
  };
}

export function createWardrobe({ assets, materials, parts, rig, world, position }) {
  const arm = parts.arm_l?.part;
  const grip = new THREE.Vector3();
  const viewpoint = new THREE.Vector3();
  const seasons = {};
  const spring = new Map(GARMENT_PARTS.map((part) => {
    const mesh = parts[part]?.part;
    return [part, mesh?.isMesh ? mesh.geometry : null];
  }));
  let season;
  let active;
  let amount;
  let tilt;
  let side = 1;
  let night = false;
  return {
    get season() { return season; },
    get parasol() { return active?.group; },
    get umbrellaMode() { return night ? 'cane' : 'open'; },
    update(dt, isNight, camera) {
      night = isNight;
      const next = SEASON[world.biomeAt?.(position.x, position.z)] || 'spring';
      if (next !== season) {
        season = next;
        const costume = assets.travellerSkins?.get(season);
        for (const [name, original] of spring) {
          if (!original) continue;
          parts[name].part.geometry = costume?.getObjectByName(name)?.geometry || original;
        }
        if (active) active.group.visible = false;
        if (arm && materials) {
          active = seasons[season] ??= createParasol(season, materials);
          if (!active.group.parent) rig.add(active.group);
          active.group.visible = true;
        }
      }
      if (!active) return;
      const end = night ? 0 : 1;
      amount ??= end;
      const step = dt / 0.29;
      amount += THREE.MathUtils.clamp(end - amount, -step, step);
      grip.set(0.035, -0.11, 0.016);
      arm.localToWorld(grip);
      active.group.position.copy(rig.worldToLocal(grip));

      let direction = 0;
      if (camera && amount > 0) {
        camera.getWorldPosition(viewpoint);
        rig.worldToLocal(viewpoint);
        const length = Math.hypot(viewpoint.x, viewpoint.z) || 1;
        const x = viewpoint.x / length;
        const z = viewpoint.z / length;
        const handSide = grip.x * z - grip.z * x;
        // Tip the canopy out toward the screen edge so it clears the face when the traveller turns.
        if (Math.abs(handSide) > 0.045) side = Math.sign(handSide);
        direction = Math.atan2(x * side + z * 0.16, z * side - x * 0.16);
      }
      tilt ??= direction;
      const delta = direction - tilt;
      tilt += Math.atan2(Math.sin(delta), Math.cos(delta)) * (1 - Math.exp(-dt * 15));
      active.pose(amount, tilt);
    },
    dispose() { for (const entry of Object.values(seasons)) entry.dispose(); },
  };
}
