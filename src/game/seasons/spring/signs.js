import * as THREE from 'three';

export function addPaperSign({ group, mesh, paper, makeCanvas, texture, own }, parent, name, text, w, h) {
  const sign = group(parent, name);
  const canvas = makeCanvas(512, 160);
  const g = canvas.getContext('2d');
  g.fillStyle = '#f4ead3';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#a7ad88';
  g.lineWidth = 3;
  g.strokeRect(14, 14, 484, 132);
  g.fillStyle = '#4d6a57';
  g.font = '600 60px "Microsoft YaHei", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 82, 452);
  mesh(sign, new THREE.BoxGeometry(w, h, .039), paper('#d3bc95'));
  const face = mesh(sign, new THREE.PlaneGeometry(w, h), own(new THREE.MeshBasicMaterial({ map: texture(canvas) })), 0, 0, .022);
  face.castShadow = face.receiveShadow = false;
  return { sign, face };
}
