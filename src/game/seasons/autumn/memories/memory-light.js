import * as THREE from "three";

export function glow(paper, parent, color, x, y, z, width, height, strength) {
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: `
      varying vec2 uvPoint;
      void main() {
        uvPoint = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      uniform float strength;
      varying vec2 uvPoint;
      void main() {
        float r = length(uvPoint * 2.0 - 1.0);
        gl_FragColor = vec4(tint, strength * pow(1.0 - smoothstep(0.0, 1.0, r), 2.3));
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  return paper.surface(parent, new THREE.PlaneGeometry(width, height), material, x, y, z);
}

export function lightTrail(paper, root, points, radius, color, speed, phase) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(path, 68, radius, 5);
  const material = paper.own(new THREE.ShaderMaterial({
    uniforms: { tick: { value: 0 }, tint: { value: new THREE.Color(color) }, speed: { value: speed }, phase: { value: phase } },
    vertexShader: `
      varying float along;
      void main() {
        along = uv.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float tick;
      uniform vec3 tint;
      uniform float speed;
      uniform float phase;
      varying float along;
      void main() {
        float tail = fract(along - tick * speed + phase);
        float head = smoothstep(.63, .91, tail) * (1.0 - smoothstep(.975, 1.0, tail));
        float knots = pow(.5 + .5 * cos(along * 182.0 - tick * 3.5), 10.0);
        float ends = sin(along * 3.141593);
        float wake = smoothstep(.05, .78, tick);
        gl_FragColor = vec4(tint, ends * (.075 + head * (.62 + knots * .31)) * wake);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  paper.surface(root, geometry, material).name = 'autumn-finale-light-trail';
  return material.uniforms.tick;
}

