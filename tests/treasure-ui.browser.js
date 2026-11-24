import { createTreasureUI } from '../src/game/treasure-ui.js';
import '../src/game/treasure.css';

export async function checkTreasureUI() {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const root = document.createElement('div');
  root.id = 'treasure-ui';
  document.body.replaceChildren(root);
  const artwork = document.createElement('canvas');
  artwork.width = 320; artwork.height = 180;
  const ctx = artwork.getContext('2d');
  ctx.fillStyle = '#deadc1'; ctx.fillRect(0, 0, 320, 180);
  ctx.fillStyle = '#ffece3'; ctx.fillRect(18, 18, 284, 144);
  const blob = await new Promise((resolve) => artwork.toBlob(resolve));
  const ui = createTreasureUI(root, () => {}, {
    storage: {
      load: async () => ({
        manifest: { title: '测试宝藏', treasures: {
          spring: { title: '测试春日宝藏', image: 'images/spring.png', message: '春日文字' },
        } },
        images: { 'images/spring.png': blob },
      }),
      dispose() {},
    },
  });
  const dialog = root.querySelector('dialog');
  const stage = dialog.querySelector('.treasure-stage');
  try {
    await Promise.resolve();
    ui.showTreasure('spring', { title: '春日宝箱', color: '#e9a8b5' });
    const photo = dialog.querySelector('img');
    await photo.decode();
    assert(photo.naturalWidth === 320 && photo.naturalHeight === 180 && getComputedStyle(photo).objectFit === 'contain', '春季照片应按原比例显示');
    const oldUrl = photo.src;
    const companions = dialog.querySelector('.treasure-companions');
    assert(companions?.getAttribute('aria-hidden') === 'true', '宝藏弹窗需要显示不影响读屏的猫咪装饰');
    const cats = [...companions.querySelectorAll('canvas')];
    assert(cats.length === 2, '每个宝藏弹窗应有两只陪伴猫');
    const pixels = (cat) => [...cat.getContext('2d').getImageData(0, 0, cat.width, cat.height).data];
    async function waitForCats() {
      for (let i = 0; i < 120 && companions.hidden; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      assert(!companions.hidden, '猫咪贴图应完成加载');
    }
    await waitForCats();
    assert(companions.parentElement.matches('.treasure-header'), '春季猫咪应在页眉作为贴纸');
    const firstFrames = cats.map(pixels);
    assert(firstFrames.every((frame) => frame.some((channel) => channel > 0)), '两只猫均应绘制出独立透明贴图');
    assert(firstFrames[0].some((channel, i) => channel !== firstFrames[1][i]), '两只猫需要分别使用对应毛色的立绘');
    ui.close();
    assert(await fetch(oldUrl).then(() => false, () => true), '关闭时应释放照片 Object URL');
    assert(companions.hidden, '弹窗关闭后应停止并隐藏猫咪动画');
    assert(stage.hidden && !stage.querySelector('.treasure-stage-flake'), '关闭时应停下舞台和天气');
    let previous;
    for (const id of ['spring', 'spring', 'summer', 'autumn']) {
      ui.showTreasure(id, { title: '季节宝藏', color: '#e9a8b5' });
      await waitForCats();
      assert(companions.parentElement.matches('.treasure-header'), id + ' 的猫咪应作为顶部贴纸');
      assert(stage.dataset.scene === id && stage.querySelector(id === 'summer' ? '.treasure-stage-sun' : '.treasure-stage-flake'), id + ' 应有对应的天气效果');
      assert(stage.querySelector(`.treasure-stage-trim[data-season="${id}"]`), id + ' 纸页应有对应装饰');
      if (id === 'summer' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        assert(getComputedStyle(stage.querySelector('.treasure-stage-sun'), '::after').animationName === 'stage-rays', '夏季的光芒应有明暗动画');
      }
      for (let i = 0; i < 120 && !stage.dataset.pose; i++) await new Promise(requestAnimationFrame);
      assert(stage.dataset.pose, id + ' 的角色动作应加载完成');
      if (id === 'autumn') {
        for (let i = 0; i < 150 && stage.dataset.pose !== 'catch'; i++) await new Promise(requestAnimationFrame);
        assert(stage.dataset.pose === 'catch', '秋季角色走入后应伸手接枫叶');
      }
      const poses = cats.map(pixels);
      if (previous) assert(poses.every((pose, i) => pose.some((value, j) => value !== previous[i][j])), '重开或切换季节应更换两只猫的动作');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      assert(cats.every((cat, i) => pixels(cat).every((value, j) => value === poses[i][j])), '贴纸姿势应在弹窗内保持固定');
      previous = poses;
      ui.close();
    }
    return '春夏秋天气、随机贴纸、原比例照片和资源释放均通过';
  } finally { ui.dispose(); root.remove(); }
}
