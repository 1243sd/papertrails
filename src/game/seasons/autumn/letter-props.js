import * as THREE from 'three';

export function addLetterProps(scene, hasLegacy) {
  const props = new THREE.Group();
  props.name = 'autumn-letter-props';
  scene.add(props);
  const owned = [];
  const material = (color) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .91, side: THREE.DoubleSide });
    owned.push(value);
    return value;
  };
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    owned.push(geometry);
    return object;
  }
  const cream = material('#f1d9ac'), tan = material('#c48f5f'), lining = material('#e1bd8e');
  const wax = material('#9e352f'), ribbon = material('#933e2e');
  mesh(props, new THREE.BoxGeometry(.66, .58, .44), tan, 2.23, .29, -36.86);
  mesh(props, new THREE.BoxGeometry(.76, .07, .52), lining, 2.23, .60, -36.86);
  const envelope = new THREE.Group();
  envelope.position.set(2.23, .77, -36.75);
  envelope.rotation.y = -.18;
  props.add(envelope);
  mesh(envelope, new THREE.BoxGeometry(.77, .47, .068), cream);
  mesh(envelope, new THREE.BoxGeometry(.07, .47, .074), ribbon, -.26, 0, 0);
  for (const y of [-.185, .185]) mesh(envelope, new THREE.BoxGeometry(.69, .008, .005), lining, 0, y, .034);
  for (const x of [-.347, .347]) mesh(envelope, new THREE.BoxGeometry(.008, .37, .005), lining, x, 0, .034);
  const flap = new THREE.Group();
  flap.position.set(0, .233, .046);
  envelope.add(flap);
  const triangle = new THREE.Shape().moveTo(-.375, 0).lineTo(.375, 0).lineTo(0, -.29).closePath();
  mesh(flap, new THREE.ExtrudeGeometry(triangle, { depth: .014, bevelEnabled: false }), lining);
  const seal = mesh(flap, new THREE.CylinderGeometry(.083, .077, .019, 14), wax, 0, -.24, .023);
  seal.rotation.x = Math.PI / 2;
  const leaf = new THREE.Shape()
    .moveTo(0, .049).lineTo(.014, .017).lineTo(.045, .025).lineTo(.031, -.007).lineTo(.04, -.016)
    .lineTo(.007, -.024).lineTo(0, -.046).lineTo(-.007, -.024).lineTo(-.04, -.016)
    .lineTo(-.031, -.007).lineTo(-.045, .025).lineTo(-.014, .017).closePath();
  mesh(flap, new THREE.ShapeGeometry(leaf), material('#c46550'), 0, -.24, .035);
  const letter = new THREE.Group();
  envelope.add(letter);
  mesh(letter, new THREE.BoxGeometry(.66, .294, .018), cream, 0, -.147, 0);
  const fold = new THREE.Group();
  letter.add(fold);
  mesh(fold, new THREE.BoxGeometry(.66, .295, .018), cream, 0, .147, 0);
  mesh(fold, new THREE.BoxGeometry(.57, .009, .003), lining, 0, .259, .010);
  letter.visible = false;

  let legacy;
  if (hasLegacy) {
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ecd4a7'; g.fillRect(0, 0, 384, 128);
    g.strokeStyle = '#955c3a'; g.lineWidth = 3; g.strokeRect(10, 10, 364, 108);
    g.fillStyle = '#673e29'; g.font = '40px "Microsoft YaHei", serif'; g.textAlign = 'center';
    g.fillText('旧纪念页', 192, 78);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    owned.push(texture, sign);
    mesh(props, new THREE.BoxGeometry(.064, .65, .06), tan, 1.55, .325, -37.56);
    mesh(props, new THREE.BoxGeometry(.65, .23, .035), tan, 1.55, .62, -37.55);
    legacy = mesh(props, new THREE.PlaneGeometry(.65, .23), sign, 1.55, .62, -37.529);
    legacy.name = 'autumn-legacy-page';
  }
  const ease = (value, start, end) => THREE.MathUtils.smoothstep(value, start, end);
  function pose(time) {
    envelope.position.y = .77 + .43 * ease(time, 0, .72);
    flap.rotation.x = -Math.PI * .92 * ease(time, .74, 1.28);
    wax.emissive.set('#f48e4b');
    wax.emissiveIntensity = .24 * Math.sin(Math.PI * ease(time, .21, .88));
    letter.visible = time > 1.18;
    letter.position.set(0, .06 + .54 * ease(time, 1.18, 1.79), -.015);
    letter.rotation.x = -.22 * (1 - ease(time, 1.28, 1.92));
    fold.rotation.x = Math.PI * .87 * (1 - ease(time, 1.38, 1.94));
  }
  return {
    envelope, legacy, pose,
    dispose() { props.removeFromParent(); owned.forEach((asset) => asset.dispose()); },
  };
}
