import * as THREE from 'three';

const easing = (t) => THREE.MathUtils.smoothstep(t, 0, .65);

export function createCharacter(kind) {
  const girl = kind === 'girl';
  const root = new THREE.Group();
  root.name = `autumn-${kind}`;
  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };
  const papers = new Map();
  function paper(color) {
    if (!papers.has(color)) papers.set(color, own(new THREE.MeshStandardMaterial({ color, roughness: .88 })));
    return papers.get(color);
  }

  function group(parent, x = 0, y = 0, z = 0) {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  function mesh(parent, geometry, color, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, Array.isArray(color) ? color.map(paper) : paper(color));
    object.position.set(x, y, z);
    object.castShadow = true;
    parent.add(object);
    return object;
  }

  const sphere = own(new THREE.SphereGeometry(1, 18, 12));
  function oval(parent, color, x, y, z, w, h, d) {
    const object = mesh(parent, sphere, color, x, y, z);
    object.scale.set(w, h, d);
    return object;
  }

  function cut(parent, color, z, depth, draw, edge = .009) {
    const shape = new THREE.Shape();
    draw(shape);
    const geometry = own(new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: edge, bevelSize: edge, bevelSegments: 2, curveSegments: 9,
    }));
    return mesh(parent, geometry, color, 0, 0, z);
  }

  function strip(parent, color, radius, points) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return mesh(parent, own(new THREE.TubeGeometry(curve, 8, radius, 5, false)), color);
  }

  const skin = girl ? '#efc1a1' : '#e9b491';
  const hair = girl ? '#774728' : '#292222';
  const hairLight = girl ? '#a36536' : '#413333';
  const glint = girl ? '#c18b50' : '#51413b';
  const coat = '#cd9698';
  const trim = '#ac757c';
  const cuff = '#d8a5a6';
  const pants = '#413e4b';
  const boot = '#493833';
  const shirt = '#f2e9d7';
  const rose = '#c36d81';
  const ribbon = '#963e5a';
  const lace = '#fff0d9';
  const skeleton = group(root);
  const upper = group(skeleton, 0, .67, 0);
  let skirt;

  function bow(parent, x, y, z, size, angle = 0, back = false) {
    const knot = group(parent, x, y, z);
    knot.scale.setScalar(size);
    knot.rotation.set(0, back ? Math.PI : 0, angle, 'YXZ');
    cut(knot, [ribbon, '#713047'], -.006, .022, (s) => {
      s.moveTo(0, -.012);
      s.lineTo(-.064, -.081); s.lineTo(-.037, -.077); s.lineTo(-.027, -.098);
      s.lineTo(0, -.039);
      s.lineTo(.035, -.097); s.lineTo(.041, -.076); s.lineTo(.067, -.077);
      s.closePath();
    }, .003);
    for (const side of [-1, 1]) {
      cut(knot, [rose, ribbon], -.031, .032, (s) => {
        s.moveTo(0, 0);
        s.bezierCurveTo(side * .083, .082, side * .112, .064, side * .100, .020);
        s.bezierCurveTo(side * .114, -.040, side * .079, -.046, 0, -.014);
        s.closePath();
      }, .006);
      strip(knot, ribbon, .003, [[0, -.005, -.044], [side * .038, .012, -.041], [side * .068, .026, -.037]]);
    }
    oval(knot, rose, 0, 0, -.030, .023, .022, .020);
  }

  if (girl) {
    cut(upper, [rose, ribbon], -.118, .226, (s) => {
      s.moveTo(-.132, .55);
      s.quadraticCurveTo(0, .588, .132, .55);
      s.quadraticCurveTo(.174, .538, .168, .466);
      s.quadraticCurveTo(.127, .367, .128, .221);
      s.quadraticCurveTo(0, .198, -.128, .221);
      s.quadraticCurveTo(-.127, .367, -.168, .466);
      s.quadraticCurveTo(-.174, .538, -.132, .55);
    });
    cut(upper, [lace, '#e2bfb1'], -.135, .022, (s) => {
      s.moveTo(-.081, .566); s.lineTo(.081, .566);
      s.quadraticCurveTo(.062, .485, .051, .430);
      s.quadraticCurveTo(0, .391, -.051, .430);
      s.quadraticCurveTo(-.062, .485, -.081, .566);
    }, .006);
    for (const side of [-1, 1]) {
      const collar = oval(upper, lace, side * .055, .542, -.141, .055, .027, .020);
      collar.rotation.z = side * .36;
      strip(upper, '#ebacb3', .005, [[side * .096, .52, -.13], [side * .079, .407, -.128], [side * .085, .252, -.129]]);
    }
    bow(upper, 0, .484, -.146, .55);
    for (const y of [.402, .350, .298]) oval(upper, lace, 0, y, -.135, .008, .008, .006);
    oval(upper, skin, 0, .587, -.015, .069, .094, .065);
    oval(upper, lace, 0, .57, 0, .104, .025, .105);

    skirt = group(upper, 0, .232, 0);
    skirt.name = 'autumn-lolita-skirt';
    // Continuous flutes run through the skirt, ribbon band and scalloped petticoat.
    const profile = [
      [0, .142, .126, 0, 0, 1],
      [-.049, .153, .139, .005, 0, 1],
      [-.085, .206, .175, .008, 0, 2],
      [-.161, .265, .217, .014, 0, 2],
      [-.307, .315, .254, .018, .002, 0],
      [-.316, .318, .256, .018, .002, 2],
      [-.328, .321, .259, .019, .003, 1],
      [-.342, .322, .260, .019, .004, 1],
      [-.380, .326, .264, .021, .009, 0],
      [-.417, .315, .253, .020, .012, 0],
      [-.426, .293, .232, .018, .012, 0],
      [-.347, .270, .213, .015, .004, 0],
      [-.074, .132, .116, 0, 0, 0],
      [0, .130, .113, 0, 0, 0],
    ];
    const slices = 96;
    const positions = [];
    const indices = [];
    const fabric = own(new THREE.BufferGeometry());
    for (let ring = 0; ring < profile.length; ring++) {
      const [y, width, depth, fold, scallop, color] = profile[ring];
      const start = indices.length;
      for (let i = 0; i < slices; i++) {
        const angle = i / slices * Math.PI * 2;
        const flute = fold * Math.cos(12 * angle);
        positions.push(
          Math.sin(angle) * (width + flute),
          y + scallop * Math.cos(12 * angle),
          Math.cos(angle) * (depth + flute),
        );
        const a = ring * slices + i;
        const b = ring * slices + (i + 1) % slices;
        const next = (ring + 1) % profile.length * slices;
        indices.push(a, next + i, b, b, next + i, next + (i + 1) % slices);
      }
      fabric.addGroup(start, indices.length - start, color);
    }
    fabric.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fabric.setIndex(indices);
    fabric.computeVertexNormals();
    mesh(skirt, fabric, [lace, ribbon, rose]);
    bow(upper, 0, .200, .135, 1.04, .04, true);
  } else {
    cut(upper, [coat, trim], -.119, .234, (s) => {
      s.moveTo(0, .603);
      s.lineTo(.132, .577);
      s.quadraticCurveTo(.18, .562, .181, .48);
      s.bezierCurveTo(.168, .31, .156, .20, .17, .025);
      s.quadraticCurveTo(.137, -.008, .061, -.013);
      s.quadraticCurveTo(.027, -.032, -.028, -.012);
      s.lineTo(-.164, .006);
      s.bezierCurveTo(-.166, .19, -.162, .34, -.176, .45);
      s.quadraticCurveTo(-.187, .542, -.133, .573);
      s.closePath();
    });
    cut(upper, [shirt, trim], -.139, .014, (s) => {
      s.moveTo(-.083, .578);
      s.lineTo(.078, .578);
      s.lineTo(.052, .466);
      s.lineTo(-.038, .47);
      s.closePath();
    });
    for (const side of [-1, 1]) {
      cut(upper, [shirt, trim], -.151, .015, (s) => {
        s.moveTo(side * .119, .579);
        s.lineTo(side * .018, .507);
        s.lineTo(side * .06, .454);
        s.lineTo(side * .145, .506);
        s.closePath();
      });
    }
    cut(upper, ['#3f4257', '#303344'], -.168, .013, (s) => {
      s.moveTo(-.031, .507); s.lineTo(.031, .503); s.lineTo(.023, .466);
      s.lineTo(.047, .291); s.lineTo(.006, .245); s.lineTo(-.034, .278);
      s.lineTo(-.016, .466); s.closePath();
    });
    for (let i = 0; i < 3; i++) {
      const y = .422 - i * .048;
      strip(upper, '#85839b', .0027, [[-.016, y - .011, -.17], [.010, y + .003, -.17], [.031, y + .012, -.17]]);
    }
    for (const [z, direction] of [[-.169, 1], [.137, -1]]) {
      cut(upper, ['#e8d9b6', '#a99072'], z, .012, (s) => {
        s.moveTo(-.177 * direction, .522);
        s.lineTo(-.137 * direction, .548);
        s.lineTo(.170 * direction, .162);
        s.lineTo(.181 * direction, .083);
        s.closePath();
      });
    }
    const bag = group(upper, .112, .134, .139);
    cut(bag, ['#a57b5b', '#805a46'], -.01, .058, (s) => {
      s.moveTo(-.091, .041); s.lineTo(.091, .036); s.lineTo(.097, -.073);
      s.quadraticCurveTo(0, -.093, -.087, -.076); s.closePath();
    });
    strip(bag, '#c7a27c', .006, [[-.082, .017, .050], [0, -.019, .058], [.087, .011, .05]]);
    strip(upper, trim, .004, [[.042, .488, .122], [.036, .302, .124], [.027, .12, .123], [.041, .009, .123]]);
    oval(upper, skin, 0, .587, -.015, .069, .094, .065);
    oval(upper, coat, 0, .572, 0, .109, .025, .097);
  }

  const head = group(upper, 0, .769, -.022);
  head.name = 'autumn-character-head';
  const faceGeometry = own(new THREE.SphereGeometry(1, 34, 24));
  const points = faceGeometry.attributes.position;
  const tones = [], tone = new THREE.Color();
  const baseSkin = new THREE.Color(skin);
  const flush = new THREE.Color(girl ? '#d99885' : '#d29a80');
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    const jaw = THREE.MathUtils.smoothstep(-y, .20, 1);
    const cheek = Math.exp(-((Math.abs(x) - .57) ** 2 * 21 + (y + .26) ** 2 * 31));
    points.setXYZ(i, x * (1 - jaw * (girl ? .20 : .13)), y,
      z * (1 - jaw * .09) - cheek * .023);
    tone.copy(baseSkin).lerp(flush, cheek * Math.max(0, -z) * .48);
    tones.push(tone.r, tone.g, tone.b);
  }
  faceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tones, 3));
  faceGeometry.computeVertexNormals();
  const face = new THREE.Mesh(faceGeometry, own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 })));
  face.position.set(0, -.012, -.023);
  face.scale.set(girl ? .132 : .139, girl ? .157 : .171, .123);
  face.rotation.x = .13;
  face.castShadow = true;
  head.add(face);
  oval(head, hair, -.006, girl ? .045 : .065, .04, girl ? .157 : .159, girl ? .160 : .155, .122);
  for (const side of [-1, 1]) {
    oval(head, skin, side * .134, -.023, -.015, .022, .033, .030);
    const eye = oval(head, '#f0e1d1', side * .055, -.022, -.138, .023, girl ? .016 : .010, .005);
    eye.rotation.z = side * (girl ? .15 : .08);
    oval(head, '#503430', side * .054, -.023, -.143, girl ? .013 : .0092, girl ? .015 : .009, .0035);
    oval(head, '#fff0dd', side * .054 - .003, girl ? -.016 : -.019, -.147, .0028, .0028, .0016);
    if (girl) {
      const cheek = oval(head, '#e6a393', side * .077, -.059, -.123, .021, .010, .003);
      cheek.rotation.y = side * -.56;
    }
    strip(head, girl ? '#64422f' : hair, .0029,
      [[side * .029, .012, -.142], [side * .054, .017, -.138], [side * .080, .009, -.131]]);
    strip(head, '#52352c', girl ? .0024 : .0017,
      [[side * .036, -.020, -.141], [side * .055, girl ? -.008 : -.012, -.145], [side * .077, -.017, -.139]]);
  }
  oval(head, skin, 0, -.048, -.143, girl ? .010 : .016, girl ? .013 : .021, girl ? .007 : .011);
  strip(head, girl ? '#a96e64' : '#9e6a5d', .0025,
    [[-.024, -.091, -.124], [-.011, -.094, -.132], [.008, -.095, -.132], [.022, -.090, -.124]]);
  if (!girl) {
    const glasses = '#4d4037';
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 16 }, (_, i) => {
        const angle = i / 16 * Math.PI * 2;
        const x = side * .067 + Math.cos(angle) * .055;
        const y = -.020 + Math.sin(angle) * .044;
        return new THREE.Vector3(x, y + side * (x - side * .067) * .09, -.169 + .055 * Math.abs(x));
      });
      const ring = new THREE.CatmullRomCurve3(points, true);
      mesh(head, own(new THREE.TubeGeometry(ring, 31, .0036, 6, true)), glasses).name = 'autumn-glasses-rim';
      strip(head, glasses, .003,
        [[side * .118, -.014, -.164], [side * .137, -.008, -.109], [side * .153, -.005, -.026]]);
    }
    strip(head, glasses, .0035, [[-.014, -.017, -.168], [0, -.010, -.174], [.014, -.017, -.168]]);
  }
  cut(head, [hair, hairLight], -.118, .068, (s) => {
    if (girl) {
      s.moveTo(-.151, -.027);
      s.bezierCurveTo(-.187, .092, -.113, .184, -.021, .189);
      s.bezierCurveTo(.051, .228, .181, .154, .169, .016);
      s.quadraticCurveTo(.123, .030, .097, .067);
      s.quadraticCurveTo(.057, .049, .026, .069);
      s.quadraticCurveTo(-.002, .088, -.020, .124);
      s.quadraticCurveTo(-.041, .067, -.085, .064);
      s.quadraticCurveTo(-.128, .047, -.151, -.027);
    } else {
      s.moveTo(-.148, -.020);
      s.quadraticCurveTo(-.177, .038, -.160, .085);
      s.quadraticCurveTo(-.190, .123, -.135, .164);
      s.quadraticCurveTo(-.138, .197, -.087, .197);
      s.quadraticCurveTo(-.063, .226, -.023, .211);
      s.quadraticCurveTo(.018, .231, .056, .203);
      s.quadraticCurveTo(.095, .221, .123, .165);
      s.quadraticCurveTo(.181, .146, .172, .105);
      s.quadraticCurveTo(.193, .080, .142, .021);
      s.quadraticCurveTo(.137, .063, .113, .079);
      s.quadraticCurveTo(.108, .051, .084, .050);
      s.quadraticCurveTo(.096, .083, .057, .093);
      s.quadraticCurveTo(.054, .057, .019, .044);
      s.quadraticCurveTo(.024, .077, -.018, .091);
      s.quadraticCurveTo(-.028, .053, -.059, .060);
      s.quadraticCurveTo(-.053, .081, -.082, .101);
      s.quadraticCurveTo(-.091, .063, -.121, .046);
    }
    s.closePath();
  }, .005);
  strip(head, glint, .003, [[-.136, .072, -.116], [-.102, .132, -.126], [-.056, .163, -.126], [-.026, .172, -.121]]);
  strip(head, hairLight, .004, [[-.097, .152, .091], [-.069, .158, .114], [-.04, .143, .141], [-.027, .099, .153]]);
  strip(head, glint, .0048, [[-.009, .176, -.123], [.051, .170, -.128], [.105, .131, -.129], [.142, .097, -.11]]);

  const backHair = group(head, 0, .06, .075);
  if (girl) {
    bow(head, -.106, .166, -.093, .83, .37);
    cut(backHair, [hair, hairLight], -.002, .084, (s) => {
      s.moveTo(-.116, .094);
      s.bezierCurveTo(-.187, .002, -.152, -.101, -.169, -.173);
      s.bezierCurveTo(-.205, -.264, -.148, -.331, -.190, -.413);
      s.quadraticCurveTo(-.137, -.439, -.094, -.406);
      s.quadraticCurveTo(-.031, -.466, .030, -.417);
      s.quadraticCurveTo(.127, -.454, .188, -.378);
      s.bezierCurveTo(.169, -.295, .204, -.267, .176, -.164);
      s.bezierCurveTo(.153, -.104, .205, .032, .135, .094);
      s.closePath();
    }).name = 'autumn-long-wavy-hair';
    for (const x of [-.130, -.079, -.029, .019, .064, .111]) {
      const curl = Math.cos(x * 28) * .020;
      strip(backHair, x === -.079 || x === .064 ? glint : hairLight, .0033,
        [[x, .025, .074], [x + curl, -.120, .092], [x - curl, -.244, .093], [x + curl, -.344, .090], [x + curl * .42, -.404, .082]]);
    }
    for (const side of [-1, 1]) {
      const tip = side === 1 ? -.318 : -.277;
      cut(head, [hair, hairLight], -.102, .071, (s) => {
        s.moveTo(side * .111, .14);
        s.bezierCurveTo(side * .190, .125, side * .169, -.032, side * .169, -.096);
        s.bezierCurveTo(side * .179, -.177, side * .207, -.237, side * .158, tip);
        s.quadraticCurveTo(side * .192, -.247, side * .135, -.208);
        s.bezierCurveTo(side * .101, -.169, side * .122, -.131, side * .119, -.080);
        s.quadraticCurveTo(side * .153, .014, side * .111, .14);
      }, .005);
      strip(head, glint, .0036,
        [[side * .127, .100, -.105], [side * .150, .023, -.112], [side * .142, -.104, -.112],
          [side * .153, -.196, -.109], [side * .178, -.233, -.105], [side * .169, tip + .024, -.103]]);
    }
  }

  const sleeve = own(new THREE.CylinderGeometry(.062, .050, .23, 9));
  const forearm = own(new THREE.CylinderGeometry(.050, .043, .178, 9));
  const arms = [-1, 1].map((side) => {
    const arm = group(upper, side * .162, .502, -.002);
    arm.name = side < 0 ? 'autumn-left-arm' : 'autumn-right-arm';
    const elbow = group(arm, 0, -.214);
    const wrist = group(elbow, 0, -.196);
    if (girl) {
      mesh(arm, sleeve, lace, 0, -.109);
      oval(arm, '#f8e4ca', 0, -.065, 0, .081, .112, .077);
      oval(arm, rose, 0, -.148, 0, .063, .028, .064);
      mesh(elbow, forearm, lace, 0, -.083);
      oval(elbow, rose, 0, -.153, 0, .049, .025, .050);
      oval(elbow, lace, 0, -.176, 0, .055, .025, .053);
    } else {
      mesh(arm, sleeve, coat, 0, -.105);
      mesh(elbow, forearm, coat, 0, -.083);
      oval(elbow, cuff, 0, -.161, 0, .048, .028, .049);
    }
    oval(wrist, skin, 0, -.002, -.009, .039, .052, .030);
    oval(wrist, skin, -side * .025, .009, -.033, .017, .029, .016);
    const grip = group(wrist, -side * .013, -.008, -.041);
    grip.name = side < 0 ? 'autumn-hand-left' : 'autumn-hand-right';
    return { arm, elbow, grip };
  });

  const thigh = own(new THREE.CylinderGeometry(.076, .064, .32, 8));
  const calf = own(new THREE.CylinderGeometry(.061, .048, .288, 8));
  const legs = [-1, 1].map((side) => {
    const hip = group(skeleton, side * .089, .693, .005);
    const knee = group(hip, 0, -.292);
    const ankle = group(knee, 0, -.29);
    mesh(hip, thigh, girl ? lace : pants, 0, -.141);
    mesh(knee, calf, girl ? lace : pants, 0, -.138);
    oval(ankle, girl ? ribbon : boot, 0, girl ? -.055 : -.037, -.037, .065, girl ? .047 : .066, .119);
    oval(ankle, '#392c2a', 0, -.081, -.040, .066, .021, .119);
    if (girl) {
      oval(knee, lace, 0, -.005, 0, .062, .061, .062);
      oval(ankle, lace, 0, -.012, -.032, .050, .023, .072);
      oval(ankle, ribbon, 0, .001, -.028, .063, .014, .021);
      oval(ankle, '#e9b77e', side * .046, .009, -.032, .011, .011, .014);
    } else {
      oval(ankle, '#7c6a5d', 0, .003, .004, .055, .030, .064);
    }
    return { hip, knee, ankle };
  });

  function pose(action, t = 0) {
    const walk = action === 'walk' || action === 'walk_together';
    const sit = action === 'sit';
    const offer = action === 'handover' || action === 'receive';
    const raise = action === 'arm_raise';
    const turn = action === 'turn';
    const p = easing(t);
    const stride = t * (action === 'walk_together' ? 8.8 : 10.4);
    const breath = Math.sin(t * 2.3);
    skeleton.position.y = sit ? -.21 * p : walk ? .034 * (1 - Math.cos(stride * 2)) : breath * .007;
    upper.rotation.set(sit ? .13 * p : walk ? .084 : 0, walk ? Math.sin(stride) * .07 : 0, walk ? Math.sin(stride) * .035 : 0);
    head.rotation.set(offer ? .12 * p : raise ? -.21 * p : breath * .025, turn ? .66 * p : Math.sin(t * 1.65) * .069, .027 + breath * .026);
    backHair.rotation.set(walk ? .17 + Math.sin(stride) * .066 : .025 * breath, 0, .025 * breath);
    if (skirt) {
      skirt.rotation.set(sit ? .64 * p : walk ? -.07 + Math.cos(stride * 2) * .036 : 0,
        walk ? Math.sin(stride) * .055 : 0, walk ? Math.sin(stride) * .044 : breath * .012);
    }

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const swing = Math.sin(stride) * side;
      const { arm, elbow } = arms[i];
      const { hip, knee, ankle } = legs[i];
      hip.rotation.x = sit ? 1.52 * p : walk ? swing * .56 : 0;
      knee.rotation.x = sit ? -1.52 * p : walk ? -Math.max(0, -swing) * .72 : 0;
      ankle.rotation.x = walk ? -hip.rotation.x * .37 - knee.rotation.x * .31 : 0;
      arm.rotation.set(sit ? .54 * p : walk ? -swing * .39 : .065, 0, side * .13);
      elbow.rotation.x = sit ? .31 * p : walk ? .14 + Math.max(0, swing) * .22 : .14;
    }
    if (offer || raise) {
      const { arm, elbow } = arms[1];
      arm.rotation.set((raise ? 2.14 : .98) * p, -.14 * p, .13 * (1 - p));
      elbow.rotation.x = (raise ? .39 : .48) * p + .14 * (1 - p);
    }
    if (action === 'reveal_bouquet') {
      const { arm, elbow } = arms[1];
      arm.rotation.set(THREE.MathUtils.lerp(-.88, 1.03, p), -.14 * p, THREE.MathUtils.lerp(.12, -.06, p));
      elbow.rotation.x = THREE.MathUtils.lerp(.27, .48, p);
      head.rotation.x = .11 * (1 - p);
    }
  }

  const handDirection = new THREE.Vector3();
  const forearmDirection = new THREE.Vector3();
  function reachHand(side, target) {
    const { arm, elbow, grip } = arms[side === 'left' ? 0 : 1];
    arm.parent.worldToLocal(handDirection.copy(target)).sub(arm.position);
    forearmDirection.copy(grip.parent.position).add(grip.position);
    const upperLength = -elbow.position.y;
    const hingeLength = Math.hypot(forearmDirection.y, forearmDirection.z);
    // Solve at the elbow first, then align the resulting grip with the shared target.
    const bend = (handDirection.lengthSq() - upperLength ** 2 - forearmDirection.lengthSq()) /
      (2 * upperLength * hingeLength);
    elbow.rotation.x = Math.acos(THREE.MathUtils.clamp(bend, -1, 1)) -
      Math.atan2(-forearmDirection.z, -forearmDirection.y);
    forearmDirection.applyEuler(elbow.rotation).add(elbow.position);
    arm.quaternion.setFromUnitVectors(forearmDirection.normalize(), handDirection.normalize());
    return grip;
  }

  const gaze = new THREE.Vector3();
  function lookToward(target, tilt, weight) {
    head.parent.worldToLocal(gaze.copy(target)).sub(head.position);
    const pitch = Math.atan2(gaze.y, Math.hypot(gaze.x, gaze.z));
    const yaw = Math.atan2(-gaze.x, -gaze.z);
    head.rotation.set(
      THREE.MathUtils.lerp(head.rotation.x, pitch, weight),
      THREE.MathUtils.lerp(head.rotation.y, yaw, weight),
      THREE.MathUtils.lerp(head.rotation.z, tilt, weight),
      'YXZ',
    );
  }

  pose('idle');
  return {
    root, pose, reachHand, lookToward, hand: arms[1].grip,
    dispose() {
      root.removeFromParent();
      for (const resource of resources) resource.dispose();
      resources.clear();
    },
  };
}
