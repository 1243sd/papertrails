import { createProgress } from '../src/game/progress.js';
import { createTreasures } from '../src/game/treasures.js';
import { createControls } from '../src/player/controls.js';
import { biomeAt } from '../src/core/biomes.js';
import * as THREE from 'three';

export function checkTreasureProgress() {
  const seed = 78492;
  const key = 'popup-atlas:v1:' + seed;
  const previous = localStorage.getItem(key);
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  localStorage.setItem(key, JSON.stringify({ cells: { '0,0': 'heartland' }, scraps: { s: 'leaf' }, lanterns: { l: 1 } }));
  const progress = createProgress({ seed });
  const body = document.createElement('div');
  body.id = 'treasure-ui';
  document.body.append(body);
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const traveller = { position: new THREE.Vector3(), velocity: new THREE.Vector3(), canStand: () => true };
  const controls = createControls({ domElement: canvas, camera: new THREE.PerspectiveCamera(), traveller });
  const paper = new THREE.MeshBasicMaterial();
  const world = {
    group: new THREE.Group(),
    tileAt: (x, z) => ({ biome: biomeAt(seed, x, z) }),
    tileRecord: () => ({ shown: true, fold: { target: 1, progress: 1 } }),
    surfaceAt: () => 'grass',
    isWalkable: () => true,
    clearance: () => 1,
    heightAt: () => 0,
  };
  const treasures = createTreasures({ world, materials: { paper: () => paper }, traveller, controls, progress, seed, game: {} });
  function keydown(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); }
  try {
    const { id, x, z } = treasures.sites[0];
    traveller.position.set(x, 0, z);
    treasures.update(0);
    assert(body.querySelector('[role=status]').textContent.includes('F'), '缺少靠近提示');
    keydown('KeyW');
    assert(controls.getInput(0.02).z !== 0, '移动输入未生效');
    traveller.velocity.set(0, 0, -1);
    keydown('KeyF');
    assert(treasures.open && controls.getInput(0.02).z === 0 && traveller.velocity.length() === 0, '开启时必须暂停并清理输入');
    assert(progress.treasureOpened(id) && progress.treasureCount() === 1, '首次开箱未保存');
    for (let i = 0; i < 65; i++) treasures.update(0.02);
    assert(body.querySelector('dialog').open, '开箱动画结束应出现弹窗');
    keydown('Escape');
    assert(!treasures.open, 'ESC 未关闭宝箱');
    keydown('KeyF');
    assert(body.querySelector('dialog').open && progress.treasureCount() === 1, '重复开启应直接显示内容且不重复计数');
    const loaded = createProgress({ seed });
    try {
      assert(loaded.treasureOpened(id) && loaded.explored(0,0) && loaded.collected('s') && loaded.lit('l'), '存档兼容或重新读取失败');
      loaded.reset();
      assert(loaded.treasureCount() === 0 && !loaded.treasureOpened(id), 'reset 未清除开箱进度');
    } finally { loaded.dispose(); }
    return '提示、首次开箱、重复查看、ESC、输入暂停、旧存档与重置均通过';
  } finally {
    treasures.dispose(); progress.dispose?.(); controls.dispose(); paper.dispose(); body.remove(); canvas.remove();
    if (previous === null) localStorage.removeItem(key); else localStorage.setItem(key, previous);
  }
}

