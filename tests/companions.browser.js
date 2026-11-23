import * as THREE from 'three';
import { createAnimals } from '../src/life/animals.js';

export async function checkCompanions(renderer) {
  const scene = new THREE.Scene();
  const traveller = {
    position: new THREE.Vector3(),
    moveDir: new THREE.Vector3(0, 0, -1),
    heading: Math.PI,
    speed: 0,
  };
  let biome = 'heartland';
  let barrier = false;
  const world = {
    tileAt: () => ({ model: 'test', biome }),
    tileRecord: () => null,
    heightAt: () => 0,
    surfaceAt: (x) => barrier && x > 0.9 && x < 1.1 ? 'water' : 'grass',
    clearance: (x) => barrier && x > 0.9 && x < 1.1 ? -1 : 1,
  };
  const animals = createAnimals({ scene, renderer, world, traveller });
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const companions = () => animals.list().filter((animal) => animal.comp);
  const step = (count, dx = 0, dz = 0) => {
    for (let i = 0; i < count; i++) {
      traveller.position.x += dx / 60;
      traveller.position.z += dz / 60;
      animals.update(1 / 60);
    }
  };
  try {
    assert(await animals.ready, '加载猫咪精灵图失败');
    animals.settle();
    const initial = companions();
    assert(initial.length === 2 && initial.every((cat) => cat.shown), '静态场景应该同时显示两只专属猫');
    assert(initial.map((cat) => cat.art).sort().join(',') === 'cat_black,cat_grey_stripe', '专属猫毛色错误');
    assert(initial.every((cat) => cat.z > 0), '初始队形应位于主角后方');
    assert(Math.hypot(initial[0].x - initial[1].x, initial[0].z - initial[1].z) >= 0.2, '双猫发生重叠');
    step(600);
    assert(companions().every((cat) => cat.pose === 'sleep'), '静止时双猫应进入睡姿');
    traveller.speed = 1.3;
    step(180, 0, -1.3);
    assert(companions().every((cat) => cat.z > traveller.position.z && cat.z < traveller.position.z + 2), '双猫应在移动时保持后方');
    biome = 'snow';
    barrier = true;
    traveller.moveDir.set(1, 0, 0);
    traveller.heading = Math.PI / 2;
    traveller.speed = 2.1;
    step(240, 2.1, 0);
    const after = companions();
    assert(after.every((cat, i) => cat.slot === initial[i].slot && cat.x > 1.1 && cat.x < traveller.position.x && cat.x > traveller.position.x - 3), '穿过障碍和生物群系时要保留原来的两只猫');
    traveller.speed = 0;
    step(180);
    assert(companions().every((cat) => cat.pose === 'sit'), '停下来后双猫应坐下');
    traveller.moveDir.set(-1, 0, 0);
    traveller.heading = -Math.PI / 2;
    traveller.speed = 1.15;
    step(125, -1.15, 0);
    assert(companions().every((cat) => cat.x > traveller.position.x), '反向行走时双猫也应在身后');
    animals.refresh();
    step(100);
    assert(animals.stats().companions === 2, '刷新后应恢复双猫');
    return { initial, after };
  } finally {
    animals.dispose();
  }
}
