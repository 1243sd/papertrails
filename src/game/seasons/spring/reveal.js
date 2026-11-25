import * as THREE from 'three';
import { addPaperSign } from './signs.js';

const TAG_WIDTH = 1.38;
const TAG_HEIGHT = 1.02;
const PAGE_WIDTH = 840;
const PAGE_HEIGHT = 1040;
const BODY_LINE = 59;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function linesFor(context, text, width) {
  return text.split(/\r\n?|\n/).flatMap((paragraph) => {
    const lines = [];
    let line = '';
    for (const { segment } of segmenter.segment(paragraph)) {
      if (line && context.measureText(line + segment).width > width) {
        lines.push(line);
        line = '';
      }
      line += segment;
    }
    return [...lines, line];
  });
}

function drawSprig(g, x, y, size) {
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.strokeStyle = '#6f8a68';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-30, 19);
  g.quadraticCurveTo(3, 23, 43, -22);
  g.stroke();
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < 4 ? '#a8b790' : '#dda5ae';
    g.beginPath();
    g.ellipse(-20 + i * 14, 12 - i * 7 + (i % 2 ? 9 : -7), i < 4 ? 10 : 8, 4.5, i % 2 ? -.16 : .8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function cardStock(g, width, height) {
  g.fillStyle = '#f7f0e5';
  g.fillRect(0, 0, width, height);
  for (let i = 0; i < 4900; i++) {
    g.fillStyle = i % 3 ? 'rgba(149,124,93,.065)' : 'rgba(255,252,234,.52)';
    g.fillRect(i * 83.17 % width, i * 39.71 % height, 1.2 + i % 3, 1);
  }
  g.strokeStyle = '#a8be91';
  g.lineWidth = 4;
  g.strokeRect(17, 17, width - 34, height - 34);
  g.lineWidth = 1.5;
  g.strokeRect(24, 24, width - 48, height - 48);
}

export function createSpringReveal(stage) {
  const { group, mesh, paper, own, texture, makeCanvas, garden, bloom } = stage;
  const photo = group(bloom.root, 'bloom-memory-frame');
  const frameBox = mesh(photo, new THREE.BoxGeometry(1, 1, .072), paper('#f7f0e5'));
  const matBoard = mesh(photo, new THREE.BoxGeometry(1, 1, .019), paper('#d9bcae'), 0, 0, .039);
  const photoMaterial = own(new THREE.MeshBasicMaterial({ color: '#f1e7d5' }));
  const image = mesh(photo, new THREE.PlaneGeometry(1, 1), photoMaterial, 0, .065, .052);
  image.name = 'bloom-imported-photo';
  image.castShadow = image.receiveShadow = false;
  const accession = makeCanvas(512, 62);
  const ink = accession.getContext('2d');
  drawSprig(ink, 64, 35, .5);
  ink.fillStyle = '#77745b';
  ink.font = '21px Georgia, serif';
  ink.fillText('BLOOM SPECIMEN   /   N° 01', 103, 42);
  const print = mesh(photo, new THREE.PlaneGeometry(.94, .113), own(new THREE.MeshBasicMaterial({
    map: texture(accession), transparent: true, depthWrite: false,
  })), 0, 0, .053);
  print.castShadow = print.receiveShadow = false;
  const photoReturn = addPaperSign(stage, photo, 'photo-return-tab', '← 返回花园', .56, .18);
  let frameWidth = 1.61, frameHeight = 1.19;
  function fitPhoto(ratio = 1.42) {
    const w = Math.min(1.42, .99 * ratio);
    const h = w / ratio;
    frameWidth = w + .22;
    frameHeight = h + .29;
    image.scale.set(w, h, 1);
    image.position.y = .053;
    matBoard.scale.set(w + .033, h + .032, 1);
    matBoard.position.y = image.position.y;
    frameBox.scale.set(frameWidth, frameHeight, 1);
    print.scale.x = Math.min(1, frameWidth / 1.04);
    print.position.y = -h / 2 - .048;
    photoReturn.sign.position.set(0, -frameHeight / 2 - .067, -.016);
  }
  fitPhoto();

  const post = group(garden, 'botanical-tag-stand', 1.98, .01, 1.54);
  const wood = paper('#9c8261');
  mesh(post, new THREE.BoxGeometry(.078, 1.10, .083), wood, 0, .55, -.03).rotation.z = -.09;
  const tag = group(post, 'botanical-memory-tag', .055, .99, .05);
  tag.rotation.set(-.24, -.12, -.06);
  const tagBacking = mesh(tag, new THREE.BoxGeometry(1, 1, .044), paper('#c7be9b'));
  const smallCard = makeCanvas(720, 530);
  const page = makeCanvas(PAGE_WIDTH, PAGE_HEIGHT);
  const smallMap = texture(smallCard), pageMap = texture(page);
  const tagMaterial = own(new THREE.MeshBasicMaterial({ map: smallMap }));
  const face = mesh(tag, new THREE.PlaneGeometry(1, 1), tagMaterial, 0, 0, .025);
  face.name = 'botanical-page';
  face.castShadow = face.receiveShadow = false;
  const pageReturn = addPaperSign(stage, tag, 'page-return-tab', '← 返回花园', .72, .202);

  let generation = 0;
  let photoMap;
  let item;
  let message = '';
  let title = '';
  let bodyLines = [];
  let titleLines = [];
  let previewLines = [];
  let labelLines = [];
  let offset = 0;
  let maxScroll = 0;
  let pageTop = 0;
  let reading = false;
  let lastPaint = -1;

  function paintSmall(progress) {
    const g = smallCard.getContext('2d');
    cardStock(g, smallCard.width, smallCard.height);
    drawSprig(g, 128, 107, 1.28);
    g.fillStyle = '#597258';
    g.font = '21px Georgia, serif';
    g.fillText('BOTANICAL MEMORY TAG', 217, 106);
    g.globalAlpha = THREE.MathUtils.clamp(progress * 2, 0, 1);
    g.fillStyle = '#3d604e';
    g.font = 'italic 52px "STKaiti", "KaiTi", Georgia, serif';
    labelLines.slice(0, 2).forEach((line, i) => g.fillText(i === 1 && labelLines.length > 2 ? line + '…' : line, 70, 202 + i * 59, 580));
    g.globalAlpha = THREE.MathUtils.clamp(progress * 2 - .65, 0, 1);
    g.font = '32px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#596653';
    previewLines.slice(0, 2).forEach((line, i) => {
      g.fillText(i === 1 && previewLines.length > 2 ? line + '…' : line, 73, 336 + 46 * i, 574);
    });
    g.globalAlpha = 1;
    g.strokeStyle = '#bdc5a3';
    g.beginPath();
    g.moveTo(73, 428);
    g.lineTo(646, 428);
    g.stroke();
    g.font = '26px "Microsoft YaHei", sans-serif';
    g.fillText('展开铭牌   ↗', 74, 474);
    smallMap.needsUpdate = true;
  }

  function paintPage() {
    const g = page.getContext('2d');
    cardStock(g, PAGE_WIDTH, PAGE_HEIGHT);
    drawSprig(g, 124, 105, 1.35);
    g.fillStyle = '#627b61';
    g.font = '24px Georgia, serif';
    g.fillText('BOTANICAL MEMORY TAG', 228, 112);
    g.save();
    g.beginPath();
    g.rect(60, 139, PAGE_WIDTH - 120, PAGE_HEIGHT - 222);
    g.clip();
    g.fillStyle = '#355944';
    g.font = 'italic 57px "STKaiti", "KaiTi", Georgia, serif';
    titleLines.forEach((line, i) => g.fillText(line, 65, 206 + i * 74 - offset));
    g.fillStyle = '#adc09a';
    g.fillRect(65, pageTop - 64 - offset, 104, 3);
    g.fillStyle = '#3f5145';
    g.font = '39px "Microsoft YaHei", system-ui, sans-serif';
    const firstLine = Math.max(0, Math.floor((offset + 139 - pageTop) / BODY_LINE));
    for (let i = firstLine; i < bodyLines.length; i++) {
      const y = pageTop + i * BODY_LINE - offset;
      if (y > PAGE_HEIGHT - 50) break;
      g.fillText(bodyLines[i], 65, y);
    }
    g.restore();
    if (maxScroll) {
      g.fillStyle = '#d9deca';
      g.fillRect(PAGE_WIDTH - 52, 157, 5, 786);
      const handle = Math.max(39, 786 * 786 / (786 + maxScroll));
      g.fillStyle = '#819d7c';
      g.fillRect(PAGE_WIDTH - 52, 157 + (786 - handle) * offset / maxScroll, 5, handle);
    }
    g.fillStyle = '#68896b';
    g.font = '24px "Microsoft YaHei", sans-serif';
    if (maxScroll) g.fillText('↑ ↓   滚动阅读', 65, 992);
    pageMap.needsUpdate = true;
  }

  async function setPack(pack, status) {
    const token = ++generation;
    item = pack?.manifest.treasures.spring;
    title = item?.title ?? '春日花园';
    message = item?.message ?? (status === 'loading' ? '正在打开宝藏包……'
      : status === 'error' ? '宝藏包读取失败。回到地图后可以按 I 重新导入。'
        : '这份回忆还没有放进来。回到地图后按 I 导入宝藏包。');
    const g = page.getContext('2d');
    g.font = 'italic 57px "STKaiti", "KaiTi", Georgia, serif';
    titleLines = linesFor(g, title, 688);
    g.font = '39px "Microsoft YaHei", system-ui, sans-serif';
    bodyLines = linesFor(g, message, 688);
    const preview = smallCard.getContext('2d');
    preview.font = 'italic 52px "STKaiti", "KaiTi", Georgia, serif';
    labelLines = linesFor(preview, title, 580);
    preview.font = '32px "Microsoft YaHei", sans-serif';
    previewLines = linesFor(preview, message, 574).filter(Boolean);
    pageTop = 206 + titleLines.length * 74 + 64;
    maxScroll = Math.max(0, pageTop + (bodyLines.length - 1) * BODY_LINE - (PAGE_HEIGHT - 109));
    offset = 0;
    lastPaint = -1;
    if (reading) paintPage();
    if (photoMap) {
      photoMap.dispose();
      photoMap = null;
      photoMaterial.map = null;
      photoMaterial.color.set('#f1e7d5');
      photoMaterial.needsUpdate = true;
    }
    fitPhoto();
    if (!item || !pack.images[item.image]) return false;
    let bitmap;
    try {
      bitmap = await createImageBitmap(pack.images[item.image]);
      if (token !== generation) return false;
      const resize = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = makeCanvas(Math.max(1, Math.round(bitmap.width * resize)), Math.max(1, Math.round(bitmap.height * resize)));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      photoMap = new THREE.CanvasTexture(canvas);
      photoMap.colorSpace = THREE.SRGBColorSpace;
      photoMaterial.map = photoMap;
      photoMaterial.color.set('#ffffff');
      photoMaterial.needsUpdate = true;
      fitPhoto(bitmap.width / bitmap.height);
      return true;
    } catch {
      return false;
    } finally {
      bitmap?.close();
    }
  }

  function scroll(by) {
    const next = THREE.MathUtils.clamp(offset + by, 0, maxScroll);
    if (next === offset) return;
    offset = next;
    paintPage();
  }

  function pose(photoAmount, tagAmount, readingAmount, photoFocus, showFrame = !!photoMap) {
    photo.visible = photoAmount > 0 && showFrame;
    photo.position.set(0, .01 + .08 * photoAmount, .25 + .47 * photoAmount);
    photo.scale.setScalar(Math.max(.001, photoAmount) * (1 + .12 * photoFocus));
    photo.rotation.x = -.25 * (1 - photoAmount);
    photoReturn.sign.visible = photoFocus > .60;
    photoReturn.sign.rotation.x = (1 - photoFocus) * 1.7;
    post.visible = tagAmount > 0;
    tag.position.y = .99 + .64 * readingAmount;
    tag.position.z = .05 + .50 * readingAmount;
    tag.rotation.x = -.24 - (1 - tagAmount) * 1.28 + .16 * readingAmount;
    tag.rotation.z = -.06 * (1 - readingAmount);
    const w = THREE.MathUtils.lerp(TAG_WIDTH, 2.32, readingAmount);
    const h = THREE.MathUtils.lerp(TAG_HEIGHT, 2.87, readingAmount) * Math.max(.035, tagAmount);
    face.scale.set(w, h, 1);
    tagBacking.scale.copy(face.scale);
    pageReturn.sign.visible = readingAmount > .60;
    pageReturn.sign.position.set(w * .27, -.50 * h + .145, .043);
    pageReturn.sign.rotation.x = (1 - readingAmount) * 1.7;
    const nextReading = readingAmount > .48;
    if (nextReading !== reading) {
      reading = nextReading;
      tagMaterial.map = reading ? pageMap : smallMap;
      if (reading) paintPage();
    }
    const phase = Math.min(12, Math.floor(tagAmount * 12));
    if (!reading && phase !== lastPaint) {
      lastPaint = phase;
      paintSmall(tagAmount);
    }
  }

  return {
    photo, tag, frameBox, tagBacking, photoReturn, pageReturn, pose, setPack, scroll,
    get title() { return title; },
    get message() { return message; },
    get dimensions() { return { frameWidth: frameWidth * 1.12, frameHeight: frameHeight * 1.12 }; },
    get canViewPhoto() { return !!photoMap; },
    dispose() {
      generation++;
      photoMap?.dispose();
    },
  };
}
