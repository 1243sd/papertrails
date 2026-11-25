import * as THREE from 'three';

const clamp = (value) => THREE.MathUtils.clamp(value, 0, 1);
const ease = (value) => { const u = clamp(value); return u * u * (3 - 2 * u); };
const between = (t, start, end) => ease((t - start) / (end - start));
const END = 6;

export function createSpringMotion(stage, reveal, reduced) {
  let time = reduced() ? END : 0;
  let ambient = 0;
  let state = 'OPENING';
  let view = 'IDLE';
  let closing = null;
  let photoFocus = 0;
  let readingFocus = 0;
  const home = new THREE.Vector3();
  const center = new THREE.Vector3();
  const focal = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const gaze = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const facing = new THREE.Quaternion();
  const walkIn = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.55, .042, 3.42),
    new THREE.Vector3(-.9, .043, 2.81),
    new THREE.Vector3(-1.12, .049, 2.22),
    new THREE.Vector3(-1.01, .04, 1.77),
  ]);

  function update(dt) {
    if (closing !== null) closing += dt;
    else time = reduced() ? END : Math.min(time + dt, END);
    ambient += reduced() ? 0 : dt;
    const t = time;
    const smooth = reduced() ? 1 : 1 - Math.exp(-dt * 10);
    photoFocus = THREE.MathUtils.lerp(photoFocus, view === 'PHOTO_VIEW' ? 1 : 0, smooth);
    readingFocus = THREE.MathUtils.lerp(readingFocus, view === 'MESSAGE_READING' ? 1 : 0, smooth);
    state = closing !== null ? 'CLOSING' : t < 1.5 ? 'OPENING' : t < 2.8 ? 'GARDEN_AWAKE'
      : t < 4.3 ? 'BLOOMING' : t < 5.2 ? 'PHOTO_REVEAL' : t < END ? 'MESSAGE_REVEAL' : view;

    stage.garden.position.y = -.30 * (1 - between(t, 0, .9));
    const fenceRise = between(t, .30, 1.08);
    stage.fence.visible = fenceRise > 0;
    stage.fence.scale.y = Math.max(.01, fenceRise);
    stage.skyMotion(ambient);
    for (const { base, time: delay, size, sway } of stage.sprouts) {
      const rise = between(t, delay, delay + .63);
      base.visible = rise > .002;
      base.scale.set(size, size * Math.max(.01, rise), size);
      base.rotation.z = -.16 * (1 - rise) + sway * Math.sin(ambient * 1.45 + base.position.x * 2.8 + base.position.z);
    }
    const actorProgress = clamp((t - 1.50) / 1.25);
    stage.actor.visible = actorProgress > 0;
    walkIn.getPoint(actorProgress, stage.actor.position);
    const heading = walkIn.getTangent(actorProgress);
    const turnaround = between(actorProgress, .69, 1);
    stage.actor.rotation.y = THREE.MathUtils.lerp(Math.atan2(heading.x, heading.z), 2.36 - Math.PI * 2, turnaround);
    stage.actor.rotation.z = Math.sin(ambient * 25) * .048 * Math.sin(Math.PI * actorProgress);
    if (actorProgress < 1 && stage.actor.visible) {
      stage.walk?.play();
      stage.mixer.update(dt * 1.3);
    } else if (stage.walk?.isRunning()) {
      stage.walk.stop();
      stage.mixer.update(0);
    }
    stage.actorShadow.rotation.z = stage.actor.rotation.y;
    stage.cats.forEach((cat, i) => {
      const entering = clamp((t - 1.76 - i * .22) / .95);
      cat.root.visible = entering > 0;
      cat.root.position.set(i === 0 ? -3.95 + entering * 1.43 : 4.57 - entering * .24, .025,
        i === 0 ? 1.90 + entering * .57 : -.25 + entering * 1.19);
      cat.card.rotation.set(-.12, i === 0 ? .14 : -.24, Math.sin(ambient * 2.2 + i) * .023);
      cat.card.position.y = .315 + (entering < 1 ? Math.abs(Math.sin(ambient * 27 + i)) * .046 : 0);
      stage.poseCat(cat, entering < 1 ? (Math.floor(ambient * 11) % 2 ? 'walk_a' : 'walk_b')
        : (ambient + 3 * i) % 13 > 11 ? 'tail_up' : 'sit');
    });

    const bloom = stage.bloom;
    bloom.root.scale.setScalar(.65 + .35 * between(t, .8, 1.73));
    bloom.root.rotation.z = Math.sin(ambient * 1.1) * .017;
    bloom.petals.forEach((pivot, i) => {
      const open = between(t, 2.80 + (i * 5 % 6) * .087, 3.85 + (i * 5 % 6) * .084);
      const yieldToPhoto = between(t, 4.30, 5.14);
      pivot.rotation.x = THREE.MathUtils.lerp(1.43 + (i % 2) * .08, -.22 + (i % 3) * .13, open)
        - yieldToPhoto * .19 + Math.sin(ambient * 1.4 + i) * .023 * open;
      pivot.rotation.z = Math.sin(i * 2.8) * .09 * open;
    });
    const heart = between(t, 3.26, 4.13);
    bloom.bud.visible = t < 3.58;
    bloom.bud.scale.setScalar(1 - between(t, 2.94, 3.58));
    bloom.heart.visible = heart > 0;
    bloom.heart.scale.setScalar(Math.max(.01, heart));
    bloom.glow.intensity = heart * (.57 + .55 * Math.sin(Math.PI * between(t, 3.35, 5.4)));
    reveal.pose(between(t, 4.3, 5.2), between(t, 5.2, END), readingFocus, photoFocus);

    const arrive = between(t, 1.83, 3.6);
    const orbit = Math.max(0, ambient - 3.6) * .61;
    stage.butterfly.visible = t > 1.83;
    stage.butterfly.position.set(THREE.MathUtils.lerp(-3.1, -.76 + Math.sin(orbit) * 2.03, arrive),
      2.14 + Math.sin(ambient * 2.24) * .16, THREE.MathUtils.lerp(-2.3, .43 + Math.sin(orbit * 1.22) * .7, arrive));
    stage.butterfly.rotation.set(.18, Math.sin(ambient * .98) * .75, Math.sin(ambient * 2.2) * .29);
    stage.wings.forEach((wing, i) => { wing.rotation.y = (i === 0 ? 1 : -1) * (.47 + Math.sin(ambient * 24) * .52); });
    stage.drifting.forEach((piece, i) => {
      piece.visible = !reduced() && t > .44 + i * .11;
      const fall = (ambient * (.11 + i % 3 * .013) + i * .618) % 1;
      piece.position.set((i % 8 - 3.5) * 1.08 + .84 * fall + Math.sin(i * 7 + fall * 7) * .34,
        3.85 - fall * 3.39, -1.75 + (i * 7 % 11) * .42);
      piece.rotation.set(fall * 6, i + fall * 8, i + fall * 3.4);
      piece.scale.setScalar(Math.sin(Math.PI * fall) * (i < 6 ? .72 : .28));
    });
    positionCamera();
  }

  function positionCamera() {
    const { camera } = stage;
    const distanceScale = Math.max(1, 1.36 / camera.aspect);
    center.set(0, .80, .12);
    home.set(0, 4.81, 12.72).multiplyScalar(distanceScale).add(center);
    eye.copy(home);
    gaze.copy(center);
    if (photoFocus > .001 || readingFocus > .001) {
      const isPhoto = photoFocus >= readingFocus;
      const object = isPhoto ? reveal.photo : reveal.tag;
      const { frameWidth, frameHeight } = reveal.dimensions;
      const w = isPhoto ? frameWidth : 2.32;
      const h = isPhoto ? frameHeight : 2.87;
      const halfAngle = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = Math.max(w / (.846 * camera.aspect), h / (isPhoto ? .71 : .764)) / (2 * halfAngle);
      object.getWorldPosition(focal);
      object.getWorldQuaternion(facing);
      normal.set(0, 0, 1).applyQuaternion(facing);
      focal.addScaledVector(normal, .055);
      eye.lerp(focal.clone().addScaledVector(normal, distance), isPhoto ? photoFocus : readingFocus);
      gaze.lerp(focal, isPhoto ? photoFocus : readingFocus);
    }
    camera.position.copy(eye);
    camera.lookAt(gaze);
    camera.updateMatrixWorld();
  }

  return {
    update, positionCamera,
    get state() { return state; },
    get view() { return view; },
    get opacity() {
      return closing !== null ? between(closing, 0, .25) : 1 - between(time, 0, 1.1);
    },
    get closed() { return closing !== null && (closing >= .25 || reduced()); },
    enter(next) { view = next; state = next; },
    close() { closing ??= 0; state = 'CLOSING'; },
  };
}
