import * as THREE from 'three';

const { clamp, lerp, smoothstep } = THREE.MathUtils;
let sources;

function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fade = (n) => n * n * (3 - 2 * n);
  const hash = (a, b) => {
    const n = Math.imul(a + seed * 97, 374761393) ^ Math.imul(b, 668265263);
    return (Math.imul(n ^ (n >>> 13), 1274126177) >>> 0) / 4294967295;
  };
  const u = fade(x - ix), v = fade(y - iy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), u), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}

function paintVapor(makeCanvas, seed, mist) {
  const width = 512, height = 216;
  const canvas = makeCanvas(width, height);
  const g = canvas.getContext('2d');
  const raster = g.createImageData(width, height);
  const billows = mist ? [
    [.22, .64, .26, .17], [.36, .54, .27, .19], [.55, .57, .33, .16], [.70, .44, .27, .24], [.83, .38, .17, .12],
  ] : [
    [.23, .64, .23, .19], [.33, .49, .19, .29], [.45, .42, .23, .33],
    [.56, .57, .39, .29], [.64, .41, .18, .36], [.77, .51, .22, .24], [.84, .62, .15, .17],
  ];
  for (let y = 0, i = 0; y < height; y++) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x++, i += 4) {
      const u = x / (width - 1);
      const broad = noise(u * 7, v * 4, seed);
      const billow = noise(u * 19 + 2, v * 10, seed + 1);
      const grain = noise(u * 43, v * 24 + 7, seed + 2);
      const turbulence = .53 * broad + .31 * billow + .16 * grain - .49;
      let density = -1;
      for (const [cx, cy, rx, ry] of billows) {
        const stretch = mist ? 2.4 : .82;
        const dx = (u - cx + turbulence * .16) / rx;
        const dy = (v - cy + turbulence * .23) / ry;
        density = Math.max(density, 1 - Math.sqrt(dx * dx + dy * dy / stretch));
      }
      const edge = smoothstep(Math.min(u, 1 - u, v, 1 - v), 0, .13);
      const opacity = smoothstep(density + turbulence * .8, -.14, mist ? .97 : .67) * edge;
      const tone = clamp(.84 - v * .46 + density * .18 + turbulence * .42, 0, 1);
      raster.data[i] = lerp(155, 254, tone);
      raster.data[i + 1] = lerp(183, 251, tone);
      raster.data[i + 2] = lerp(203, 240, tone);
      raster.data[i + 3] = opacity * 255;
    }
  }
  g.putImageData(raster, 0, 0);
  return canvas;
}

export function addSpringVapor({ makeCanvas, texture, own }, parent) {
  sources ??= [paintVapor(makeCanvas, 13, false), paintVapor(makeCanvas, 8, false), paintVapor(makeCanvas, 37, true)];
  const maps = sources.map(texture);
  const placements = [
    [-8.45, 3.32, -5.70, 5.2, 2.10, .78, 0],
    [7.90, 3.30, -8.20, 5.7, 2.25, .75, 1],
    [.28, 2.83, -15.40, 4.85, 1.14, .45, 2],
    [-7.14, 1.07, -.85, 4.9, 1.85, .86, 1],
    [7.71, 1.68, -1.30, 5.2, 1.76, .81, 0],
    [-10.22, -.24, -6.00, 5.5, 1.39, .45, 2],
    [11.10, -.98, -6.20, 6.2, 1.57, .58, 2],
    [-6.62, -1.22, 3.21, 6.9, 2.25, .92, 0],
    [6.92, -.94, 3.54, 7.3, 2.17, .87, 1],
    [.14, -2.08, -.10, 5.2, 1.97, .59, 1],
    [.23, 2.72, -6.50, 5.2, 1.62, .58, 1],
    [-3.10, -.55, 2.38, 5.2, .94, .58, 2, .68],
    [3.36, -.47, 2.73, 5.5, 1.03, .54, 2, .68],
    [.15, -.64, 3.72, 5.0, .60, .38, 2, .68],
    [-1.95, -.44, 4.72, 6.7, 1.13, .64, 2, 1.65],
    [-1.52, .29, 2.31, 4.57, .72, .54, 2, .92],
    [2.20, .15, 2.88, 3.91, .92, .53, 2, 1.04],
  ];
  const sprites = placements.map(([x, y, z, w, h, opacity, type, foregroundDrift = 0], i) => {
    const material = own(new THREE.SpriteMaterial({
      map: maps[type], opacity, transparent: true, depthWrite: false, depthTest: !foregroundDrift,
    }));
    const cloud = new THREE.Sprite(material);
    cloud.name = 'sky-cloud-' + i;
    if (foregroundDrift) cloud.renderOrder = 3;
    cloud.position.set(x, y, z);
    cloud.scale.set(w, h, 1);
    parent.add(cloud);
    return { cloud, x, y, z, opacity, foregroundDrift };
  });
  return (time) => {
    sprites.forEach(({ cloud, x, y, z, opacity, foregroundDrift }, i) => {
      const phase = i * 2.34;
      const t = time * (.13 + (i % 3) * .026) + phase;
      cloud.position.set(x + (foregroundDrift || .48) * Math.sin(t),
        y + (foregroundDrift ? .08 : .195) * Math.sin(t * 1.35 + phase), z + (foregroundDrift ? .24 : .12) * Math.cos(t));
      cloud.material.rotation = .05 * Math.sin(t * .74 + phase);
      cloud.material.opacity = opacity * (.96 + .04 * Math.sin(t * 1.72 + phase));
    });
  };
}
