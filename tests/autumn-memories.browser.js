import * as THREE from 'three';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { autumnHarness, assert } from './autumn-scene.browser.js';
import { fixturePack } from './game.browser.js';
import { readTreasurePack } from '../src/game/treasure-pack.js';
import blossomPhoto from './fixtures/spring-blossoms.jpg?url';

function control(dialog, label) {
  const button = [...dialog.querySelectorAll('button:not([hidden])')].find((item) => item.textContent === label);
  assert(button, '找不到回忆操作 ' + label);
  button.click();
}

async function until(predicate) {
  for (let i = 0; i < 45; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 35));
  }
  assert(predicate(), '回忆照片未按时显示');
}

async function capturePortrait(h) {
  const shot = h.scene.getObjectByName('shot-3');
  const boy = shot.getObjectByName('autumn-boy');
  const girl = shot.getObjectByName('autumn-girl');
  const bouquet = shot.getObjectByName('layered-rose-bouquet');
  const camera = h.camera;
  const eye = camera.position.clone(), view = camera.quaternion.clone();
  const overlay = h.dialog.querySelector('.autumn-film-overlay');
  const transforms = [boy, girl, bouquet].map((object) => [object, object.position.clone(), object.rotation.clone()]);
  const fov = camera.fov;
  try {
    boy.position.x = .33;
    girl.position.x = -.33;
    boy.rotation.y = .11;
    girl.rotation.y = -.10;
    bouquet.position.set(-.025, .57, .40);
    camera.fov = 29;
    camera.position.set(.02, 1.46, -1.87);
    camera.lookAt(0, 1.26, .59);
    camera.updateProjectionMatrix();
    overlay.hidden = true;
    await h.save('autumn-characters.png');
  } finally {
    overlay.hidden = false;
    for (const [object, position, rotation] of transforms) {
      object.position.copy(position);
      object.rotation.copy(rotation);
    }
    camera.position.copy(eye);
    camera.quaternion.copy(view);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

export async function checkAutumnMemories(app, capture) {
  const h = autumnHarness(app, capture);
  try {
    const image = await (await fetch(blossomPhoto)).blob();
    const files = unzipSync(new Uint8Array(await (await fixturePack()).arrayBuffer()));
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    manifest.version = 3;
    manifest.treasures.winter.photos = [{ image: manifest.treasures.winter.photo, caption: '测试冬季' }];
    delete manifest.treasures.winter.photo;
    manifest.treasures.autumn = {
      title: '旧纪念页测试', image: 'images/cover.jpg', message: '保留旧留言。',
      memories: {
        firstMeeting: { photos: [{ image: 'images/cover.jpg', caption: '测试样片' }, { image: 'images/broken.jpg' }] },
        letter: { salutation: '称呼测试', paragraphs: ['只用于浏览器回归验收。'.repeat(30), '第二段。'], signature: '落款测试' },
      },
    };
    delete files['images/autumn.webp'];
    files['images/cover.jpg'] = files['images/broken.jpg'] = new Uint8Array(await image.arrayBuffer());
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    const pack = await readTreasurePack(new File([zipSync(files)], 'autumn-test.zip'));
    pack.images['images/broken.jpg'] = new Blob(['broken'], { type: 'image/jpeg' });
    h.autumn.setPack(pack);
    h.open();
    const enter = (i) => { h.nearby(i); h.key('KeyE'); };
    const esc = () => h.key('Escape', 'keydown', window);
    enter(0);
    h.frames(345);
    const messages = () => [...h.dialog.querySelectorAll('.autumn-message p')].map((entry) => entry.textContent);
    assert(messages().join('|') === '起床啦|已经吃好早餐啦hhhh|自己做的吗|我会做的就是把面包拿出来，撕开包装 hhhhh',
      '第一段聊天内容与顺序不符');
    assert(h.dialog.querySelector('.autumn-chat h2').textContent === '初识', '聊天应该使用场景纸签');
    const avatars = [...h.dialog.querySelectorAll('img.autumn-avatar')];
    await Promise.all(avatars.map((avatar) => avatar.decode()));
    assert(avatars.length === 5 && new Set(avatars.map((avatar) => avatar.src)).size === 2,
      '两位发言者应该使用各自的头像');
    const firstMessage = h.dialog.querySelector('.autumn-message');
    const greeting = firstMessage.querySelector('img.autumn-sticker:not([hidden])');
    assert(greeting && !firstMessage.textContent.trim(), '第一条消息应只显示表情包');
    await greeting.decode();
    assert(greeting.naturalWidth === 129 && greeting.naturalHeight === 107, '默认表情包应使用用户提供的原图');
    await h.save('autumn-chat-01.png');
    esc();

    enter(1);
    const film = () => h.dialog.querySelector('.autumn-film-overlay');
    h.frames(143);
    await h.save('autumn-meeting-travel.png');
    control(h.dialog, '暂停');
    const paused = film().dataset.time;
    h.frames(60);
    assert(film().dataset.time === paused, '暂停期间电影仍在走时');
    control(h.dialog, '继续');
    h.frames(204);
    assert(Number(film().dataset.time) > Number(paused), '继续播放未恢复');
    await h.save('autumn-meeting-rose.png');
    await capturePortrait(h);
    control(h.dialog, '跳到结尾');
    const photo = h.dialog.querySelector('.autumn-film-photo img');
    await until(() => !photo.hidden);
    assert(photo.naturalWidth > 0 && film().querySelector('time').textContent === '2021.10.15', '照片或日期错误');
    await h.save('autumn-meeting-photo.png');
    control(h.dialog, '下一张');
    assert(photo.hidden && !h.dialog.querySelector('.autumn-empty-photo').hidden, '损坏照片未返回空相框');
    control(h.dialog, '重播');
    assert(film().dataset.time === '0.000' && h.dialog.querySelector('.autumn-film-photo').hidden, '重播未重置电影');
    esc();
    assert(h.state() === 'EXPLORE' && !film(), '电影中途退出失败');

    enter(2);
    h.frames(115);
    await h.save('autumn-newyear-train.png');
    h.frames(345);
    await h.save('autumn-newyear-hotpot.png');
    control(h.dialog, '跳到结尾');
    assert(h.dialog.querySelector('.autumn-film-photo img').hidden, '缺少真实照片时应保留空相框');
    esc();

    enter(3);
    h.frames(345);
    assert(messages().join('|') === '我不想在家里呆着了，我想出去工作|来找我|好呀', '第四段聊天内容不符');
    assert(!h.dialog.querySelector('.autumn-route').hidden && !h.dialog.querySelector('.autumn-chat time'), '第四段路线卡或日期错误');
    esc();

    enter(4);
    h.frames(294);
    await h.save('autumn-home-arrival.png');
    h.frames(326);
    await h.save('autumn-home-montage.png');
    esc();

    enter(5);
    h.frames(100);
    await h.save('autumn-letter.png');
    h.frames(27);
    assert(h.dialog.querySelector('.autumn-letter'), '信纸未展开');
    control(h.dialog, '显示全文');
    assert(h.dialog.querySelector('.autumn-letter-body, .autumn-letter .autumn-paper-body').textContent.includes('落款测试'),
      '全文未显示落款');
    esc();
    const point = h.avenue.getObjectByName('autumn-legacy-page').getWorldPosition(new THREE.Vector3());
    h.tap(point);
    assert(h.state() === 'LEGACY_PAGE' && h.dialog.querySelector('.autumn-paper-body').textContent.includes('保留旧留言'), '原秋季照片和留言未保留');
    esc(); esc();
    h.autumn.setPack(null);
    h.open();
    enter(5);
    h.frames(125);
    assert(h.dialog.querySelector('.autumn-letter').textContent.includes('还在等你写下'), '缺少信件时未显示空态');
  } finally { h.clean(); }
}
