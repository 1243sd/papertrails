import * as THREE from 'three';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import photoURL from './fixtures/spring-blossoms.jpg?url';
import { fixturePack } from './game.browser.js';
import { readTreasurePack } from '../src/game/treasure-pack.js';

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sentence = '愿你在自己的节奏里慢慢开花。把眼前的光、闻到的青草气息和心里柔软的一瞬，轻轻收好。';
const message = (sentence + '\n\n').repeat(60).slice(0, 1996) + '读到这里';

async function makePack(portrait) {
  const files = unzipSync(new Uint8Array(await (await fixturePack()).arrayBuffer()));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  manifest.treasures.spring = { title: '把春天留在这里', message, image: 'images/spring.jpg' };
  delete files['images/spring.png'];
  // Lderendi, CC0 1.0. https://commons.wikimedia.org/wiki/File:Shinshuku_Gyoen.jpg
  let source = await (await fetch(photoURL)).blob();
  if (portrait) {
    const bitmap = await createImageBitmap(source);
    const canvas = Object.assign(document.createElement('canvas'), { width: 1230, height: 2048 });
    canvas.getContext('2d').drawImage(bitmap, 179, 0, 640, bitmap.height, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    source = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .89));
  }
  files['images/spring.jpg'] = new Uint8Array(await source.arrayBuffer());
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  return readTreasurePack(new File([zipSync(files)], 'spring-browser.zip'));
}

export async function checkSpringStage({ game, update, render, renderer, traveller }, browser, mobile) {
  const spring = game.spring;
  const dialog = document.querySelector('.spring-garden');
  const state = () => dialog.dataset.state;
  const frames = (n) => { for (let i = 0; i < n; i++) update(1 / 60); };
  const capture = async (name) => { render(0); await browser({ name }); };
  const position = traveller.position.clone();
  const originalRender = renderer.render;
  const previousShadowMode = renderer.shadowMap.enabled;
  let scene, camera;
  renderer.render = function (object, view) {
    if (object.name === 'spring-garden') { scene = object; camera = view; }
    return originalRender.call(this, object, view);
  };
  try {
    const pack = await makePack(mobile);
    spring.setPack(pack);
    spring.open();
    assert(game.modal() && await spring.photosReady, '宝箱场景应可解码真实导入照片');
    await spring.ready;
    update(0);
    render(0);
    const object = (name) => scene.getObjectByName(name);
    const projected = (mesh, x = 0, y = 0) => mesh.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
    const click = (mesh) => {
      const p = projected(mesh);
      dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
      dialog.dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: (p.x + 1) * innerWidth / 2, clientY: (1 - p.y) * innerHeight / 2,
      }));
    };
    const petal = object('bloom-petal-0');
    const closed = petal.rotation.x;
    const photo = object('bloom-imported-photo');
    const page = object('botanical-page');
    function inView(mesh) {
      return [-.5, .5].every((x) => [-.5, .5].every((y) => {
        const point = projected(mesh, x, y);
        return Math.abs(point.x) < .99 && Math.abs(point.y) < .99;
      }));
    }
    assert(camera.isPerspectiveCamera && camera.aspect === innerWidth / innerHeight, '花园应使用独立透视相机');
    const originalFraming = camera.position.clone();
    assert(renderer.shadowMap.enabled === previousShadowMode, '渲染花园之后应恢复主世界阴影设置');
    if (!mobile) {
      assert(state() === 'OPENING' && !photo.parent.visible, '相框过早出现');
      const leg = object('spring-traveller').getObjectByName('leg_l');
      const initialLeg = leg.quaternion.clone();
      const cloud = object('sky-cloud-0');
      const bird = object('sky-bird-0');
      const airbornePetal = object('sky-petal-0');
      const cloudStart = cloud.position.clone();
      const birdStart = bird.position.clone();
      const petalStart = airbornePetal.position.clone();
      frames(61);
      assert(cloud.isSprite && cloud.material.transparent && cloud.position.distanceTo(cloudStart) > .02
        && bird.position.distanceTo(birdStart) > .08 && airbornePetal.position.distanceTo(petalStart) > .08,
        '云雾、飞鸟与花瓣应在独立空间层中漂动');
      await capture('spring-opening.png');
      frames(60);
      assert(state() === 'GARDEN_AWAKE' && object('spring-traveller').visible
        && leg.quaternion.angleTo(initialLeg) > .01, '主角未播放走路动画');
      const tabby = object('cat_grey_stripe');
      const perimeter = object('garden-perimeter-fence');
      perimeter.updateWorldMatrix(true, true);
      const towardRightFence = new THREE.Raycaster(undefined, new THREE.Vector3(1, 0, 0), 0, 2);
      for (let i = 0; i < 80; i++) {
        frames(1);
        tabby.getWorldPosition(towardRightFence.ray.origin).y = .10;
        assert(towardRightFence.intersectObject(perimeter, true)[0]?.distance >= .27,
          '狸花猫入场和坐下时都应在围栏内侧，并与栏杆留有距离');
      }
      assert(state() === 'BLOOMING' && closed - petal.rotation.x > .3
        && Math.abs(petal.rotation.x - object('bloom-petal-2').rotation.x) > .12, '花瓣应独立错时旋转');
      await capture('spring-bloom.png');
      frames(65);
      assert(state() === 'PHOTO_REVEAL' && photo.parent.visible && !page.parent.parent.visible, '照片应先于铭牌显现');
      frames(65);
      assert(state() === 'MESSAGE_REVEAL', '铭牌应在照片之后展开');
      frames(34);
    }
    assert(state() === 'IDLE' && traveller.position.equals(position), '进入静置状态前主世界不应移动');
    assert(camera.position.equals(originalFraming), '云与鸟的动态不应改变花园镜头距离');
    const fence = object('garden-perimeter-fence');
    const enclosure = new THREE.Box3().setFromObject(fence).getSize(new THREE.Vector3());
    assert(fence.visible && enclosure.x > 9 && enclosure.z > 6 && enclosure.y < .75, '围栏应环绕地台并保持低矮');
    const mist = object('spring-sky').children.filter((item) => item.isSprite && !item.material.depthTest);
    assert(mist.some(({ position }) => position.z > 4 && Math.abs(position.x) < 3)
      && mist.some(({ position }) => position.y > 0 && Math.abs(position.x) < 3), '云雾应飘经前景和园内');
    assert(dialog.querySelector('nav').getBoundingClientRect().width === 1, '花园操作应藏在场景物件上');
    assert(['cat_black', 'cat_grey_stripe'].every((name) => object(name).children[0].material.map.isCanvasTexture
      && object(name).children[0].visible), '两只猫应使用动物图集 CanvasTexture');
    const ratio = mobile ? 1230 / 2048 : 1600 / 1065;
    assert(Math.abs(photo.scale.x / photo.scale.y - ratio) < 1e-6
      && Math.max(photo.material.map.image.width, photo.material.map.image.height) <= 1600, '导入照片比例或纹理尺寸错误');
    await capture(mobile ? 'spring-mobile.png' : 'spring-garden.png');
    click(photo);
    assert(state() === 'PHOTO_VIEW', '应能点击场景中的实体相框');
    frames(54);
    assert(inView(photo), '近照超出视口');
    if (!mobile) await capture('spring-photo.png');
    click(photo);
    assert(state() === 'IDLE', '再次点击实体照片应返回');
    frames(54);
    click(page);
    assert(state() === 'MESSAGE_READING', '应能点击场景中的实体铭牌');
    frames(54);
    assert(inView(page) && dialog.querySelector('.spring-accessible p').textContent === message, '阅读纸页或完整正文丢失');
    if (!mobile) await capture('spring-message.png');
    const map = page.material.map;
    const start = map.version;
    if (mobile) {
      await browser({ swipe: [{ x: 190, y: 580 }, { x: 190, y: 295 }] });
    } else {
      dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: 235, cancelable: true }));
    }
    assert(map.version > start, '阅读状态的滚轮或触摸应推进纸页内容');
    const ink = map.image.getContext('2d');
    const fillText = ink.fillText;
    const painted = [];
    ink.fillText = function (text, ...values) {
      painted.push(text);
      fillText.call(this, text, ...values);
    };
    dialog.dispatchEvent(new KeyboardEvent('keydown', { code: 'End', cancelable: true }));
    ink.fillText = fillText;
    assert(painted.join('').endsWith('读到这里↑ ↓   滚动阅读'), '长正文应能滚动到最后一个字');
    click(object('page-return-tab').children[1]);
    assert(state() === 'IDLE' && spring.active, '应能点击铭牌上的纸签返回花园');
    frames(54);
    click(object('garden-exit-sign').children[1]);
    if (!mobile) assert(state() === 'CLOSING', '离开应经过收场状态');
    frames(17);
    assert(state() === 'CLOSED' && !game.modal() && document.activeElement === renderer.domElement, '关闭后应恢复地图和焦点');

    spring.open();
    const inFlight = spring.photosReady;
    spring.close();
    spring.setPack(null);
    spring.open();
    assert(await inFlight === false && state() === (mobile ? 'IDLE' : 'OPENING'), '旧照片解码不得跨场景挂载，春季重开应重播开场');
    render(0);
    assert(!object('bloom-imported-photo').material.map
      && dialog.querySelector('[data-action="PHOTO_VIEW"]').hidden, '空宝藏包不能挂载陈旧的照片');
  } finally {
    spring.close();
    spring.setPack(null);
    renderer.render = originalRender;
  }
}
