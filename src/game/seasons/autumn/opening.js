import { MathUtils } from 'three';

export const revealTime = 2.05;

export function createOpeningSweep(intro) {
  const canvas = document.createElement('canvas');
  canvas.className = 'autumn-intro-wind';
  canvas.setAttribute('aria-hidden', 'true');
  const ink = canvas.getContext('2d');
  const maple = new Image();
  maple.src = new URL('./art/leaf.webp', import.meta.url).href;
  const tau = Math.PI * 2;
  const leaves = Array.from({ length: 54 }, (_, i) => ({
    angle: i * 2.39996,
    start: (i * 37 % 51) / 125,
    depth: .52 + (i * 29 % 41) / 76,
    size: .56 + (i * 7 % 37) / 44,
    ribbon: i % 7 === 0,
  }));
  const { clamp, smoothstep } = MathUtils;
  let width = 1, height = 1, pixel = 1;

  function resize(w, h) {
    width = w;
    height = h;
    pixel = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * pixel);
    canvas.height = Math.round(h * pixel);
    ink.setTransform(pixel, 0, 0, pixel, 0, 0);
  }

  function reset() {
    intro.style.removeProperty('clip-path');
    ink.clearRect(0, 0, width, height);
  }

  function draw(time) {
    const p = clamp(time / revealTime, 0, 1);
    const opening = smoothstep(p, .27, .78);
    const edge = Array.from({ length: 17 }, (_, i) => {
      const y = i / 16;
      const rough = .026 * Math.sin(i * 4.4) + .013 * Math.cos(i * 2.32);
      return [width * (-.34 + opening * 1.72 + (y - .50) * .35 + rough), y * height];
    });
    intro.style.clipPath = 'polygon(100% 0, 100% 100%, ' + [...edge].reverse()
      .map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ') + ')';
    ink.clearRect(0, 0, width, height);

    const middle = Math.min(width, height);
    const sourceX = width * .53, sourceY = height * .40;
    const glimmer = Math.sin(Math.PI * smoothstep(p, .25, .79)) * .26;
    const light = ink.createRadialGradient(sourceX, sourceY, middle * .025, sourceX, sourceY, middle * .61);
    light.addColorStop(0, `rgba(255,226,158,${glimmer})`);
    light.addColorStop(1, 'rgba(255,163,77,0)');
    ink.fillStyle = light;
    ink.fillRect(0, 0, width, height);
    ink.beginPath();
    edge.forEach(([x, y], i) => i === 0 ? ink.moveTo(x, y) : ink.lineTo(x, y));
    ink.strokeStyle = `rgba(241,170,89,${glimmer * 2.4})`;
    ink.lineWidth = 7;
    ink.stroke();
    ink.strokeStyle = `rgba(255,226,167,${glimmer * 3.3})`;
    ink.lineWidth = 2;
    ink.stroke();

    if (!maple.naturalWidth) return;
    for (const leaf of leaves) {
      const t = clamp((p - leaf.start) / leaf.depth, 0, 1);
      if (t === 0 || t === 1) continue;
      const wind = smoothstep(t, 0, 1);
      const angle = leaf.angle + wind * 2.8;
      const radius = (.07 + wind * 1.24) * middle;
      const x = sourceX + Math.cos(angle) * radius * 1.48 + width * (-.10 + .39 * wind ** 2);
      const y = sourceY + Math.sin(angle) * radius * .77 + .32 * height * wind ** 2;
      const size = middle * (.022 + .29 * wind ** 2) * leaf.size;
      ink.save();
      ink.translate(x, y);
      ink.rotate(leaf.angle + t * tau * 1.15);
      ink.scale(.38 + .62 * Math.abs(Math.cos(t * 13 + leaf.angle)), 1);
      ink.globalAlpha = smoothstep(t, 0, .16) * (1 - smoothstep(t, .72, 1));
      if (leaf.ribbon) {
        ink.fillStyle = '#fbd081';
        ink.fillRect(-size * .87, -.8, size * .82, 1.6);
      }
      ink.drawImage(maple, -size / 2, -size / 2, size, size);
      ink.restore();
    }
  }

  return { canvas, resize, reset, draw };
}
