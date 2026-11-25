import * as THREE from 'three';
import { petalShape } from './bloom.js';
import { addSpringVapor } from './vapor.js';

export function createSpringSky(stage, scene) {
  const { group, mesh, own } = stage;
  const sky = group(scene, 'spring-sky');
  const paper = (color) => own(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  const place = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const piece = mesh(parent, geometry, material, x, y, z);
    piece.castShadow = piece.receiveShadow = false;
    return piece;
  };

  const driftVapor = addSpringVapor(stage, sky);

  const wing = new THREE.Shape();
  wing.moveTo(.16, 0);
  wing.bezierCurveTo(.28, .30, .04, .65, -.29, .93);
  wing.bezierCurveTo(-.24, .59, -.37, .42, -.46, .22);
  wing.quadraticCurveTo(-.21, .18, -.19, 0);
  const feather = new THREE.ShapeGeometry(wing, 17);
  const shell = new THREE.SphereGeometry(1, 14, 8);
  const birdPaper = paper('#726c72');
  const wingPaper = paper('#8a7d82');
  const birds = Array.from({ length: 5 }, (_, i) => {
    const bird = group(sky, 'sky-bird-' + i);
    bird.scale.setScalar(.46 + (i % 3) * .09);
    place(bird, shell, birdPaper).scale.set(.34, .057, .075);
    place(bird, shell, birdPaper, .30, .02, 0).scale.set(.085, .063, .058);
    const wings = [-1, 1].map((side) => {
      const hinge = group(bird, '');
      place(hinge, feather, wingPaper).rotation.x = side * Math.PI / 2;
      return hinge;
    });
    return { bird, wings };
  });

  const petalGeometry = new THREE.ShapeGeometry(petalShape(.126, .207, .12), 14);
  petalGeometry.translate(0, -.095, 0);
  const vertices = petalGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) vertices.setZ(i, vertices.getZ(i) + 4.1 * vertices.getY(i) ** 2);
  const shades = ['#e7a2b2', '#f0b9c6', '#f6dbd7', '#ecd1cf'].map(paper);
  const outerPetals = 19;
  const petals = Array.from({ length: outerPetals + 8 }, (_, i) => {
    const leaf = place(sky, petalGeometry, shades[i % shades.length]);
    leaf.name = 'sky-petal-' + i;
    return leaf;
  });

  return (time) => {
    driftVapor(time);
    birds.forEach(({ bird, wings }, i) => {
      const side = i < 3 ? -1 : 1;
      const phase = time * .24 + .48 + i % 3 * .29;
      const radius = 2.17 + i % 3 * .33;
      bird.position.set(side * (6.1 + radius * Math.cos(phase)) + (i % 3 - 1) * .63,
        3.23 + .22 * Math.sin(phase * 2 + i) + .25 * (i % 3), -5.3 - i % 3 * 1.03 + 1.40 * Math.sin(phase));
      bird.rotation.set(.13, Math.atan2(-1.40 * Math.cos(phase), -side * radius * Math.sin(phase)), side * .12);
      const flap = .12 + .58 * Math.sin(time * 9.5 + i * .84) * (.60 + .40 * Math.sin(phase * 2) ** 2);
      wings.forEach((hinge, j) => { hinge.rotation.x = (j ? -1 : 1) * flap; });
    });
    petals.forEach((leaf, i) => {
      const flow = (time * (.061 + i % 4 * .007) + i * .618) % 1;
      const sway = Math.sin(flow * Math.PI * 2 + i);
      const side = i % 2 ? 1 : -1;
      const lane = i < outerPetals ? 3.75 + i % 5 * .93 : 1.9 + i % 4 * .54;
      const x = side * lane + flow * 1.8 + sway * .28;
      const y = 3.91 - flow * 4.35 + Math.cos(i * 4.3) * .64;
      const z = -2.80 + i % 6 * 1.27 + sway * .31;
      leaf.position.set(x, y, z);
      leaf.rotation.set(flow * 5.6 + i * 1.8, flow * 3.9 + i * .83, flow * 4.6 + i * 1.2);
      leaf.scale.setScalar(Math.sin(flow * Math.PI) * (.54 + i % 4 * .23));
    });
  };
}
