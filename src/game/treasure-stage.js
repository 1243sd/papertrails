const BASE = `${import.meta.env.BASE_URL}textures/art/treasure-scenes/`;
const WIDTH = 176;
const HEIGHT = 208;
const WALK_DURATION = 900;
const images = new Map();

function sprites(season) {
  if (!images.has(season)) {
    const image = new Image();
    image.src = `${BASE}${season}.webp`;
    images.set(season, image.decode().then(() => image).catch(() => {
      images.delete(season);
      return null;
    }));
  }
  return images.get(season);
}

export function createTreasureStage() {
  const element = document.createElement('div');
  element.className = 'treasure-stage';
  element.setAttribute('aria-hidden', 'true');
  element.hidden = true;
  const crest = document.createElement('img');
  crest.className = 'treasure-stage-fir';
  crest.alt = '';
  crest.hidden = true;
  const weather = document.createElement('div');
  weather.className = 'treasure-stage-weather';
  const canvas = document.createElement('canvas');
  canvas.className = 'treasure-stage-actor';
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  element.append(weather, canvas);
  const context = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0;
  let request = 0;

  function hide() {
    generation++;
    cancelAnimationFrame(request);
    element.hidden = true;
    crest.hidden = true;
    weather.replaceChildren();
  }

  function decorate(season) {
    const trim = document.createElement('span');
    trim.className = 'treasure-stage-trim';
    trim.dataset.season = season;
    weather.append(trim);
    if (season === 'summer') {
      const sun = document.createElement('span');
      sun.className = 'treasure-stage-sun';
      weather.append(sun);
      return;
    }
    if (season === 'autumn') {
      const leaf = document.createElement('i');
      leaf.className = 'treasure-stage-flake treasure-stage-catching-leaf';
      weather.append(leaf);
    }
    const count = season === 'winter' ? 26 : 16;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('i');
      piece.className = 'treasure-stage-flake';
      piece.style.left = (i * 37 % count) / count * 100 + '%';
      piece.style.setProperty('--size', 5 + (i * 5 % 10) + 'px');
      piece.style.setProperty('--fall', 6 + (i * 11 % 57) / 10 + 's');
      piece.style.setProperty('--delay', -(i * 13 % 87) / 10 + 's');
      piece.style.setProperty('--drift', (i * 17 % 80) - 44 + 'px');
      weather.append(piece);
    }
  }

  async function show(season) {
    hide();
    const active = generation;
    element.dataset.scene = season;
    delete element.dataset.pose;
    decorate(season);
    if (season === 'winter') {
      if (!crest.hasAttribute('src')) crest.src = `${BASE}winter-tree.webp`;
      crest.hidden = false;
    }
    element.hidden = false;
    canvas.hidden = true;
    const image = await sprites(season);
    if (!image || !context || generation !== active) return;
    canvas.hidden = false;
    const autumn = season === 'autumn';
    let previousFrame = -1;
    const start = performance.now();
    function update(now) {
      const time = motion.matches ? Infinity : now - start;
      const travel = Math.min(1, time / WALK_DURATION);
      const pose = time < WALK_DURATION ? 'walk' : autumn ? 'catch' : 'idle';
      const frame = pose === 'walk' ? Math.floor(time / 76) % 12
        : autumn ? 12 + Math.min(11, Math.floor((time - WALK_DURATION) / 66)) : 12;
      if (frame !== previousFrame) {
        previousFrame = frame;
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.drawImage(image, WIDTH * (frame % 6), HEIGHT * Math.floor(frame / 6), WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
        element.dataset.pose = pose;
      }
      const rest = season === 'winter' ? 16 : 20;
      canvas.style.left = (-30 + (rest + 30) * (1 - (1 - travel) ** 1.3)) + '%';
      if (time < WALK_DURATION + (autumn ? 750 : 0)) request = requestAnimationFrame(update);
    }
    update(start);
  }

  return { element, crest, show, hide };
}
