const portraits = {
  boy: new URL('./art/boy.webp', import.meta.url).href,
  girl: new URL('./art/girl.webp', import.meta.url).href,
};
const avenuePrint = new URL('./art/lane.webp', import.meta.url).href;
const greetingSticker = new URL('./art/greeting.png', import.meta.url).href;

export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function button(text, onClick, className) {
  const element = node('button', className, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

function emblem(label, glyph, onClick, className = '') {
  const element = button('', onClick, 'autumn-emblem ' + className);
  element.append(node('span'));
  setEmblem(element, label, glyph);
  return element;
}

function setEmblem(element, label, glyph) {
  if (element.dataset.glyph === glyph) return;
  element.dataset.glyph = glyph;
  element.setAttribute('aria-label', label);
  element.title = label;
  element.firstChild.textContent = label;
}

export function page(title, date, close) {
  const element = node('article', 'autumn-paper');
  const heading = node('header', 'autumn-paper-head');
  heading.append(node('h2', '', title));
  if (date) heading.append(node('time', '', date));
  heading.append(emblem('关闭', '×', close, 'autumn-page-close'));
  const body = node('div', 'autumn-paper-body');
  body.tabIndex = 0;
  element.append(heading, body);
  return { element, heading, body };
}

export function createPhotoLoader(image, fallback) {
  let generation = 0, current;
  function clear() {
    generation++;
    if (current) URL.revokeObjectURL(current);
    current = undefined;
    image.removeAttribute('src');
    image.hidden = true;
    fallback.hidden = false;
  }
  async function load(blob, description) {
    clear();
    if (!blob) return;
    const token = generation;
    const candidate = new Image();
    const url = URL.createObjectURL(blob);
    current = url;
    candidate.src = url;
    try { await candidate.decode(); }
    catch {
      if (generation === token) clear();
      return;
    }
    if (generation !== token) return;
    image.alt = description;
    image.src = url;
    image.hidden = false;
    fallback.hidden = true;
  }
  return { load, clear };
}

function autoFollow(body) {
  let follow = true, lastTop = 0;
  const atBottom = () => body.scrollHeight - body.clientHeight - body.scrollTop <= 3;
  body.addEventListener('wheel', (event) => { if (event.deltaY < 0) follow = false; }, { passive: true });
  body.addEventListener('touchstart', () => { follow = false; }, { passive: true });
  body.addEventListener('pointerdown', () => { follow = false; });
  body.addEventListener('pointerup', () => { if (atBottom()) follow = true; });
  body.addEventListener('keydown', (event) => {
    if (['Home', 'PageUp', 'ArrowUp'].includes(event.code)) follow = false;
  });
  body.addEventListener('scroll', () => {
    if (atBottom()) follow = true;
    else if (body.scrollTop < lastTop - 1) follow = false;
    lastTop = body.scrollTop;
  });
  return (dt) => {
    if (!follow) return;
    const end = body.scrollHeight - body.clientHeight;
    if (end > body.scrollTop) body.scrollTop = Math.min(end, body.scrollTop + Math.max(1, (end - body.scrollTop) * dt * 12));
  };
}

export function createChat(spec, pack, close, reduced) {
  const { element, heading, body } = page(spec.title, spec.date, close);
  element.classList.add('autumn-chat');
  const sheet = node('div', 'autumn-chat-sheet');
  const keepsake = node('div', 'autumn-chat-keepsake');
  keepsake.setAttribute('aria-hidden', 'true');
  const cover = node('img');
  cover.src = avenuePrint;
  cover.alt = '';
  keepsake.append(cover);
  sheet.append(heading, body);
  element.append(keepsake, sheet, node('i', 'autumn-chat-leaf'));
  body.setAttribute('aria-label', '聊天记录');
  const scroll = autoFollow(body);
  const notes = node('ol', 'autumn-messages');
  body.append(notes);
  let start = .35;
  let sticker;
  const beats = spec.messages.map(([side, copy]) => {
    const item = node('li', 'autumn-message');
    item.dataset.speaker = side;
    item.hidden = true;
    const avatar = node('img', 'autumn-avatar');
    avatar.src = portraits[side];
    avatar.alt = side === 'boy' ? '男生头像' : '女生头像';
    avatar.width = avatar.height = 36;
    const text = copy === null ? null : node('p');
    const content = node('div', text ? 'autumn-bubble' : 'autumn-sticker-media');
    item.append(avatar, content);
    notes.append(item);
    if (text) content.append(text);
    else {
      const original = node('img', 'autumn-sticker');
      original.src = greetingSticker;
      original.alt = '打招呼的表情包';
      original.width = 129;
      original.height = 107;
      content.append(original);
      const path = pack?.manifest.treasures.autumn.memories?.firstChat?.sticker;
      const blob = pack?.images[path];
      if (blob) {
        const image = node('img', 'autumn-sticker');
        content.append(image);
        sticker = createPhotoLoader(image, original);
        sticker.load(blob, original.alt);
      }
    }
    const letters = Array.from(copy ?? ''), from = start;
    start += text ? letters.length * .043 + .53 : .66;
    return { from, letters, item, text };
  });
  const route = node('div', 'autumn-route');
  if (spec.id === 'decision') {
    route.append(node('span', '', '她所在的地方'), node('i'), node('span', '', '他所在的地方'));
    route.hidden = true;
    body.append(route);
  }
  let time = reduced ? start + 1 : 0;
  function update(dt) {
    time += dt;
    for (const { from, letters, item, text } of beats) {
      if (time < from) continue;
      item.hidden = false;
      if (!text) continue;
      const value = letters.slice(0, Math.floor((time - from) / .043) + 1).join('');
      if (text.textContent !== value) text.textContent = value;
    }
    if (route.parentNode) route.hidden = time < start;
    scroll(dt);
  }
  return { element, update, dispose: () => sticker?.clear() };
}

export function createLetter(data, close, reduced) {
  const { element, body } = page('写给你的信', undefined, close);
  element.classList.add('autumn-letter');
  body.setAttribute('aria-label', '信件正文');
  const scroll = autoFollow(body);
  const parts = [data?.salutation, ...(data?.paragraphs ?? []), data?.signature].filter(Boolean);
  if (!parts.length) parts.push('这封信还在等你写下。');
  const paragraphs = parts.map((text) => {
    const p = node('p', '', text);
    p.hidden = !reduced;
    body.append(p);
    return p;
  });
  let time = reduced ? paragraphs.length : 0;
  const full = emblem('显示全文', '▤', () => { time = paragraphs.length; update(0); }, 'autumn-letter-tab');
  if (parts.length > 1) element.append(full);
  function update(dt) {
    time += dt;
    paragraphs.forEach((p, i) => { p.hidden = time < i * .45; });
    full.hidden = time >= (paragraphs.length - 1) * .45;
    scroll(dt);
  }
  return { element, update };
}

function photoAlbum(photos, images, { label, emptyLabel }) {
  const element = node('section', 'autumn-photo-album');
  element.setAttribute('aria-label', label);
  element.classList.toggle('autumn-photo-stack', photos.length > 1);
  let selected = 0;
  let motion = [];
  const cards = (photos.length ? photos : [null]).map((photo, index) => {
    const card = node('div', 'autumn-photo-card');
    const paper = node('figure', 'autumn-photo-paper');
    const page = node('div', 'autumn-photo-page');
    const image = node('img', 'autumn-photo-image');
    const empty = node('div', 'autumn-empty-photo', photo ? '照片暂时无法打开' : emptyLabel);
    const shine = node('i', 'autumn-photo-shine');
    shine.setAttribute('aria-hidden', 'true');
    const caption = node('figcaption', 'autumn-photo-caption', photo?.caption);
    caption.hidden = !photo?.caption;
    const lift = button('', (event) => flip(index, event.detail === 0), 'autumn-photo-lift');
    lift.setAttribute('aria-label', '翻开第 ' + (index + 1) + ' 张照片' + (photo?.caption ? '，' + photo.caption : ''));
    lift.append(node('span', 'autumn-photo-tab', '翻开'));
    const loader = createPhotoLoader(image, empty);
    loader.load(images?.[photo?.image], photo?.caption || label);
    page.append(image, empty, shine);
    paper.append(page, caption);
    card.append(paper, lift);
    element.append(card);
    return { card, paper, lift, shine, loader };
  });
  function arrange() {
    cards.forEach(({ card, paper, lift }, i) => {
      const front = i === selected;
      card.dataset.layer = front ? 'front' : 'back';
      paper.setAttribute('aria-hidden', String(!front));
      lift.hidden = front;
    });
  }

  function stopMotion() {
    motion.forEach((animation) => animation.cancel());
    motion = [];
  }

  function flip(index, keyboard) {
    if (index === selected) return;
    const incoming = cards[index];
    const outgoing = cards[selected];
    const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startIn = animate ? getComputedStyle(incoming.card).transform : '';
    const startOut = animate ? getComputedStyle(outgoing.card).transform : '';
    stopMotion();
    selected = index;
    arrange();
    if (keyboard) outgoing.lift.focus({ preventScroll: true });
    if (!animate) return;
    const pull = 'perspective(950px) translate(' + Math.min(element.clientWidth * .32, innerWidth * .16) +
      'px, -5%) rotateZ(11deg) rotateY(-29deg) scale(.95)';
    const tuck = 'perspective(950px) translate(-7%, 4%) rotateZ(-6deg) rotateY(11deg) scale(.97)';
    const timing = { duration: 625, easing: 'cubic-bezier(.29,.68,.29,1)' };
    motion = [
      incoming.card.animate([
        { transform: startIn, zIndex: 1, offset: 0 },
        { transform: pull, zIndex: 1, offset: .37 },
        { transform: pull, zIndex: 4, offset: .40 },
        { transform: getComputedStyle(incoming.card).transform, zIndex: 4, offset: 1 },
      ], timing),
      outgoing.card.animate([
        { transform: startOut, zIndex: 3, offset: 0 },
        { transform: tuck, zIndex: 3, offset: .37 },
        { transform: tuck, zIndex: 1, offset: .40 },
        { transform: getComputedStyle(outgoing.card).transform, zIndex: 1, offset: 1 },
      ], timing),
      incoming.shine.animate([
        { transform: 'translateX(-115%)', opacity: 0, offset: 0 },
        { transform: 'translateX(-36%)', opacity: .78, offset: .46 },
        { transform: 'translateX(115%)', opacity: 0, offset: 1 },
      ], timing),
    ];
  }

  function reset() {
    stopMotion();
    selected = 0;
    arrange();
  }

  arrange();
  return {
    element, reset,
    dispose() {
      reset();
      cards.forEach(({ loader }) => loader.clear());
    },
  };
}

export function createLegacy(pack, close) {
  const item = pack.manifest.treasures.autumn;
  const { element, body } = page(item.title, undefined, close);
  const album = photoAlbum([{ image: item.image }], pack.images, { label: item.title, emptyLabel: '照片暂时无法打开' });
  album.element.classList.add('autumn-keepsake-album');
  body.append(album.element, node('p', '', item.message));
  return { element, dispose: album.dispose };
}

export function filmControls(spec, director, pack, close) {
  const element = node('section', 'autumn-film-overlay');
  const photos = pack?.manifest.treasures.autumn.memories?.[spec.id]?.photos ?? [];
  const ending = spec.ending ?? spec.title;
  const album = photoAlbum(photos, pack?.images, { label: ending, emptyLabel: '留给真实照片的位置' });
  const frame = album.element;
  frame.classList.add('autumn-film-photo');
  let shown = false;
  const header = node('header', 'autumn-film-title');
  const name = node('h2', '', spec.title);
  const date = node('time', '', spec.date);
  date.dateTime = spec.date.replaceAll('.', '-');
  header.append(date, name);
  const subtitle = node('p', 'autumn-film-subtitle');
  const transport = node('footer', 'autumn-film-transport');
  const progress = node('progress', 'autumn-film-progress');
  progress.max = director.duration;
  progress.setAttribute('aria-label', '回忆播放进度');
  const clock = node('span', 'autumn-film-clock');
  clock.setAttribute('aria-hidden', 'true');
  const controls = node('nav', 'autumn-film-controls');
  controls.setAttribute('aria-label', '回忆播放控制');
  const pause = emblem('暂停', 'Ⅱ', () => { director.toggle(); update(); });
  const skip = emblem('跳到结尾', '›|', () => { director.skip(); update(); });
  const replay = emblem('重播', '↻', () => { director.replay(); update(); pause.focus(); });
  controls.append(pause, skip, replay, emblem('返回大道', '↩', close));
  transport.append(progress, clock, controls);
  element.append(header, frame, subtitle, transport);
  const formatTime = (seconds) => {
    const total = Math.floor(seconds);
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  };
  const totalTime = formatTime(director.duration);
  function update() {
    const { ended, paused, time } = director;
    element.dataset.paused = String(paused);
    element.dataset.time = time.toFixed(3);
    element.dataset.ended = String(ended);
    progress.value = time;
    const timestamp = formatTime(time) + ' / ' + totalTime;
    if (clock.textContent !== timestamp) clock.textContent = timestamp;
    pause.hidden = skip.hidden = ended;
    setEmblem(pause, paused ? '继续' : '暂停', paused ? '▶' : 'Ⅱ');
    const title = ended ? ending : spec.title;
    const line = ended ? spec.lastLine ?? '' : director.caption;
    if (name.textContent !== title) name.textContent = title;
    if (subtitle.textContent !== line) subtitle.textContent = line;
    frame.hidden = !ended;
    if (!ended && shown) album.reset();
    shown = ended;
  }
  update();
  return { element, update, dispose: album.dispose };
}
