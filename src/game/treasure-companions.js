import { animals } from '../core/config/animals.js';

const artRoot = `${import.meta.env.BASE_URL}textures/art/`;
const stickerPoses = ['sit', 'sleep', 'stretch', 'tail_up', 'walk_a'];
let spriteSheet;

export function loadTreasureSprites() {
  spriteSheet ??= fetch(`${artRoot}animals.json`).then(async (response) => {
    if (!response.ok) throw new Error('Animal sprite metadata is unavailable');
    const atlas = await response.json();
    const sheet = new Image();
    sheet.src = `${artRoot}${atlas.image || 'animals.png'}`;
    await sheet.decode();
    return { sheet, frames: atlas.animals };
  }).catch(() => {
    spriteSheet = undefined;
    return null;
  });
  return spriteSheet;
}

export function createTreasureCompanions() {
  const element = document.createElement('div');
  element.className = 'treasure-companions';
  element.setAttribute('aria-hidden', 'true');
  element.hidden = true;
  const cats = animals.companion.members.map(({ coat }, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    element.append(canvas);
    return { coat, canvas, ctx: canvas.getContext('2d'), direction: i === 0 ? 1 : -1, pose: '', previousSticker: '' };
  });
  let session;

  function hide() {
    session?.abort();
    session = undefined;
    element.hidden = true;
  }

  async function show() {
    hide();
    const controller = new AbortController();
    session = controller;
    const sprites = await loadTreasureSprites();
    if (controller.signal.aborted || !sprites) {
      if (session === controller) hide();
      return;
    }
    const { sheet, frames } = sprites;
    if (cats.some(({ coat, ctx }) => !ctx || !frames?.[coat]?.poses?.sit)) {
      hide();
      return;
    }
    element.hidden = false;

    function paint(cat, pose) {
      const { canvas, coat, ctx, direction } = cat;
      if (cat.pose === pose) return;
      cat.pose = pose;
      const { x, y, w, h, footY, ax } = frames[coat].poses[pose] || frames[coat].poses.sit;
      const scale = 0.4;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(direction, 0, 0, 1, direction < 0 ? canvas.width : 0, 0);
      ctx.drawImage(sheet, x, y, w, h, canvas.width / 2 - ax * scale,
        canvas.height - 6 - footY * scale, w * scale, h * scale);
      ctx.resetTransform();
    }

    let used;
    for (const cat of cats) {
      const available = stickerPoses.filter((pose) => frames[cat.coat].poses[pose]);
      const fresh = available.filter((pose) => pose !== cat.previousSticker && pose !== used);
      const pose = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : available[0];
      paint(cat, pose);
      cat.previousSticker = used = pose;
    }
  }

  return { element, show, hide };
}
