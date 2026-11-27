import * as THREE from 'three';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { autumnHarness, assert } from './autumn-scene.browser.js';
import { fixturePack } from './game.browser.js';
import { readTreasurePack } from '../src/game/treasure-pack.js';
import { memories } from '../src/game/seasons/autumn/data.js';
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
    bouquet.position.set(-.025, .57, -.56);
    camera.fov = 29;
    camera.position.set(.02, 1.46, -2.85);
    camera.lookAt(0, 1.24, -.42);
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
        livingTogether: { photos: [{ image: 'images/cover.jpg', caption: '一起走过的春天' },
          { image: 'images/winter.png', caption: '窗边的雪' }] },
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
    const firstChat = memories.find(({ id }) => id === 'firstChat');
    h.frames(firstChat.messages.length * 65 + 85);
    const messages = () => [...h.dialog.querySelectorAll('.autumn-message p')].map((entry) => entry.textContent);
    assert(messages().join('|') === firstChat.messages.map(([, text]) => text).filter(Boolean).join('|'),
      '第一段聊天内容与顺序不符');
    assert(h.dialog.querySelector('.autumn-chat h2').textContent === '初识', '聊天应该使用场景纸签');
    const avatars = [...h.dialog.querySelectorAll('img.autumn-avatar')];
    await Promise.all(avatars.map((avatar) => avatar.decode()));
    assert(avatars.length === firstChat.messages.length && new Set(avatars.map((avatar) => avatar.src)).size === 2,
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
    h.frames(88);
    app.render(0);
    assert(h.scene.getObjectByName('raised-map-peak')?.geometry.attributes.position.count > 20,
      '路线地图应有立体山峰');
    assert(h.scene.getObjectByName('gold-route-afterglow'), '地图路线应有金线拖尾');
    await h.save('autumn-meeting-map.png');
    h.frames(55);
    assert(h.scene.getObjectByName('autumn-window-sunset'), '车窗外应有夕阳效果');
    await h.save('autumn-meeting-travel.png');
    control(h.dialog, '暂停');
    const paused = film().dataset.time;
    h.frames(60);
    assert(film().dataset.time === paused, '暂停期间电影仍在走时');
    control(h.dialog, '继续');
    h.frames(135);
    assert(Number(film().dataset.time) > Number(paused), '继续播放未恢复');
    const bouquet = h.scene.getObjectByName('shot-3').getObjectByName('layered-rose-bouquet');
    assert(!bouquet.visible && h.scene.getObjectByName('jiaxiu-tower') && h.scene.getObjectByName('hanbi-water-pavilion'),
      '献花前应收起玫瑰，场景内应有临水亭和甲秀楼');
    assert(h.scene.getObjectByName('jiaxiu-riverside-wall') && h.scene.getObjectByName('jiaxiu-city-skyline')?.children.length > 12,
      '甲秀楼后方应先有围墙，再有城市楼群');
    await h.save('autumn-meeting-park.png');
    h.frames(78);
    assert(bouquet.visible, '男孩应在两人碰面之后拿出玫瑰');
    assert(h.scene.getObjectByName('bouquet-petal-swirl')?.visible, '赠花时应出现花瓣旋流');
    await h.save('autumn-meeting-rose.png');
    await capturePortrait(h);
    h.frames(145);
    const nightWindow = h.scene.getObjectByName('dinner-moonlit-window');
    assert(h.scene.getObjectByName('shot-4').visible && nightWindow?.material.uniforms.tick.value > 0 &&
      h.scene.getObjectByName('dinner-cup-steam'), '晚餐镜头应有活动的窗外夜景和桌边热气');
    await h.save('autumn-meeting-dinner.png');
    h.frames(179);
    const street = h.scene.getObjectByName('shot-5');
    const leaf = street.getObjectByName('street-wind-maple');
    assert(street.visible && leaf && street.getObjectByName('market-pushcart'), '逛街镜头应有随风的红枫叶和摊车');
    const previous = leaf.position.clone();
    h.frames(12);
    assert(!previous.equals(leaf.position), '红枫叶应随时间飘动');
    const pair = ['autumn-boy', 'autumn-girl'].map((name) => street.getObjectByName(name));
    assert(Math.abs(pair[0].position.z - pair[1].position.z) < .15 && Math.abs(pair[0].position.x - pair[1].position.x) > .5,
      '两人在逛街时应并排走');
    for (let step = 0; step < 8; step++) {
      const left = pair[0].getObjectByName('autumn-hand-left').getWorldPosition(new THREE.Vector3());
      const right = pair[1].getObjectByName('autumn-hand-right').getWorldPosition(new THREE.Vector3());
      assert(left.distanceTo(right) < .019, '两人在迈步时应保持牵手');
      h.frames(6);
    }
    await h.save('autumn-meeting-market.png');
    control(h.dialog, '跳到结尾');
    const currentCard = () => h.dialog.querySelector('.autumn-film-photo .autumn-photo-card[data-layer="front"]');
    const photo = currentCard().querySelector('img');
    await until(() => !photo.hidden);
    assert(photo.naturalWidth > 0 && film().querySelector('time').textContent === '2021.10.15', '照片或日期错误');
    const finale = h.scene.getObjectByName('shot-6');
    const fireflies = finale.getObjectByName('autumn-finale-fireflies');
    assert(finale.visible && fireflies && finale.getObjectByName('autumn-finale-light-trail'), '初见结尾应出现月下光效');
    const endingTime = film().dataset.time;
    const tick = fireflies.material.uniforms.tick.value;
    h.frames(25);
    assert(film().dataset.time === endingTime && fireflies.material.uniforms.tick.value > tick,
      '照片展开后背景光效应继续播放，进度仍停在结尾');
    await h.save('autumn-meeting-photo.png');
    h.dialog.querySelector('.autumn-photo-lift:not([hidden])').click();
    await until(() => !currentCard().querySelector('.autumn-empty-photo').hidden);
    assert(currentCard().querySelector('img').hidden, '损坏照片未返回空相框');
    control(h.dialog, '重播');
    assert(film().dataset.time === '0.000' && h.dialog.querySelector('.autumn-film-photo').hidden, '重播未重置电影');
    esc();
    assert(h.state() === 'EXPLORE' && !film(), '电影中途退出失败');

    enter(2);
    const seekNewYear = (seconds) => h.frames(Math.ceil((seconds - Number(film().dataset.time)) * 60));
    seekNewYear(1.65);
    app.render(0);
    assert(h.scene.getObjectByName('newyear-train-snow') && h.scene.getObjectByName('newyear-frosted-train-glass'),
      '新年列车应有霜窗和窗外飞雪');
    await h.save('autumn-newyear-train.png');
    seekNewYear(4.3);
    assert(h.scene.getObjectByName('shot-2').visible && h.scene.getObjectByName('newyear-station-canopy'), '应有冬日站台');
    await h.save('autumn-newyear-platform.png');
    seekNewYear(7.1);
    assert(h.scene.getObjectByName('shot-3').visible && h.scene.getObjectByName('newyear-broth-bubble'), '火锅汤面应有沸腾效果');
    await h.save('autumn-newyear-hotpot.png');
    seekNewYear(10.55);
    const plaza = h.scene.getObjectByName('shot-4');
    const monument = plaza.getObjectByName('chongqing-jiefangbei-monument');
    assert(plaza.visible && monument?.children.filter(({ name }) => name === 'jiefangbei-clock-face').length === 4,
      '逛街地点应为重庆解放碑，碑顶应有四面钟');
    await h.save('autumn-newyear-jiefangbei.png');
    seekNewYear(13.45);
    const selfie = h.scene.getObjectByName('shot-5');
    const phone = selfie.getObjectByName('newyear-selfie-phone');
    const couple = ['autumn-boy', 'autumn-girl'].map((name) => selfie.getObjectByName(name));
    const middle = (couple[0].position.x + couple[1].position.x) * .5;
    assert(selfie.visible && phone.visible && phone.position.y > 1.15 && Math.abs(phone.position.x - middle) < .06 &&
      Math.abs(couple[0].position.x - couple[1].position.x) < .45 && selfie.getObjectByName('chongqing-jiefangbei-monument'),
      '两人应靠拢，并把手机举到中间');
    const lens = phone.getObjectByName('newyear-selfie-lens').getWorldPosition(new THREE.Vector3());
    for (const actor of couple) {
      const head = actor.getObjectByName('autumn-character-head');
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
      assert(direction.dot(lens.clone().sub(head.getWorldPosition(new THREE.Vector3())).normalize()) > .99,
        '两人的视线应朝向自拍镜头');
    }
    await h.save('autumn-newyear-selfie-setup.png');
    seekNewYear(13.73);
    assert(!phone.visible && phone.parent.children.filter((object) => object.name === 'newyear-selfie-peace-sign' && object.visible).length === 2,
      '切到手机视角后应看到两人比剪刀手');
    const selfieMonument = selfie.getObjectByName('chongqing-jiefangbei-monument');
    const clock = selfieMonument.localToWorld(new THREE.Vector3(0, 4.17, -.70)).project(h.camera);
    const faces = couple.map((actor) => actor.getObjectByName('autumn-character-head').getWorldPosition(new THREE.Vector3()).project(h.camera));
    assert(Math.abs(clock.x) < .8 && Math.abs(clock.y) < .8 && faces.every((face) => clock.y - face.y > .28),
      '自拍广角取景应同时拍到人物和后方的解放碑钟楼');
    await h.save('autumn-newyear-selfie.png');
    seekNewYear(13.92);
    assert(selfie.getObjectByName('newyear-selfie-shutter').material.opacity > .45, '自拍时应有一次快门闪光');
    seekNewYear(16.23);
    assert(h.scene.getObjectByName('shot-6').visible && h.scene.getObjectByName('newyear-firework-stars'), '新年结尾应出现烟花');
    await h.save('autumn-newyear-fireworks.png');
    control(h.dialog, '跳到结尾');
    assert(h.dialog.querySelector('.autumn-film-photo img').hidden, '缺少真实照片时应保留空相框');
    esc();

    enter(3);
    const decision = memories.find(({ id }) => id === 'decision');
    h.frames(decision.messages.length * 65 + 85);
    assert(messages().join('|') === decision.messages.map(([, text]) => text).filter(Boolean).join('|'), '第四段聊天内容不符');
    assert(!h.dialog.querySelector('.autumn-route').hidden && !h.dialog.querySelector('.autumn-chat time'), '第四段路线卡或日期错误');
    esc();

    enter(4);
    const homeFrame = (seconds) => h.frames(Math.ceil((seconds - Number(film().dataset.time)) * 60));
    homeFrame(1.74);
    app.render(0);
    assert(h.scene.getObjectByName('shot-1').visible && h.scene.getObjectByName('home-path-butterflies'),
      '回家路上应有纸蝶引路');
    assert(h.scene.getObjectByName('home-city-apartment') && h.scene.getObjectByName('home-city-parked-bicycle'),
      '拉行李回家应发生在城市住宅街');
    await h.save('autumn-home-path.png');
    homeFrame(5.48);
    assert(h.scene.getObjectByName('shot-2').visible && h.scene.getObjectByName('dried-flower-wreath') &&
      h.scene.getObjectByName('home-threshold-butterflies').children.some((wing) => wing.visible),
      '门打开后应出现花环和从门边飞出的纸蝶');
    await h.save('autumn-home-arrival.png');
    homeFrame(7.32);
    assert(h.scene.getObjectByName('shot-3').visible && h.scene.getObjectByName('home-simmering-pot-steam'), '厨房应有锅汽');
    await h.save('autumn-home-kitchen.png');
    homeFrame(9.20);
    assert(h.scene.getObjectByName('home-dinner-cup-steam'), '家中餐桌应有热杯的水汽');
    await h.save('autumn-home-dinner.png');
    homeFrame(10.62);
    await h.save('autumn-home-montage.png');
    homeFrame(12.05);
    assert(h.scene.getObjectByName('home-folded-sofa-quilt'), '沙发应有盖毯');
    await h.save('autumn-home-sofa.png');
    homeFrame(13.19);
    const timeLapse = h.scene.getObjectByName('shot-4');
    const light = timeLapse.getObjectByName('home-window-day-to-dusk').material.uniforms.phase;
    assert(timeLapse.visible && light.value < .2, '窗景应从早晨开始变化');
    await h.save('autumn-home-dawn.png');
    homeFrame(15.64);
    assert(light.value > .80, '窗景应变到黄昏');
    await h.save('autumn-home-dusk.png');
    homeFrame(17.43);
    const homeEnding = h.scene.getObjectByName('shot-5');
    assert(homeEnding.visible && homeEnding.getObjectByName('home-dream-city-skyline') &&
      homeEnding.getObjectByName('home-city-overlook') && !homeEnding.getObjectByName('home-pop-up-cottage'),
      '结尾应切到城市观景台和天际线');
    const aurora = homeEnding.getObjectByName('home-city-aurora').material.uniforms.tick;
    assert(aurora.value > 0 && homeEnding.getObjectByName('home-city-rising-lights'), '城市夜景应有极光和上升光粒');
    await h.save('autumn-home-finale.png');
    control(h.dialog, '跳到结尾');
    const endLight = aurora.value;
    h.frames(21);
    const homePhoto = currentCard().querySelector('img');
    await until(() => !homePhoto.hidden);
    assert(aurora.value > endLight && homePhoto.naturalWidth > 0,
      '结尾相框展开后，城市极光应继续流动');
    await h.save('autumn-home-photo.png');
    const firstImage = homePhoto.src;
    const rear = h.dialog.querySelector('.autumn-film-photo .autumn-photo-card[data-layer="back"]');
    const second = rear.querySelector('img');
    await until(() => !second.hidden);
    const tab = rear.querySelector('.autumn-photo-tab');
    const rect = tab.getBoundingClientRect();
    assert(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === tab, '后层照片露出的角应可直接点选');
    tab.click();
    assert(currentCard() === rear && currentCard().querySelector('img').alt === '窗边的雪' && second.src !== firstImage,
      '点击后层照片应把原照片翻到前面');
    assert(currentCard().getAnimations().length > 0 && currentCard().querySelector('.autumn-photo-shine').getAnimations().length > 0,
      '叠放照片换层应触发立体翻转和扫光');
    await h.save('autumn-home-photo-next.png');
    h.dialog.querySelector('.autumn-photo-lift:not([hidden])').click();
    assert(currentCard().querySelector('img').src === firstImage, '点击后层原照片应翻回来');
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
