import * as THREE from 'three';

const distance = 2.20;
const margin = 2.02;
const axes = {
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
};

export function createAutumnController(stage, dialog) {
  const { player, camera, benches } = stage;
  const keys = new Set();
  const goal = new THREE.Vector3(), ground = new THREE.Vector3();
  const forward = new THREE.Vector3(), eye = new THREE.Vector3(), aim = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const path = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const landscapeFov = camera.fov;
  let seeking = false, animation = 0, latest = -1;

  function clear() { keys.clear(); seeking = false; }

  function setCamera(dt) {
    const pos = player.root.position;
    const portrait = camera.aspect < .8;
    const amount = 1 - Math.exp(-dt * 7);
    eye.set(pos.x * (portrait ? .98 : .51), portrait ? 2.76 : 2.48, pos.z + (portrait ? 5.4 : 4.0));
    aim.set(pos.x * (portrait ? .94 : .42), 1.27, pos.z - 3.8);
    camera.position.lerp(eye, amount);
    focus.lerp(aim, amount);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
  }

  function update(dt) {
    const pos = player.root.position;
    forward.set(0, 0, 0);
    for (const key of keys) {
      const [x, z] = axes[key];
      forward.x += x;
      forward.z += z;
    }
    if (forward.lengthSq()) seeking = false;
    else if (seeking) forward.copy(goal).sub(pos).setY(0);
    const moving = forward.lengthSq() > .0025;
    if (moving) {
      const speed = Math.min(2.95 * dt, seeking ? forward.length() : Infinity);
      forward.normalize();
      pos.x = THREE.MathUtils.clamp(pos.x + forward.x * speed, -margin, margin);
      pos.z = THREE.MathUtils.clamp(pos.z + forward.z * speed, -40.8, 1.05);
      const heading = Math.atan2(-forward.x, -forward.z);
      const turn = Math.atan2(Math.sin(heading - player.root.rotation.y), Math.cos(heading - player.root.rotation.y));
      player.root.rotation.y += turn * (1 - Math.exp(-dt * 11));
    }
    animation += dt;
    player.pose(moving ? 'walk' : 'idle', animation);
    setCamera(dt);
    latest = -1;
    let closest = distance ** 2;
    for (const [i, bench] of benches.entries()) {
      const dx = pos.x - bench.root.position.x, dz = pos.z - bench.root.position.z;
      const squared = dx * dx + dz * dz;
      if (squared > closest) continue;
      closest = squared;
      latest = i;
    }
    benches.forEach(({ highlight }, i) => { highlight.visible = i === latest; });
  }

  function aimPointer(event) {
    const bounds = dialog.getBoundingClientRect();
    cursor.set(2 * (event.clientX - bounds.left) / bounds.width - 1,
      1 - 2 * (event.clientY - bounds.top) / bounds.height);
    ray.setFromCamera(cursor, camera);
  }

  return {
    get nearby() { return latest; },
    clear, update,
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < .8 ? 59 : landscapeFov;
      camera.updateProjectionMatrix();
    },
    snap() { setCamera(Infinity); },
    opening(progress) {
      setCamera(Infinity);
      const distance = 1 - THREE.MathUtils.smoothstep(progress, .27, .97);
      camera.position.x -= .58 * distance;
      camera.position.y += .46 * distance;
      camera.position.z += 1.30 * distance;
      camera.lookAt(focus);
      camera.rotateZ(-Math.sin(Math.PI * progress) * .018 * distance);
      camera.updateMatrixWorld();
    },
    keydown({ code }) { if (!Object.hasOwn(axes, code)) return false; keys.add(code); return true; },
    keyup({ code }) { keys.delete(code); },
    hit(event, objects) {
      aimPointer(event);
      for (const object of objects) object.updateWorldMatrix(true, true);
      return ray.intersectObjects(objects, true).length > 0;
    },
    walkTo(event) {
      aimPointer(event);
      if (!ray.ray.intersectPlane(path, ground)) return;
      goal.set(THREE.MathUtils.clamp(ground.x, -margin, margin), 0, THREE.MathUtils.clamp(ground.z, -40.8, 1.05));
      seeking = true;
    },
  };
}
