import * as THREE from 'three';

export const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function autumnHarness(app, capture) {
  const { game, renderer, update, render } = app;
  const autumn = game.autumn;
  const dialog = document.querySelector('.autumn-avenue');
  const originalRender = renderer.render;
  let scene, camera, avenue, avenueCamera;
  renderer.render = function (world, view) {
    if (world.name === 'autumn-avenue') {
      avenue = world;
      avenueCamera = view;
    }
    scene = world;
    camera = view;
    return originalRender.call(this, world, view);
  };
  function frames(count) { for (let i = 0; i < count; i++) update(1 / 60); }
  function open() { autumn.open(); frames(260); render(0); }
  function key(code, type = 'keydown', target = dialog) {
    target.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
  }
  function tap(point, pointerType = 'mouse') {
    const position = point.clone().project(avenueCamera);
    const bounds = dialog.getBoundingClientRect();
    const event = { clientX: bounds.left + (position.x + 1) * bounds.width / 2,
      clientY: bounds.top + (1 - position.y) * bounds.height / 2,
      bubbles: true, pointerId: 22, isPrimary: true, pointerType, button: 0 };
    dialog.dispatchEvent(new PointerEvent('pointerdown', event));
    dialog.dispatchEvent(new PointerEvent('pointerup', event));
  }
  function nearby(index) {
    avenue.getObjectByName('autumn-girl').position.set(index % 2 ? 1.58 : -1.58, 0, -6 - index * 6 + .55);
    frames(65);
    render(0);
  }
  async function save(name) {
    for (const animation of dialog.getAnimations({ subtree: true })) {
      if (animation.effect.getTiming().iterations !== Infinity) animation.finish();
    }
    render(0);
    await capture(name);
  }
  return {
    autumn, dialog, frames, key, tap, open, nearby, save,
    state: () => dialog.dataset.state,
    get scene() { return scene; },
    get camera() { return camera; },
    get avenue() { return avenue; },
    get avenueCamera() { return avenueCamera; },
    clean() { autumn.close(); renderer.render = originalRender; autumn.setPack(null); },
  };
}

export async function checkAutumnStage(app, capture, mobile = false) {
  const h = autumnHarness(app, capture);
  try {
    h.autumn.open();
    if (!mobile) h.frames(115);
    assert(h.state() === 'INTRO' && h.dialog.querySelector('.autumn-intro span').textContent === '这是我的梦，开始的季节', '秋季开场标题不正确');
    if (!mobile) await h.save('autumn-intro.png');
    h.frames(160);
    assert(h.state() === 'EXPLORE' && app.game.modal() && h.dialog.open, '大道未接管游戏');
    app.render(0);
    const player = h.avenue.getObjectByName('autumn-girl');
    assert(player && !h.avenue.getObjectByName('autumn-boy'), '大道应使用女主作为玩家');
    const start = player.position.clone();
    const camera = h.avenueCamera;
    assert(camera.isPerspectiveCamera && camera.aspect === innerWidth / innerHeight, '秋季相机没有随窗口调整');
    h.autumn.resize(840, 610);
    assert(camera.aspect === 840 / 610, '已打开的大道无法原位响应窗口缩放');
    h.autumn.resize(innerWidth, innerHeight);
    if (!mobile) {
      await h.save('autumn-forest.png');
      const eye = camera.position.clone(), pose = camera.quaternion.clone();
      camera.position.set(-.45, 2.47, -1.5);
      camera.lookAt(-3.04, 3.7, -8.8);
      camera.updateMatrixWorld();
      await h.save('autumn-red-maples.png');
      camera.position.copy(eye); camera.quaternion.copy(pose); camera.updateMatrixWorld();
      h.key('KeyE');
      assert(h.state() === 'EXPLORE', '远处不能开启长椅');
      h.key('KeyW');
      h.frames(46);
      h.key('KeyW', 'keyup');
      assert(player.position.z < start.z - 1, '键盘不能沿大道移动');
      await h.save('autumn-leaves.png');
    } else {
      h.tap(new THREE.Vector3(.25, 0, -3.2), 'touch');
      h.frames(80);
      assert(player.position.z < start.z - .9, '触摸点击地面未移动');
      await h.save('autumn-mobile.png');
    }
    if (mobile) {
      h.tap(new THREE.Vector3(-1.58, 0, -5.45), 'touch');
      h.frames(90);
    } else h.nearby(0);
    assert(!h.dialog.querySelector('.autumn-bench-note').hidden, '靠近长椅未显示提示');
    if (!mobile) await h.save('autumn-bench-interaction.png');
    h.tap(new THREE.Vector3(-2.55, .52, -6), mobile ? 'touch' : 'mouse');
    assert(h.state() === 'CHAT', '点击附近实体长椅未打开聊天');
    const saved = h.avenueCamera.position.clone();
    h.key('Escape', 'keydown', window);
    assert(h.state() === 'EXPLORE' && saved.equals(h.avenueCamera.position), '退出回忆未回到原视角');
    h.key('KeyE');
    assert(h.state() === 'CHAT', '已访问的长椅应能重新打开');
    h.key('Escape', 'keydown', window);
    h.key('Escape', 'keydown', window);
    assert(h.state() === 'CLOSED' && !app.game.modal(), '无法退出大道');
    h.autumn.open();
    h.key('Escape', 'keydown', window);
    assert(!h.autumn.active, '开场中途未关闭');
  } finally { h.clean(); }
}
