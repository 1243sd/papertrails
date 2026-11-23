import * as THREE from 'three';
import { zipSync, strToU8 } from 'fflate';

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

async function fixturePack() {
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
    format: 'papertrails-treasure-pack', version: 1, title: '浏览器验收样包',
    treasures: {
      spring: { title: '春季测试', message: '春季测试文案', image: 'images/spring.png' },
      summer: { title: '夏季测试', message: '夏季测试文案', image: 'images/summer.jpeg' },
      autumn: { title: '秋季测试', message: '秋季测试文案', image: 'images/autumn.webp' },
      winter: {
        title: '雪夜来信', photo: 'images/winter.png',
        letter: { salutation: '你好，', paragraphs: ['这是一封验收用的测试信。', '真实的信件和照片由你导入。'], signature: 'Papertrails' },
      },
    },
  };
  return new File([zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)), ...files })], 'browser-test.zip', { type: 'application/zip' });
}

export async function checkGame(app, capture, reloaded = false) {
  const { update, render, world, traveller, animals, game, controls, daynight, music, views, follow } = app;
  const { progress, treasures, atlasmap } = game;
  const canvas = document.getElementById('atlas');
  const dialog = document.querySelector('#treasure-ui dialog');
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
    await until(() => dialog.open && dialog.querySelector('img'));
    assert(dialog.dataset.animateLetter === 'false' && dialog.textContent.includes('雪夜来信'), '刷新后应保留 ZIP 内容并直接显示已读过的冬季来信');
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
    assert(dialog.open && game.modal() && traveller.position.distanceTo(feet) < 0.001, '开箱时应停在原地：' + site.id);
    const image = dialog.querySelector('img');
    assert(image, '开箱未显示导入的照片：' + site.id);
    await image.decode();
    if (site.id === 'winter') {
      assert(dialog.dataset.animateLetter === 'true' && image.naturalWidth / image.naturalHeight === 480 / 270, '冬季首次应拆信并显示完整照片');
      const arrow = new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown', bubbles: true, cancelable: true });
      assert(dialog.dispatchEvent(arrow), '打开长信件时应保留浏览器的键盘滚动');
      render(0);
      await pause(1600);
      await capture('winter-letter.png');
    }
    key('Escape'); assert(!dialog.open, 'ESC 无法关闭宝箱');
    key('KeyF');
    assert(dialog.open && dialog.dataset.animateLetter === 'false', '重复开箱应直接查看内容');
    key('Escape');
  }
  assert(apparel.size === 4 && parasols.size === 4, '四季服装和伞需要独立造型');
  assert(progress.treasureCount() === 4, '重复查看影响开启数量');
  assert(animals.list().filter((cat) => cat.comp).length === 2 && animals.stats().live > 2, '跨季节后应保留双猫和环境动物');
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
