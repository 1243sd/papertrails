import * as THREE from 'three';
import { fixturePack, goWinterChapter } from './game.browser.js';
import { readTreasurePack } from '../src/game/treasure-pack.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

export async function checkWinterStage({ game, render, update, renderer, traveller, music }, capture, mobile = false) {
  const winter = game.winter;
  const canvas = document.querySelector('#atlas');
  const dialog = document.querySelector('.winter-book');
  const caption = () => dialog.querySelector('.winter-album-tools p').textContent;
  const chapter = (i) => goWinterChapter(dialog, i);
  const signs = () => [...dialog.querySelectorAll('.winter-chapter-sign:not([hidden])')];
  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', cancelable: true }));
  const frames = (n) => { for (let i = 0; i < n; i++) update(1 / 60); };
  assert(winter && renderer.domElement === canvas, '冬日绘本应复用游戏画布');
  const position = traveller.position.clone();
  const musicOn = music.on;
  const originalRender = renderer.render;
  let scene, camera;
  const calls = [];
  renderer.render = function (current, view) {
    calls.push(current.name);
    if (current.name === 'winter-storybook') { scene = current; camera = view; }
    return originalRender.call(this, current, view);
  };
  try {
    winter.setPack(null);
    winter.open();
    assert(!dialog.querySelector('header button') && dialog.querySelector('.winter-exit-hint').textContent === 'Esc 退出',
      '故事书应只显示 Esc 退出提示');
    assert(signs().map((sign) => sign.textContent).join() === '爱的印记', '第一章只应显示向右的路标');
    chapter(1);
    assert(signs().map((sign) => sign.textContent).join() === '冬日相遇,冬日来信', '第二章应显示两个相邻章节路标');
    assert(caption().includes('空着'), '无宝藏包时应能浏览空相册');
    chapter(2);
    assert(signs().map((sign) => sign.textContent).join() === '爱的印记', '最后一章只应显示向左的路标');
    assert(dialog.querySelector('.winter-reading').textContent.includes('还未放进'), '无信件应显示提示');
    winter.setPack(null, 'error');
    assert(dialog.querySelector('.winter-reading').textContent.includes('无法读取'), '读取失败应显示提示');
    assert(dialog.dataset.animateLetter === 'false', '无信件或读取失败应保留首次拆信');
    const pack = await readTreasurePack(await fixturePack(2));
    chapter(0);
    winter.setPack(pack);
    // Leave the first decode in flight to exercise disposal and the next session.
    const abandoned = winter.photosReady;
    esc();
    winter.setPack(null);
    winter.open();
    await abandoned;
    chapter(1);
    assert(caption().includes('空着') && dialog.dataset.chapter === '1', '旧场景的异步照片串入新场景');
    winter.setPack(pack);
    await winter.photosReady;
    await winter.ready;
    chapter(0);
    frames(380);
    render(0);
    assert(calls.length === 1 && calls[0] === 'winter-storybook', '绘本期间应跳过游戏地图的完整渲染');
    assert(camera.isPerspectiveCamera && camera.aspect === innerWidth / innerHeight, '故事书相机需跟随真实视口比例');
    const z = (name) => scene.getObjectByName(name).getWorldPosition(new THREE.Vector3()).z;
    assert(z('paper-moon') < -10 && z('winter-village-layer') === -4 && z('storybook') === 0 && z('tree-popup') === 0
      && ['winter-traveller', 'cat_black', 'cat_grey_stripe'].every((name) => z(name) >= 3)
      && camera.position.z >= 12 && camera.position.z < 13, '用世界坐标建立远山、村庄、故事书、角色和相机的纵深');
    assert(game.modal() && traveller.position.equals(position) && music.on === musicOn, '绘本期间应锁定输入并保留音乐');
    assert(['cat_black', 'cat_grey_stripe'].every((name) => scene.getObjectByName(name).children[0].visible),
      '两只猫应使用动物图集中的对应姿势');
    const nearSnow = scene.getObjectByName('snow-layer-3');
    assert(nearSnow.isPoints && nearSnow.geometry.drawRange.count === 22, '低画质应减少飘雪');
    winter.setQuality('high');
    frames(1);
    assert(nearSnow.geometry.drawRange.count === 58, '高画质应提高飘雪密度');
    winter.setQuality('med');
    frames(1);
    assert(nearSnow.geometry.drawRange.count === 38, '中画质粒子配置应介于两者之间');
    render(0);
    assert(calls.at(-1) === 'winter-resolve', '中画质应在现有 WebGL Context 内消除锯齿');
    const signMesh = scene.getObjectByName('winter-sign-right');
    const leftSign = scene.getObjectByName('winter-sign-left');
    const post = scene.getObjectByName('winter-chapter-post');
    assert(signMesh.parent === post && leftSign.parent === post
      && post.position.z > 2.3 && post.position.z < z('winter-traveller'), '路标应在书和人物之间共用一根木柱');
    const right = signs()[0];
    const { x, y, width, height } = right.getBoundingClientRect();
    assert(signMesh.visible && !leftSign.visible
      && document.elementFromPoint(x + width / 2, y + height / 2) === right, '右路标的点击区应投影到实际牌面');
    await capture(mobile ? 'winter-portrait.png' : 'winter-storybook.png');
    const clickFrame = (index) => {
      const face = scene.getObjectsByProperty('name', 'winter-picture-frame')[index].children[2];
      const point = face.getWorldPosition(new THREE.Vector3()).project(camera);
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: (point.x + 1) * innerWidth / 2, clientY: (1 - point.y) * innerHeight / 2 }));
    };
    clickFrame(0);
    assert(dialog.dataset.chapter === '1' && caption().includes('月光落在雪地上'), '应通过 Three.js 射线点击相框查看照片');
    const next = dialog.querySelector('[aria-label="下一项回忆"]');
    next.click();
    assert(caption().includes('一起看过的风景'), '下一张应展示自己的说明');
    frames(65);
    render(0);
    assert(signMesh.visible && leftSign.visible && signMesh.position.y > leftSign.position.y,
      '两个箭头应上下叠在同一根木柱上');
    const [backward, forward] = signs();
    assert(forward.getBoundingClientRect().bottom <= backward.getBoundingClientRect().top, '同一根柱子上的两个触控区不能重叠');
    dialog.focus();
    frames(1);
    const map = signMesh.material.map;
    const version = map.version;
    const alreadyHovered = forward.matches(':hover');
    const rect = forward.getBoundingClientRect();
    await capture(mobile ? 'winter-album-portrait.png' : 'winter-album.png',
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    assert(forward.matches(':hover') && (alreadyHovered || map.version > version), '鼠标移到路标上时应点亮牌面');
    forward.focus();
    assert(document.activeElement === forward, '章节路标应支持键盘聚焦');
    clickFrame(1);
    frames(2);
    render(0);
    assert(scene.getObjectByName('winter-photo-preview').visible, '照片应通过同一 Three.js 场景放大');
    await capture(mobile ? 'winter-photo-portrait.png' : 'winter-photo.png');
    dialog.querySelector('[aria-label="收起照片"]').click();
    assert(!scene.getObjectByName('winter-photo-preview').visible, '收起应回到书页上的照片');
    next.click();
    next.click();
    assert(caption().includes('视频 · 雪夜的小短片'), '照片和视频应能在同一个相册内浏览');
    render(0);
    await capture(mobile ? 'winter-video-card-portrait.png' : 'winter-video-card.png');
    clickFrame(1);
    const player = dialog.querySelector('.winter-player');
    const video = player.querySelector('video');
    for (let i = 0; i < 100 && video.readyState < 2; i++) await new Promise((resolve) => setTimeout(resolve, 30));
    assert(!player.hidden && video.readyState >= 2 && video.videoWidth > 0 && !music.on, '视频应能在本地播放器解码，播放时暂停背景音乐');
    const clipUrl = video.src;
    render(0);
    await capture(mobile ? 'winter-video-portrait.png' : 'winter-video.png');
    player.querySelector('button').click();
    assert(player.hidden && !video.hasAttribute('src') && video.paused && music.on === musicOn
      && await fetch(clipUrl).then(() => false, () => true), '退出播放器应暂停视频并释放本地 URL');
    let released = false;
    nearSnow.geometry.addEventListener('dispose', () => { released = true; });
    esc();
    assert(!winter.active && !game.modal() && released, 'Esc 应关闭绘本、释放粒子几何体并恢复输入');
    calls.length = 0;
    update(0);
    render(0);
    assert(!calls.includes('winter-storybook') && calls.length > 1 && music.on === musicOn, '退出后应恢复主世界的渲染管线及音乐');
  } finally {
    winter.close();
    winter.setPack(null);
    winter.setQuality('low');
    renderer.render = originalRender;
  }
}
