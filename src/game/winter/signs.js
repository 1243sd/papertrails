import * as THREE from 'three';

const boardWidth = 1.82;
const boardHeight = .68;

function paint(canvas, direction, label, lit) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (direction < 0) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  const outline = new Path2D('M25 43 L355 40 L359 23 L485 96 L359 165 L356 147 L24 150 L18 137 L23 114 L18 91 L24 67 Z');
  const wood = ctx.createLinearGradient(0, 42, 0, 150);
  wood.addColorStop(0, lit ? '#d3924d' : '#a76c43');
  wood.addColorStop(.52, lit ? '#af6732' : '#875033');
  wood.addColorStop(1, lit ? '#864423' : '#613827');
  ctx.fillStyle = wood;
  ctx.fill(outline);
  ctx.strokeStyle = lit ? '#ffc475' : '#4d2e27';
  ctx.lineWidth = 7;
  ctx.stroke(outline);
  ctx.save();
  ctx.clip(outline);
  for (let i = 0; i < 8; i++) {
    const y = 52 + i * 14;
    ctx.beginPath();
    ctx.moveTo(17, y);
    ctx.bezierCurveTo(134, y + 13, 281, y - 14, 477, y);
    ctx.strokeStyle = i % 2 ? '#dba26550' : '#3d201752';
    ctx.lineWidth = i % 2 ? 2 : 3;
    ctx.stroke();
  }
  ctx.restore();
  const cap = new Path2D('M21 47 Q11 40 25 33 Q66 22 107 31 Q150 39 203 32 Q250 27 292 32 Q336 33 349 29 Q350 11 363 17 Q389 25 423 57 L405 55 Q386 42 367 33 Q361 57 343 48 Q316 43 286 49 Q258 53 239 45 Q216 41 199 52 Q177 54 156 46 Q124 43 104 50 Q86 52 70 46 Q42 41 21 47 Z');
  ctx.fillStyle = '#aac8d2';
  ctx.fill(cap);
  ctx.translate(0, -6);
  ctx.fillStyle = '#edf5ed';
  ctx.fill(cap);
  ctx.restore();

  ctx.save();
  ctx.translate(direction < 0 ? 419 : 93, 35);
  ctx.lineWidth = 7;
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? -1 : 1;
    const x = (i - 2) * 16;
    ctx.strokeStyle = side > 0 ? '#416b51' : '#2b5945';
    ctx.beginPath();
    ctx.moveTo(x - 10, 5);
    ctx.lineTo(x + 7, -9 + 5 * side);
    ctx.stroke();
  }
  ctx.fillStyle = '#ad3d3f';
  for (const [x,y] of [[-9,0],[4,5],[8,-8]]) {
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = lit ? '#fff8d7' : '#ffebc7';
  ctx.font = 'bold 46px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = lit ? '#ffe29a' : '#3b221a';
  ctx.shadowBlur = lit ? 13 : 3;
  ctx.fillText(label, direction < 0 ? 283 : 228, 100);
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(direction < 0 ? '←' : '→', direction < 0 ? 85 : 427, 94);
  ctx.restore();
}

export function createWinterSigns(stage, buttons) {
  const { scene, camera, group, box, mesh, sheet, shadow, owned, groundY } = stage;
  const projected = new THREE.Vector3();
  const x = 3.12, z = 2.94;
  const post = group(scene, 'winter-chapter-post', x, groundY(x, z), z);
  const pole = box(post, '#704529', .15, 1, .15, 0, .5, -.045);
  const cap = sheet(post, '#e6f1e9', .23, .20, .055, 0, 1.07, -.045, .08);
  sheet(post, '#d8e9e6', .58, .34, .055, 0, .016, 0, .16);
  shadow(post, 0, 0, .91, .54, .015, .38);

  const signs = buttons.map((button, i) => {
    const direction = i === 0 ? -1 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 192;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map, alphaTest: .34, side: THREE.DoubleSide });
    owned.add(map);
    owned.add(material);
    const board = mesh(post, new THREE.PlaneGeometry(boardWidth, boardHeight), material, 0, .94, .055);
    board.name = direction < 0 ? 'winter-sign-left' : 'winter-sign-right';
    board.rotation.set(-.12, direction * -.075, direction * .028);
    return { board, canvas, map, button, direction, appearance: '', centerY: 0, hitHeight: 0 };
  });

  function update(width, height, visible) {
    camera.updateMatrixWorld();
    post.visible = visible;
    const stacked = signs.every(({ button }) => !button.hidden);
    const poleHeight = stacked ? 1.46 : 1.08;
    pole.scale.y = poleHeight;
    pole.position.y = poleHeight / 2;
    cap.position.y = poleHeight - .01;
    let nearestTop = height;
    for (const sign of signs) {
      const { board, canvas, map, button, direction } = sign;
      board.visible = visible && !button.hidden;
      if (!board.visible) continue;
      board.position.y = stacked ? (direction > 0 ? 1.13 : .58) : .77;
      const lit = button.matches(':hover, :focus-visible');
      const appearance = button.textContent + lit;
      if (sign.appearance !== appearance) {
        sign.appearance = appearance;
        paint(canvas, direction, button.textContent, lit);
        map.needsUpdate = true;
      }
      board.updateWorldMatrix(true, false);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const x of [-.5, .5]) for (const y of [-.39, .39]) {
        projected.set(x * boardWidth, y * boardHeight, 0).applyMatrix4(board.matrixWorld).project(camera);
        const px = (1 + projected.x) * width / 2;
        const py = (1 - projected.y) * height / 2;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      button.style.left = (minX + maxX) / 2 + 'px';
      sign.centerY = (minY + maxY) / 2;
      sign.hitHeight = Math.max(44, maxY - minY);
      button.style.top = sign.centerY + 'px';
      button.style.width = Math.max(44, maxX - minX) + 'px';
      nearestTop = Math.min(nearestTop, minY);
    }
    // Keep the stacked arrows separately clickable when their projection is small.
    const heightLimit = stacked ? Math.max(1, Math.abs(signs[0].centerY - signs[1].centerY) - 1) : Infinity;
    for (const { board, button, hitHeight } of signs) {
      if (board.visible) button.style.height = Math.min(hitHeight, heightLimit) + 'px';
    }
    return nearestTop;
  }

  return { update };
}
