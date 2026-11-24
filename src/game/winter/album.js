import * as THREE from 'three';
import { winterPhotos } from '../treasure-pack.js';
import { polygon } from './paper.js';

// Slots are reused across the album. Only the selected photo and its neighbors are rendered.
const encounter = [[-2.79, .37, 1.36, .84, .18], [2.79, .31, 1.83, .82, -.20], [3.53, .35, 1.50, .68, -.26]];
const gallery = [[-2.43, .31, 2.11, 1.15, .22], [0, .19, 2.83, 1.71, 0], [2.43, .31, 2.11, 1.15, -.22]];
const textureLimit = { low: 768, med: 1200, high: 1600 };

export function createWinterAlbum(stage) {
  const { book, group, box, mesh, basic, owned, camera } = stage;
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const plane = new THREE.PlaneGeometry(1, 1);
  owned.add(plane);
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const targets = [];
  const preview = group(camera, 'winter-photo-preview', 0, 0, -3.8);
  stage.scene.add(camera);
  const backdrop = new THREE.MeshBasicMaterial({ color: '#10192d', opacity: .78, transparent: true, depthWrite: false });
  owned.add(backdrop);
  const veil = new THREE.Mesh(plane, backdrop);
  veil.position.z = -.12;
  const mat = new THREE.Mesh(plane, basic('#f4e3bc'));
  const previewPhoto = new THREE.Mesh(plane, material);
  previewPhoto.position.z = .014;
  preview.add(veil, mat, previewPhoto);
  preview.visible = false;
  const frames = encounter.map((_, index) => {
    const pivot = group(book, 'winter-picture-frame');
    box(pivot, '#956751', 1.49, 1.12, .077, 0, .56, 0);
    box(pivot, '#f6deb2', 1.44, 1.072, .025, 0, .56, .05);
    const face = mesh(pivot, new THREE.PlaneGeometry(1.32, .91), basic('#ddcba7'), 0, .595, .072);
    targets.push(face);
    const illustration = group(pivot, 'paper-landscape', 0, .595, .08);
    mesh(illustration, new THREE.PlaneGeometry(1.32, .91), basic('#a6bdc3'));
    mesh(illustration, new THREE.CircleGeometry(.093, 24), basic('#f9dfb0'), .33, .21, .002);
    mesh(illustration, new THREE.ShapeGeometry(polygon([[-.655,-.2],[-.35,.18],[-.04,-.07],[.18,.08],[.65,-.24],[.65,-.433],[-.655,-.433]])),
      basic('#e4ede3'), 0, 0, .015);
    mesh(illustration, new THREE.ShapeGeometry(polygon([[-.53,-.31],[-.4,-.02],[-.28,-.31],[-.41,-.27],[-.53,-.31]])),
      basic('#496f69'), 0, 0, .020);
    const photoMaterial = material.clone();
    owned.add(photoMaterial);
    const photo = new THREE.Mesh(plane, photoMaterial);
    photo.position.set(0, .595, .111);
    pivot.add(photo);
    const play = group(pivot, 'winter-video-card', 0, .595, .13);
    mesh(play, new THREE.CircleGeometry(.215, 32), basic('#24384c'));
    mesh(play, new THREE.ShapeGeometry(polygon([[-.058, -.092], [.103, 0], [-.058, .092]])), basic('#fff0c9'), 0, 0, .009);
    play.visible = false;
    photo.visible = false;
    pivot.rotation.z = [-.07, .04, .12][index];
    return { pivot, illustration, photo, play };
  });
  owned.add(material);
  let entries = [];
  let textures = [];
  let videos = {};
  let generation = 0;
  let selected = 0;
  let layout = 0;
  let chapter = 0;
  let keyboardStatus = 'empty';
  let hover = -1;
  let progress = 0;

  function clear() {
    generation++;
    for (const texture of textures) texture?.dispose();
    textures = [];
    videos = {};
    preview.visible = false;
    previewPhoto.material.map = null;
    for (const { photo } of frames) {
      photo.material.map = null;
      photo.material.needsUpdate = true;
      photo.visible = false;
    }
  }

  async function load(pack, quality) {
    clear();
    const token = generation;
    const item = pack?.manifest?.treasures?.winter;
    entries = [...winterPhotos(item), ...(item?.videos ?? [])];
    videos = pack?.videos ?? {};
    selected = 0;
    keyboardStatus = entries.length ? 'loading' : 'empty';
    refresh();
    for (const [i, { image }] of entries.entries()) {
      if (!image) continue;
      let bitmap;
      try {
        bitmap = await createImageBitmap(pack.images[image]);
        if (token !== generation) return;
        const max = textureLimit[quality] ?? textureLimit.med;
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        textures[i] = texture;
        refresh();
      } catch {
        if (token !== generation) return;
      } finally {
        bitmap?.close();
      }
    }
    keyboardStatus = entries.some(({ video }, i) => !(video ? videos[video] : textures[i])) ? 'error' : 'ready';
    refresh();
  }

  function refresh() {
    frames.forEach(({ photo, illustration, play }, i) => {
      const index = frameIndex(i);
      const texture = textures[index] ?? null;
      if (photo.material.map !== texture) {
        photo.material.map = texture;
        photo.material.needsUpdate = true;
      }
      photo.visible = !!texture;
      illustration.visible = !texture;
      play.visible = Boolean(videos[entries[index]?.video]);
      if (!texture) return;
      const aspect = texture.image.width / texture.image.height;
      photo.scale.set(Math.min(1.32, .91 * aspect), Math.min(.91, 1.32 / aspect), 1);
    });
    if (!textures[selected]) preview.visible = false;
    const previewTexture = textures[selected] ?? null;
    if (previewPhoto.material.map !== previewTexture) {
      previewPhoto.material.map = previewTexture;
      previewPhoto.material.needsUpdate = true;
    }
  }

  function frameIndex(slot) {
    if (chapter !== 1) return slot;
    if ((slot === 0 && entries.length < 3) || (slot === 2 && entries.length < 2)) return -1;
    return entries.length ? THREE.MathUtils.euclideanModulo(selected + slot - 1, entries.length) : -1;
  }

  function update(dt, amount, reduced) {
    progress += dt;
    layout = reduced ? Number(chapter === 1) : THREE.MathUtils.damp(layout, Number(chapter === 1), 5.2, dt);
    frames.forEach((frame, i) => {
      const { pivot } = frame;
      const [x, y, z, size, angle] = encounter[i].map((value, j) => THREE.MathUtils.lerp(value, gallery[i][j], layout));
      const sides = i === 1 || frameIndex(i) !== -1;
      pivot.visible = amount > 0 && (chapter === 1 ? sides : i < 2 || entries.length > 2);
      const drift = reduced ? 0 : Math.sin(progress * 1.3 + i * 1.9) * .012;
      pivot.rotation.set(-Math.PI / 2 * (1 - amount) - .10 + drift, angle, [-.065, .024, .078][i] * (1 - layout));
      pivot.position.set(x, y, z);
      const targetSize = size * (hover === i && !reduced ? 1.065 : 1);
      pivot.scale.setScalar(reduced ? targetSize : THREE.MathUtils.damp(pivot.scale.x, targetSize, 12, dt));
    });
    if (!preview.visible) return;
    const texture = textures[selected];
    const aspect = texture.image.width / texture.image.height;
    const h = 7.6 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const w = h * camera.aspect;
    const fit = Math.min(w * .81 / aspect, h * .65);
    veil.scale.set(w * 1.1, h * 1.1, 1);
    mat.scale.set(fit * aspect + .055, fit + .068, 1);
    previewPhoto.scale.set(fit * aspect, fit, 1);
  }

  function slotAt(x, y) {
    cursor.set(x, y);
    ray.setFromCamera(cursor, camera);
    const hit = ray.intersectObjects(targets).find(({ object }) => object.parent.visible);
    return hit ? targets.indexOf(hit.object) : -1;
  }

  return {
    load, update, dispose: clear,
    get count() { return entries.length; },
    get selected() { return selected; },
    get status() { return keyboardStatus; },
    get caption() { return entries[selected]?.caption; },
    get isVideo() { return !!entries[selected]?.video; },
    get video() { return videos[entries[selected]?.video]; },
    get currentReady() { return !!(textures[selected] || this.video); },
    get preview() { return preview.visible; },
    togglePreview() {
      preview.visible = !!textures[selected] && !preview.visible;
    },
    shift(amount) {
      if (entries.length < 2) return;
      selected = THREE.MathUtils.euclideanModulo(selected + amount, entries.length);
      refresh();
    },
    setChapter(value) {
      if (chapter !== value) preview.visible = false;
      chapter = value;
      refresh();
    },
    hover(x, y) { hover = preview.visible || x === undefined ? -1 : slotAt(x, y); return hover >= 0; },
    pick(x, y) {
      if (preview.visible) { preview.visible = false; return true; }
      const slot = slotAt(x, y);
      if (slot < 0) return false;
      if (entries.length) {
        const index = frameIndex(slot);
        if (index < 0) return false;
        selected = Math.min(index, entries.length - 1);
        refresh();
        if (chapter === 1) {
          if (this.video) return 'video';
          this.togglePreview();
        }
      }
      return true;
    },
  };
}
