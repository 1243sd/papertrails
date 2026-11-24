import * as THREE from 'three';
import { bus } from '../../core/events.js';
import { qualitySettings } from '../../core/config.js';
import { createWinterStage } from './stage.js';
import { createWinterMotion } from './motion.js';
import { createWinterAlbum } from './album.js';
import { createWinterSigns } from './signs.js';
import './winter.css';

const chapters = ['冬日相遇', '我们的回忆', '冬日来信'];

export function createWinter({ renderer, controls, assets, materials, quality, progress, music, audio }) {
  if (!renderer || !document.getElementById('treasure-ui')) return null;
  const canvas = renderer.domElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'winter-book';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'winter-book-title');
  const veil = document.createElement('div');
  veil.className = 'winter-veil';
  veil.setAttribute('aria-hidden', 'true');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'winter-book-title';
  const exitHint = document.createElement('p');
  exitHint.className = 'winter-exit-hint';
  const esc = document.createElement('kbd');
  esc.textContent = 'Esc';
  exitHint.append(esc, ' 退出');
  header.append(title, exitHint);
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', '故事书章节');
  const chapterButtons = [-1, 1].map((direction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'winter-chapter-sign';
    button.addEventListener('click', () => {
      const index = chapter + direction;
      if (!stage || !chapters[index]) return;
      showChapter(index);
      if (index === 2) letterBody.focus({ preventScroll: true });
      else if (button.hidden) chapterButtons.find((sign) => !sign.hidden).focus({ preventScroll: true });
    });
    nav.append(button);
    return button;
  });
  const tools = document.createElement('div');
  tools.className = 'winter-album-tools';
  const photoStatus = document.createElement('p');
  photoStatus.setAttribute('aria-live', 'polite');
  const photoControls = [-1, 1].map((direction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = direction < 0 ? 'winter-photo-prev' : 'winter-photo-next';
    button.textContent = direction < 0 ? '←' : '→';
    button.setAttribute('aria-label', direction < 0 ? '上一项回忆' : '下一项回忆');
    button.addEventListener('click', () => { album?.shift(direction); updateCaption(); });
    return button;
  });
  tools.append(photoControls[0], photoStatus, photoControls[1]);
  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'winter-photo-zoom';
  zoom.addEventListener('click', () => {
    if (album.video) openVideo();
    else { album.togglePreview(); updateCaption(); }
  });
  tools.append(zoom);
  const player = document.createElement('section');
  player.className = 'winter-player';
  player.hidden = true;
  player.setAttribute('aria-label', '回忆视频');
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  const videoCaption = document.createElement('p');
  const videoClose = document.createElement('button');
  videoClose.type = 'button';
  videoClose.textContent = '关闭视频';
  videoClose.addEventListener('click', () => {
    releaseVideo();
    updateCaption();
    zoom.focus({ preventScroll: true });
  });
  video.addEventListener('error', () => {
    if (videoUrl) videoCaption.textContent = '无法播放这段视频，请检查浏览器支持的编码。';
  });
  player.append(videoClose, video, videoCaption);
  const reading = document.createElement('section');
  reading.className = 'winter-reading';
  reading.setAttribute('aria-label', '冬日来信');
  const ornaments = document.createElement('div');
  ornaments.className = 'winter-letter-sprig';
  ornaments.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 7; i++) {
    const leaf = document.createElement('i');
    leaf.style.setProperty('--leaf', i);
    ornaments.append(leaf);
  }
  const seal = document.createElement('span');
  seal.className = 'winter-letter-seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.textContent = '❄';
  const letterActions = document.createElement('footer');
  letterActions.className = 'winter-letter-actions';
  const letterClose = document.createElement('button');
  letterClose.type = 'button';
  letterClose.textContent = '合上信纸';
  letterClose.addEventListener('click', () => {
    showChapter(1);
    chapterButtons[1].focus({ preventScroll: true });
  });
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'winter-letter-reveal';
  reveal.textContent = '显示全文';
  reveal.addEventListener('click', () => {
    finishLetterReveal();
    letterBody.focus({ preventScroll: true });
  });
  const letterBody = document.createElement('div');
  letterBody.className = 'winter-letter-body';
  letterBody.tabIndex = 0;
  letterBody.setAttribute('aria-label', '信件正文');
  const pauseLetterScroll = () => { letterManualScroll = true; };
  letterBody.addEventListener('wheel', pauseLetterScroll, { passive: true });
  letterBody.addEventListener('touchstart', pauseLetterScroll, { passive: true });
  letterBody.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) pauseLetterScroll();
  });
  letterActions.append(reveal, letterClose);
  reading.append(ornaments, letterBody, seal, letterActions);
  dialog.append(header, reading, tools, nav, player, veil);
  document.getElementById('treasure-ui').append(dialog);

  let stage;
  let motion;
  let album;
  let signs;
  let resolve;
  const bufferSize = new THREE.Vector2();
  let focus;
  let pack;
  let packState = 'loading';
  let chapter = 0;
  let defaultTitle = '';
  let photosReady;
  let letterShown = false;
  let letterTime = 0;
  let letterOffset = 0;
  let letterManualScroll = false;
  let letterLines = [];
  let videoUrl = '';
  let resumeMusic = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1;

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    if (!stage) return;
    const { camera } = stage;
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(18 * Math.PI / 180) * Math.max(1, 1.22 / camera.aspect)));
    camera.updateProjectionMatrix();
    if (resolve) {
      renderer.getDrawingBufferSize(bufferSize);
      const scale = Math.min(1, 2200 / Math.max(bufferSize.x, bufferSize.y));
      resolve.target.setSize(Math.max(1, Math.round(bufferSize.x * scale)), Math.max(1, Math.round(bufferSize.y * scale)));
    }
    updateSigns();
    if (chapter === 2) measureLetter();
  }

  function configureResolve(samples) {
    if (resolve) {
      resolve.target.dispose();
      resolve.geometry.dispose();
      resolve.material.dispose();
      resolve = null;
    }
    if (!samples) return;
    const target = new THREE.WebGLRenderTarget(1, 1, { samples, stencilBuffer: false });
    const scene = new THREE.Scene();
    scene.name = 'winter-resolve';
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material));
    resolve = { target, scene, camera, geometry, material };
  }

  function close() {
    if (!stage) return;
    releaseVideo();
    finishLetterReveal();
    album.dispose();
    configureResolve(0);
    stage.dispose();
    stage = null;
    motion = null;
    album = null;
    signs = null;
    photosReady = null;
    letterBody.replaceChildren();
    dialog.close();
    controls?.clearInput();
    (focus?.isConnected && focus !== document.body ? focus : canvas).focus({ preventScroll: true });
    focus = null;
  }

  function open({ title: heading = '冬日相遇' } = {}) {
    if (stage) close();
    stage = createWinterStage({ assets, materials });
    motion = createWinterMotion(stage, quality);
    album = createWinterAlbum(stage);
    signs = createWinterSigns(stage, chapterButtons);
    configureResolve(qualitySettings(quality).msaa);
    defaultTitle = heading;
    letterShown = false;
    dialog.dataset.animateLetter = 'false';
    showChapter(0);
    loadAlbum();
    resize(width, height);
    update(0);
    focus = document.activeElement;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
  }

  function update(dt) {
    if (!motion) return;
    motion.update(dt);
    album.update(dt, motion.frameAmount, reduced.matches);
    veil.style.opacity = motion.cover;
    updateSigns();
    if (chapter === 2 && letterShown) updateLetter(dt);
  }

  function updateSigns() {
    nav.hidden = !stage.foreground.visible || album.preview || !!videoUrl;
    const top = signs.update(width, height, !nav.hidden);
    reading.style.setProperty('--sign-top', top + 'px');
  }

  function updateCaption() {
    const count = album.count;
    const prefix = count > 1 ? (album.selected + 1) + ' / ' + count + '　' : '';
    let caption;
    if (packState === 'error') caption = '无法读取本地宝藏包。';
    else if (packState === 'loading' || (album.status === 'loading' && !album.currentReady)) caption = '回忆正在加载…';
    else if (!count) caption = '相框还空着。回到地图后按 I 导入宝藏包。';
    else if (!album.currentReady) caption = '这项回忆无法加载。';
    else caption = (album.isVideo ? '视频 · ' : '') + (album.caption || '冬日纪念照');
    photoStatus.textContent = prefix + caption;
    for (const button of photoControls) button.hidden = count < 2;
    zoom.hidden = !album.currentReady;
    tools.hidden = chapter !== 1 || Boolean(videoUrl);
    zoom.textContent = album.isVideo ? '播放视频' : album.preview ? '收起原图' : '查看原图';
    zoom.setAttribute('aria-label', album.isVideo ? '播放视频' : album.preview ? '收起照片' : '放大照片');
    updateSigns();
  }

  function openVideo() {
    const blob = album.video;
    if (!blob) return;
    releaseVideo();
    videoUrl = URL.createObjectURL(blob);
    resumeMusic = !!music?.on;
    if (resumeMusic) music.toggle();
    videoCaption.textContent = album.caption;
    player.hidden = false;
    video.muted = !!audio?.muted;
    video.src = videoUrl;
    video.play().catch(() => {});
    updateCaption();
    videoClose.focus({ preventScroll: true });
  }

  function releaseVideo() {
    if (!videoUrl) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
    videoUrl = '';
    player.hidden = true;
    if (resumeMusic && !music.on) music.toggle();
    resumeMusic = false;
  }

  function measureLetter() {
    if (dialog.dataset.animateLetter !== 'true') return;
    let start = .57;
    const article = letterBody.querySelector('article');
    letterLines = [...article.querySelectorAll('p')].map((p) => {
      const lineHeight = parseFloat(getComputedStyle(p).lineHeight);
      const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lineHeight));
      const row = { p, lineHeight, lines, start, top: article.offsetTop + p.offsetTop, revealed: -1 };
      start += lines * .21 + .10;
      p.style.setProperty('--line-count', lines);
      return row;
    });
    updateLetter(0);
  }

  function finishLetterReveal() {
    dialog.dataset.animateLetter = 'false';
    for (const { p } of letterLines) p.style.removeProperty('clip-path');
    letterLines = [];
  }

  function updateLetter(dt) {
    letterTime += dt;
    const max = Math.max(0, letterBody.scrollHeight - letterBody.clientHeight);
    let target = max;
    if (letterLines.length) {
      let edge = 0;
      for (const row of letterLines) {
        const revealed = THREE.MathUtils.clamp(Math.floor((letterTime - row.start) / .21), 0, row.lines);
        if (revealed !== row.revealed) {
          row.revealed = revealed;
          row.p.style.clipPath = 'inset(0 0 ' + 100 * (1 - revealed / row.lines) + '% 0)';
        }
        if (revealed) edge = row.top + revealed * row.lineHeight;
      }
      target = THREE.MathUtils.clamp(edge + 28 - letterBody.clientHeight, 0, max);
      if (letterLines.at(-1).revealed === letterLines.at(-1).lines) finishLetterReveal();
    } else if (letterTime < 2.4) return;
    if (reduced.matches || letterManualScroll || !max) return;
    const speed = letterLines.length ? 72 : 26;
    letterOffset = Math.min(target, letterOffset + speed * dt);
    letterBody.scrollTop = letterOffset;
  }

  function showLetter() {
    if (letterShown) return;
    const letter = pack?.manifest?.treasures?.winter?.letter;
    if (!letter || !Array.isArray(letter.paragraphs) || !letter.paragraphs.length
      || ![letter.salutation, ...letter.paragraphs, letter.signature].every((line) => typeof line === 'string' && line.trim())) {
      letterBody.textContent = packState === 'loading' ? '正在取出信件…'
        : packState === 'error' ? '无法读取本地宝藏包。' : '这封信还未放进故事书。';
      return;
    }
    if (packState !== 'ready') return;
    letterBody.replaceChildren();
    const article = document.createElement('article');
    article.className = 'winter-letter';
    const lines = [letter.salutation, ...letter.paragraphs, letter.signature];
    lines.forEach((line, i) => {
      const p = document.createElement('p');
      p.textContent = line;
      if (i === lines.length - 1) p.className = 'winter-signature';
      article.append(p);
    });
    letterBody.append(article);
    letterShown = true;
    letterTime = 0;
    dialog.dataset.animateLetter = String(!!progress.revealWinterLetter() && !reduced.matches);
    if (dialog.dataset.animateLetter === 'true') {
      const envelope = document.createElement('div');
      envelope.className = 'winter-envelope';
      envelope.setAttribute('aria-hidden', 'true');
      envelope.append(document.createElement('i'), document.createElement('b'));
      letterBody.prepend(envelope);
      measureLetter();
    }
  }

  function showChapter(index) {
    if (chapter === 2 && index !== 2) finishLetterReveal();
    if (index !== 1) releaseVideo();
    const enteringLetter = index === 2 && chapter !== 2;
    chapter = index;
    dialog.dataset.chapter = String(index);
    title.textContent = pack?.manifest?.treasures?.winter?.title || defaultTitle;
    chapterButtons.forEach((button, i) => {
      const target = index + (i === 0 ? -1 : 1);
      const name = chapters[target];
      button.hidden = !name;
      button.textContent = name ?? '';
      button.dataset.chapterTarget = target;
      button.setAttribute('aria-label', name ? (i === 0 ? '上一章：' : '下一章：') + name : '');
    });
    reading.hidden = index !== 2;
    tools.hidden = index !== 1;
    motion.setChapter(index);
    album.setChapter(index);
    updateSigns();
    if (index === 1) updateCaption();
    if (enteringLetter) {
      letterBody.scrollTop = 0;
      letterTime = letterOffset = 0;
      letterManualScroll = false;
    }
    if (index === 2 && !letterShown) showLetter();
  }

  function loadAlbum() {
    const activeAlbum = album;
    const loading = album.load(pack, quality);
    photosReady = loading;
    loading.then(() => {
      if (album !== activeAlbum || photosReady !== loading) return;
      if (chapter === 1) updateCaption();
    });
  }

  function setPack(value, status = value ? 'ready' : 'empty') {
    pack = value;
    packState = status;
    if (!stage) return;
    releaseVideo();
    letterShown = false;
    finishLetterReveal();
    letterTime = letterOffset = 0;
    letterManualScroll = false;
    letterBody.replaceChildren();
    loadAlbum();
    showChapter(chapter);
  }

  function render() {
    if (!stage) return false;
    const target = renderer.getRenderTarget();
    const face = renderer.getActiveCubeFace();
    const mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear;
    renderer.autoClear = true;
    try {
      renderer.setRenderTarget(resolve?.target ?? null);
      renderer.render(stage.scene, stage.camera);
      if (resolve) {
        renderer.setRenderTarget(null);
        renderer.render(resolve.scene, resolve.camera);
      }
    }
    finally {
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(target, face, mip);
    }
    return true;
  }

  const unsubscribe = bus.on('resize', ({ width, height }) => resize(width, height));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || event.target !== dialog || !motion) return;
    const x = THREE.MathUtils.clamp((event.clientX / width) * 2 - 1, -1, 1);
    const y = THREE.MathUtils.clamp(1 - (event.clientY / height) * 2, -1, 1);
    motion.aim(x, y);
    dialog.style.cursor = chapter !== 2 && album.hover(x, y) ? 'pointer' : '';
  });
  dialog.addEventListener('pointerleave', () => {
    motion?.aim(0, 0);
    album?.hover();
    dialog.style.cursor = '';
  });
  dialog.addEventListener('click', (event) => {
    if (!stage || chapter === 2 || event.target !== dialog) return;
    const picked = album.pick((event.clientX / width) * 2 - 1, 1 - (event.clientY / height) * 2);
    if (picked) showChapter(1);
    if (picked === 'video') openVideo();
  });

  return {
    get active() { return !!stage; },
    get ready() { return stage?.ready; },
    get photosReady() { return photosReady; },
    setPack,
    open, close, resize, render,
    update,
    setQuality(level) {
      if (quality === level) return;
      quality = level;
      if (!stage) return;
      motion.setQuality(level);
      configureResolve(qualitySettings(quality).msaa);
      resize(width, height);
    },
    dispose() {
      close();
      unsubscribe();
      dialog.remove();
    },
  };
}
