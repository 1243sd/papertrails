import * as THREE from 'three';
import { zipSync, strToU8 } from 'fflate';
import { TILE_SIZE } from '../src/core/config.js';

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(ok) {
  for (let i = 0; i < 160; i++) {
    if (ok()) return;
    await pause(30);
  }
  throw new Error('等待浏览器更新超时');
}

function key(code, type = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'ShiftLeft' ? 'Shift' : code, bubbles: true, cancelable: true }));
}

export async function fixturePack(version = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const c = canvas.getContext('2d');
  const sky = c.createLinearGradient(0, 0, 0, 270);
  sky.addColorStop(0, '#354f6a');
  sky.addColorStop(1, '#e0bcb2');
  c.fillStyle = sky; c.fillRect(0, 0, 480, 270);
  c.fillStyle = '#fae9bd';
  c.beginPath(); c.arc(346, 68, 23, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2e6db';
  c.beginPath(); c.moveTo(0, 202); c.quadraticCurveTo(140, 113, 480, 189); c.lineTo(480, 270); c.lineTo(0, 270); c.fill();
  c.fillStyle = '#567369';
  for (const [x, y, h] of [[25,193,75],[73,207,91],[415,204,106],[447,189,70]]) {
    c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - h * .27, y); c.lineTo(x + h * .27, y); c.fill();
  }
  const files = {};
  const formats = { spring: 'png', summer: 'jpeg', autumn: 'webp', winter: 'png' };
  for (const [season, format] of Object.entries(formats)) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/' + format));
    files['images/' + season + '.' + format] = new Uint8Array(await blob.arrayBuffer());
  }
  const manifest = {
    format: 'papertrails-treasure-pack', version, title: '浏览器验收样包',
    treasures: {
      spring: { title: '春季测试', message: '春季测试文案', image: 'images/spring.png' },
      summer: { title: '夏季测试', message: '夏季测试文案', image: 'images/summer.jpeg' },
      autumn: { title: '秋季测试', message: '秋季测试文案', image: 'images/autumn.webp' },
      winter: {
        title: '雪夜来信', photo: 'images/winter.png',
        letter: {
          salutation: '你好，',
          paragraphs: [
            '今晚雪落在窗沿，故事书里的灯一盏盏亮了。\n谢谢你陪我走过这些小小的日子。',
            '我想起那些散着步就过完的傍晚，想起一回头就能看见你的时候。没有什么特别的大事，可每次想起来，都好像又走回那条亮着灯的小路。',
            '如果冬天还有很长，我们就慢慢走。\n看雪从松枝上落下来，\n等镇上的窗户一扇一扇亮起来。',
            '愿我们记得每一段温柔的时光，\n也愿接下来的每一个冬天，\n都有值得写进故事书的小事。',
          ],
          signature: 'Papertrails',
        },
      },
    },
  };
  if (version === 2) {
    const winter = manifest.treasures.winter;
    delete winter.photo;
    winter.photos = [
      { image: 'images/winter.png', caption: '月光落在雪地上' },
      { image: 'images/village-night.png', caption: '一起看过的风景' },
      { image: 'images/village.png', caption: '把这个冬天写进故事书' },
    ];
    await Promise.all(['village-night.png', 'village.png'].map(async (name) => {
      const response = await fetch(new URL('../screenshots/' + name, import.meta.url));
      if (!response.ok) throw new Error('缺少照片验收素材 ' + name);
      files['images/' + name] = new Uint8Array(await response.arrayBuffer());
    }));
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const recorded = new Promise((resolve, reject) => {
      recorder.ondataavailable = ({ data }) => resolve(data);
      recorder.onerror = reject;
    });
    recorder.start();
    for (let i = 0; i < 5; i++) {
      c.fillStyle = '#eecc91';
      c.fillRect(180 + 17 * i, 50 + 13 * i, 7, 7);
      await pause(95);
    }
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    files['videos/snow-night.webm'] = new Uint8Array(await (await recorded).arrayBuffer());
    winter.videos = [{ video: 'videos/snow-night.webm', caption: '雪夜的小短片' }];
  }
  return new File([zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)), ...files }, { level: 0 })], 'browser-test.zip', { type: 'application/zip' });
}

export function goWinterChapter(dialog, index) {
  while (Number(dialog.dataset.chapter) !== index) {
    const current = Number(dialog.dataset.chapter);
    const step = current + Math.sign(index - current);
    const sign = dialog.querySelector(`[data-chapter-target="${step}"]:not([hidden])`);
    assert(sign, '找不到下一块路标');
    sign.click();
    assert(Number(dialog.dataset.chapter) === step, '路标应切换到相邻章节');
  }
}

export async function checkGame(app, capture, reloaded = false) {
  const { update, render, world, traveller, animals, game, controls, daynight, music, views, follow } = app;
  const { progress, treasures, atlasmap } = game;
  const canvas = document.getElementById('atlas');
  const dialog = document.querySelector('#treasure-ui dialog');
  const winter = document.querySelector('.winter-book');
  const chapter = (index) => goWinterChapter(winter, index);
  const activeCats = () => animals.list().filter((cat) => cat.comp && cat.shown);
  const apparel = new Set();
  const parasols = new Set();
  function step(frames) { for (let i = 0; i < frames; i++) update(1 / 60); }
  function visit(site) {
    controls.clearInput();
    traveller.teleport(site.x, site.z, 0, -1);
    update(0);
    world.settle();
    follow.snap(traveller);
    game.settle();
    step(1);
  }
  function winterApproach(site) {
    return [[0.97,0.53], [-0.97,0.53], [0,0.91], [0.87,0], [0,-0.87]]
      .map(([dx,dz]) => ({ x: site.x + dx, z: site.z + dz }))
      .find(({ x, z }) => world.clearance(x, z) > 0.14) || site;
  }

  if (reloaded) {
    assert(progress.treasureCount() === 4 && progress.cellCount() > 4, '真实刷新后开箱或探索进度丢失');
    visit(winterApproach(treasures.sites.find((site) => site.id === 'winter')));
    key('KeyF');
    await until(() => winter.open && winter.querySelector('h2').textContent === '雪夜来信');
    chapter(1);
    await game.winter.photosReady;
    assert(winter.querySelector('.winter-album-tools p').textContent.includes('月光落在雪地上'), '刷新后应保留多照片 ZIP');
    chapter(2);
    assert(winter.dataset.animateLetter === 'false' && winter.querySelector('.winter-letter'), '刷新后应直接显示已读过的冬季来信');
    key('Escape');
    return '整页刷新后保留四季开箱、探索进度、ZIP 内容和冬季重读状态';
  }

  step(70);
  assert(activeCats().length === 2 && traveller.model.getObjectByName('head'), '主角和双猫应在实际游戏中出现');
  const start = traveller.position.clone();
  key('KeyD'); step(24); key('KeyD', 'keyup'); step(12);
  assert(traveller.position.distanceTo(start) > 0.18, 'WASD 不能移动');
  key('ShiftLeft'); key('KeyD'); step(18);
  assert(traveller.speed > 1.4, 'Shift 不能奔跑');
  key('KeyD', 'keyup'); key('ShiftLeft', 'keyup'); controls.clearInput(); step(20); follow.snap(traveller);
  const rect = canvas.getBoundingClientRect();
  const point = new THREE.Vector3(traveller.position.x, 0, traveller.position.z + 1).project(follow.camera);
  const pointer = { pointerType: 'mouse', pointerId: 1, button: 0,
    clientX: rect.left + (point.x + 1) * rect.width / 2, clientY: rect.top + (1 - point.y) * rect.height / 2, bubbles: true };
  canvas.dispatchEvent(new PointerEvent('pointerdown', pointer));
  window.dispatchEvent(new PointerEvent('pointerup', pointer));
  assert(controls.target, '鼠标点击没有创建走路目标');
  controls.clearInput();
  const night = daynight.night; key('KeyN'); assert(daynight.night !== night, 'N 无法切换昼夜'); key('KeyN');
  key('KeyN'); step(30);
  assert(traveller.wardrobe?.umbrellaMode === 'cane'
    && traveller.wardrobe.parasol.getObjectByName('parasol-cane').visible, '夜间洋伞应收起并握在手里');
  key('KeyN'); step(30);
  assert(traveller.wardrobe.umbrellaMode === 'open'
    && traveller.wardrobe.parasol.getObjectByName('parasol-open').visible, '白天洋伞应撑开');
  const on = music.on; key('KeyM'); assert(music.on !== on, 'M 无法切换音乐'); key('KeyM');
  const view = views.index; key('KeyV'); step(56);
  assert(views.index !== view, 'V 无法切换摄像机');
  render(0);
  await capture('companions.png');

  key('Tab'); atlasmap.settle();
  assert(atlasmap.open && atlasmap.debug.page && atlasmap.debug.map, 'Tab 无法打开原有地图');
  const { map, frame, win } = atlasmap.debug;
  const mapContext = map.getContext('2d');
  const mapView = atlasmap.view;
  const ratio = (frame.x1 - frame.x0) / (frame.y1 - frame.y0);
  for (const site of treasures.sites) {
    assert(!progress.treasureDiscovered(site.id), '应验证尚未发现的宝箱标记');
    const x = site.x / TILE_SIZE;
    const z = site.z / TILE_SIZE;
    assert(Math.abs(x - mapView.x) < mapView.span * ratio / 2 && Math.abs(z - mapView.z) < mapView.span / 2, '首次打开地图应把宝箱纳入视野');
    const pixel = mapContext.getImageData(Math.round((x - win.x) * win.ppc + map.width / 2),
      Math.round((z - win.z) * win.ppc + map.height / 2), 1, 1).data;
    assert(pixel[3] === 255 && pixel[0] === 91 && pixel[1] === 59 && pixel[2] === 47, '未发现的宝箱也应画出锁扣图标');
  }
  render(0);
  await capture('atlas.png');
  key('KeyE'); step(45); assert(!atlasmap.open, 'E 无法关闭地图');
  const lamp = game.lanterns.debugLightNearest();
  assert(lamp && progress.lit(lamp) && traveller.model.getObjectByName('lantern'), '原有提灯或点灯存档未生效');

  // Seed 7 has a north–south bridge on the main road just beyond the opening.
  assert(world.surfaceAt(0, -4) === 'bridge', '固定种子的桥梁测试点已改变');
  visit({ x: 0, z: -2.62 });
  step(80);
  const bridgeCats = activeCats().map((cat) => cat.companionId);
  key('KeyW'); step(205); key('KeyW', 'keyup'); step(95);
  assert(traveller.position.z < -5.3 && activeCats().every((cat) => cat.z < -4.25)
    && activeCats().map((cat) => cat.companionId).join(',') === bridgeCats.join(','), '主角过桥后原来的两只猫都应该跟上');

  visit({ x: 0, z: -18 });
  const place = document.getElementById('current-place');
  const autumnMesh = traveller.parts.body.part.geometry;
  assert(place.textContent === '雨雾松林 · 秋装' && traveller.wardrobe.biome === 'pinewood' && traveller.wardrobe.season === 'autumn',
    '雨雾松林应显示自己的地貌名并使用秋装');
  render(0);
  await capture('pinewood.png');

  // On seed 7 the spring boundary crosses this tile before its centre.
  visit({ x: 3, z: 16.75 });
  assert(traveller.wardrobe.season === 'spring' && getComputedStyle(canvas).cursor.includes('/cursors/spring.svg'),
    '踏入春季边缘就应换上春装和春季光标');
  assert(place.textContent === '春日花林' && traveller.parts.body.part.geometry !== autumnMesh,
    '进入春日花林应切换地貌名和实际衣服模型');

  key('KeyI'); assert(dialog.open && game.modal(), 'I 应打开导入弹窗');
  const input = dialog.querySelector('input[type=file]');
  const files = new DataTransfer();
  files.items.add(await fixturePack());
  input.files = files.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => dialog.textContent.includes('已导入：浏览器验收样包'));
  const invalid = new DataTransfer();
  invalid.items.add(new File(['invalid ZIP'], 'invalid.zip'));
  input.files = invalid.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => dialog.textContent.includes('请选择有效的 ZIP'));
  key('Escape'); assert(!dialog.open, 'ESC 无法退出导入界面');

  for (const site of treasures.sites) {
    visit(site.id === 'winter' ? winterApproach(site) : site);
    assert(traveller.wardrobe.season === site.id, '进入季节时主角造型未切换：' + site.id);
    if (site.id === 'spring') {
      render(0);
      await capture('spring-wardrobe.png');
    }
    const cursor = getComputedStyle(canvas).cursor;
    const cursorURL = cursor.match(/url\("([^"]+)"\)/)?.[1];
    assert(cursorURL?.endsWith('/cursors/' + site.id + '.svg') && cursor.endsWith('auto'), '探索光标应按季节切换并保留默认光标：' + site.id);
    const cursorImage = new Image();
    cursorImage.src = cursorURL;
    await cursorImage.decode();
    assert(cursorImage.naturalWidth === 32, '季节光标图应可加载');
    apparel.add(traveller.parts.body.part.geometry.attributes.position.count);
    parasols.add(traveller.wardrobe.parasol.getObjectByName('parasol-canopy').geometry.attributes.position.count);
    const held = traveller.wardrobe.parasol.getObjectByName('parasol-open');
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(held.getWorldQuaternion(new THREE.Quaternion()));
    assert(axis.y > 0.999, '白天伞杆应该直立：' + site.id);
    assert(treasures.isVisible(site.id) && treasures.isReady(site.id), '实际游戏中宝箱点位不可交互：' + site.id);
    const feet = traveller.position.clone();
    key('KeyF'); key('KeyD');
    if (site.id === 'winter') {
      step(31);
      assert(!dialog.open && game.modal(), '冬季开箱特效应先于拆信弹窗');
      render(0);
      await capture('winter-opening.png');
      step(47);
    } else step(78);
    key('KeyD', 'keyup');
    if (site.id === 'winter') {
      assert(winter.open && !dialog.open && game.modal() && traveller.position.distanceTo(feet) < .001, '冬季应进入独立绘本并锁定输入');
      assert(document.querySelector('.treasure-prompt').hidden, '进入绘本后应隐藏地图开箱提示');
      await game.winter.photosReady;
      chapter(1);
      assert(winter.querySelector('.winter-album-tools p').textContent === '冬日纪念照', '旧版单照片应进入相册');
      assert(winter.dataset.animateLetter === 'false', '浏览照片时应保留首次拆信');
      chapter(2);
      assert(winter.dataset.animateLetter === 'true' && winter.querySelector('.winter-envelope'), '冬季首次应拆信');
      const letter = winter.querySelector('.winter-reading');
      const paper = letter.querySelector('.winter-letter-body');
      const paragraph = letter.querySelectorAll('article p')[1];
      assert(Number(paragraph.style.getPropertyValue('--line-count')) >= 2 && paragraph.style.clipPath.includes('100%'),
        '信件应在正文逐行显现前隐藏文字');
      assert(!letter.querySelector('h3') && getComputedStyle(winter.querySelector('h2')).visibility === 'hidden'
        && getComputedStyle(paper).scrollbarWidth === 'none', '来信应隐藏标题和滚动条');
      step(68);
      assert(paragraph.style.clipPath === 'inset(0px 0px 50%)', '同一段的两行应分开显示');
      assert(letter.querySelector('article') && !letter.querySelector('img'), '信件需使用纯文本段落');
      const arrow = new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown', bubbles: true, cancelable: true });
      assert(letter.dispatchEvent(arrow), '打开长信件时应保留浏览器的键盘滚动');
      step(240);
      assert(paper.scrollHeight > paper.clientHeight && paper.scrollTop > 0, '长信应跟随显现进度自动向上滑动');
      render(0);
      await pause(1300);
      await capture('winter-letter.png');
      letter.querySelector('button:last-child').click();
      assert(letter.hidden && winter.dataset.chapter === '1', '合上信纸应回到相册');
      key('Escape');
      assert(!winter.open && document.activeElement === canvas, 'Esc 应关闭绘本，并将焦点还给原画布');
      key('KeyF');
      chapter(2);
      assert(winter.open && winter.dataset.animateLetter === 'false', '重读应直接展示信件');
      key('Escape');
      continue;
    }
    assert(dialog.open && game.modal() && traveller.position.distanceTo(feet) < 0.001, '开箱时应停在原地：' + site.id);
    const image = dialog.querySelector('img');
    assert(image, '开箱未显示导入的照片：' + site.id);
    await image.decode();
    key('Escape'); assert(!dialog.open, 'ESC 无法关闭宝箱');
    key('KeyF');
    assert(dialog.open && dialog.querySelector('img'), '重复开箱应直接查看内容');
    key('Escape');
  }
  assert(apparel.size === 4 && parasols.size === 4, '四季服装和伞需要独立造型');
  assert(progress.treasureCount() === 4, '重复查看影响开启数量');
  assert(animals.list().filter((cat) => cat.comp).length === 2 && animals.stats().live > 2, '跨季节后应保留双猫和环境动物');
  key('KeyI');
  const updated = new DataTransfer();
  updated.items.add(await fixturePack(2));
  input.files = updated.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => dialog.textContent.includes('已导入：浏览器验收样包'));
  key('Escape');
  const tree = treasures.treeSite;
  const stage = winterApproach(tree);
  visit(stage);
  traveller.teleport(stage.x, stage.z, 0.55, 0.84);
  views.set(0, true);
  step(68);
  assert(world.group.getObjectByName('christmas-tree').visible, '冬季场景未显示圣诞树');
  render(0);
  await capture('christmas-tree.png');
  progress.save();
  return '真实页面通过双猫、原有键鼠操作、地图、昼夜、音乐、视角、三种图片格式 ZIP、四季开箱、冬日信件和圣诞树';
}
