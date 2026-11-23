import * as THREE from 'three';
import { createMaterials } from '../src/render/materials.js';
import { loadAssets } from '../src/assets/loader.js';
import { createWorld } from '../src/world/world.js';
import { createWFC } from '../src/world/wfc.js';
import { createTreasures } from '../src/game/treasures.js';
import { createTreasureChest } from '../src/game/treasure-chest.js';
import { CONFIG } from '../src/core/config.js';
import { bus } from '../src/core/events.js';

export async function checkTreasureSites(renderer) {
  const scene = new THREE.Scene();
  const materials = createMaterials({ quality: 'low' });
  const assets = await loadAssets({ materials, renderer, quality: 'low' });
  materials.setTextures(assets.textures);
  const seed = 7;
  const world = createWorld({ scene, assets, wfc: createWFC({ seed }), materials, quality: 'low' });
  const traveller = { position: new THREE.Vector3(), moveDir: new THREE.Vector3(0,0,-1) };
  const progress = { treasureOpened: () => false };
  const config = CONFIG.game.treasures;
  const ctx = { world, materials, traveller, seed, progress, treasureUI: false };
  const a = createTreasures(ctx);
  const b = createTreasures(ctx);
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  try {
    assert(a.sites.length === 4, '四季应各有一个宝箱');
    assert(JSON.stringify(a.sites) === JSON.stringify(b.sites), '同一种子选址不同');
    const winter = a.sites.find((site) => site.id === 'winter');
    const tree = a.treeSite;
    assert(tree && world.tileAt(tree.cx, tree.cz).biome === 'snow', '圣诞树应位于雪地');
    assert(tree === winter, '圣诞树、地图标记与冬季宝箱应共用同一地点');
    for (const site of a.sites) {
      assert(world.tileAt(site.cx, site.cz).biome === config.seasons[site.id].biome, '季节地点错误');
      assert(world.isWalkable(site.x, site.z) && world.clearance(site.x, site.z) >= config.clearance, '宝箱空间不足');
      assert(['grass', 'path'].includes(world.surfaceAt(site.x, site.z)), '宝箱落在水面或桥上');
      assert(!a.isVisible(site.id), '未展开的地块应隐藏宝箱');
    }
    const site = a.sites[0];
    traveller.position.set(site.x, 0, site.z);
    world.update(0, traveller.position, traveller.moveDir);
    world.settle();
    a.settle();
    assert(a.isVisible(site.id) && a.isReady(site.id), '直接 settle 后宝箱应显现并可交互');
    const rec = world.tileRecord(site.cx, site.cz);
    rec.fold.snap(0.2);
    rec.fold.setTarget(1, 0);
    a.update(0.016);
    assert(!a.isReady(site.id), '展开过程中不能开启宝箱');
    rec.fold.snap(0);
    bus.emit('tile:flat', { x: site.cx, z: site.cz });
    assert(!a.isVisible(site.id), '地块折叠后仍显示宝箱');
    rec.fold.snap(1);
    bus.emit('tile:rise', { x: site.cx, z: site.cz });
    assert(a.isVisible(site.id), '地块再次展开仍应显示宝箱');
    traveller.position.set(tree.x, 0, tree.z);
    world.update(0, traveller.position, traveller.moveDir);
    world.settle();
    a.settle();
    const treeGroup = world.group.getObjectByName('christmas-tree');
    assert(treeGroup.visible && treeGroup.getObjectByName('christmas-star') && treeGroup.getObjectByName('christmas-lights'), '圣诞树、星星和彩灯应显示');
    const lights = treeGroup.getObjectByName('christmas-lights');
    assert(treeGroup.getObjectByName('treasure-winter') === world.group.getObjectByName('treasure-winter'), '冬季宝箱应在圣诞树下');
    const snow = treeGroup.getObjectByName('christmas-snow');
    const color = new THREE.Color();
    const matrix = new THREE.Matrix4();
    lights.getColorAt(0, color);
    const previousColor = color.getHex();
    lights.getColorAt(1, color);
    assert(color.getHex() !== previousColor, '彩灯应有独立颜色');
    snow.getMatrixAt(0, matrix);
    const previousHeight = matrix.elements[13];
    a.update(0.2);
    lights.getColorAt(0, color);
    snow.getMatrixAt(0, matrix);
    assert(color.getHex() !== previousColor, '彩灯应随时间闪烁');
    assert(snow.visible && matrix.elements[13] < previousHeight, '圣诞树周围应持续落雪');
    bus.emit('tile:flat', { x: tree.cx, z: tree.cz });
    assert(!treeGroup.visible, '树所在的地块折叠后应隐藏');
    for (const id of Object.keys(config.seasons)) {
      const chest = createTreasureChest(materials, config.seasons[id].color, id);
      try {
        chest.celebrate();
        chest.update(0.35, true);
        const particles = chest.group.getObjectByName('treasure-paper-sparks');
        assert(!chest.opened && particles?.visible, '首次开箱应先显示纸片特效');
        chest.update(1, true);
        assert(chest.opened && !particles.visible, '纸片消散后才完成首次开箱');
        chest.update(0, true, true);
        assert(chest.opened && !particles.visible, '读档显示开启状态时不应重播特效');
      } finally {
        chest.dispose();
      }
    }
    return a.sites;
  } finally {
    a.dispose(); b.dispose(); world.dispose(); materials.dispose();
  }
}
