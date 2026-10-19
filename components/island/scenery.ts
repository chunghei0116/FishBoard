import * as T from "three";
const colors = {
  sand: 0xf1d6a0,
  grass: 0x8fb46a,
  wood: 0xb27c4d,
  dark: 0x414b3c,
  cream: 0xffefcd,
  coral: 0xc76751,
};
export function createScenery(scene: T.Scene) {
  const materialCache = new Map<number, T.MeshStandardMaterial>();
  function mat(color: number) {
    if (!materialCache.has(color))
      materialCache.set(
        color,
        new T.MeshStandardMaterial({
          color,
          roughness: 0.9,
          flatShading: true,
        }),
      );
    return materialCache.get(color)!;
  }
  function mesh(
    g: T.BufferGeometry,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    const m = new T.Mesh(g, mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    w: number,
    h: number,
    d: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    return mesh(new T.BoxGeometry(w, h, d), c, x, y, z, parent);
  }
  function ball(
    r: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    return mesh(new T.IcosahedronGeometry(r, 1), c, x, y, z, parent);
  }
  function cylinder(
    rt: number,
    rb: number,
    h: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
    n = 12,
  ) {
    return mesh(new T.CylinderGeometry(rt, rb, h, n), c, x, y, z, parent);
  }
  // Three sculpted shoreline layers, each built from the same irregular outline.
  const outline = new T.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2,
      r = 1 + 0.035 * Math.sin(a * 5) + 0.022 * Math.cos(a * 9);
    const x = Math.cos(a) * 9.8 * r,
      z = Math.sin(a) * 7.5 * r;
    if (i === 0) outline.moveTo(x, z);
    else outline.lineTo(x, z);
  }
  function islandLayer(scale: number, depth: number, y: number, c: number) {
    const g = new T.ExtrudeGeometry(outline, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.18,
      bevelSegments: 2,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    const m = mesh(g, c, 0, y, 0);
    m.scale.set(scale, 1, scale);
    return m;
  }
  islandLayer(1.1, 0.22, -0.37, 0x9ad1bb);
  islandLayer(1, 0.55, -0.15, colors.sand);
  islandLayer(0.86, 0.14, 0.48, colors.grass);
  // Sandy footpaths laid as overlapping rounded stepping patches.
  for (let i = 0; i < 28; i++) {
    const x = -6 + i * 0.43,
      z = 0.2 + Math.sin(i * 0.28) * 0.55;
    const m = cylinder(0.65, 0.65, 0.025, 0xe9cf9a, x, 0.815, z);
    m.scale.z = 0.75;
  }
  for (let i = 0; i < 12; i++)
    cylinder(0.55, 0.55, 0.03, 0xe9cf9a, 1.2 + i * 0.44, 0.815, 0.6 + i * 0.35);
  for (let i = 0; i < 9; i++)
    cylinder(0.48, 0.48, 0.025, 0xe9cf9a, 0.4, 0.815, -i * 0.39);
  // Cabin.
  box(3.2, 2.4, 2.8, colors.cream, -5, 1.85, -3.5);
  for (let i = 0; i < 9; i++)
    box(3.24, 0.045, 2.84, 0xe5cea3, -5, 0.85 + i * 0.25, -3.5);
  box(0.85, 1.65, 0.1, 0x658a7c, -5, 1.48, -2.04);
  ball(0.055, 0xeac278, -4.72, 1.45, -1.95);
  for (const x of [-6.05, -3.95]) {
    box(0.63, 0.78, 0.1, 0xffffff, x, 2.05, -2.02);
    box(0.47, 0.6, 0.12, 0x79b5bd, x, 2.05, -1.95);
    box(0.045, 0.65, 0.13, 0xf5e7c5, x, 2.05, -1.87);
    box(0.53, 0.045, 0.13, 0xf5e7c5, x, 2.05, -1.87);
  }
  const roof = new T.BufferGeometry();
  roof.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [
        -1.95, 0, -1.8, 1.95, 0, -1.8, 1.95, 0, 1.8, -1.95, 0, 1.8, 0, 1.3,
        -1.8, 0, 1.3, 1.8,
      ],
      3,
    ),
  );
  roof.setIndex([0, 4, 5, 0, 5, 3, 4, 1, 2, 4, 2, 5, 0, 1, 4, 3, 5, 2]);
  roof.computeVertexNormals();
  const roofMesh = mesh(roof, colors.coral, -5, 3.1, -3.5);
  roofMesh.material = roofMesh.material.clone();
  (roofMesh.material as T.MeshStandardMaterial).side = T.DoubleSide;
  for (let i = 0; i < 13; i++) {
    const z = -5.25 + i * 0.29;
    for (const side of [-1, 1]) {
      const slat = box(2.3, 0.055, 0.045, 0xb75343, -5 + side * 0.96, 3.74, z);
      slat.rotation.z = -side * 0.59;
    }
  }
  box(0.4, 1.2, 0.5, 0xc5b8a0, -5.8, 3.7, -4.1);
  box(0.65, 0.12, 0.7, 0xe5d4b3, -5.8, 4.32, -4.1);
  box(3.9, 0.22, 1, colors.wood, -5, 0.7, -1.7);
  for (const x of [-6.65, -3.35]) {
    box(0.12, 2.15, 0.12, colors.wood, x, 1.75, -1.5);
  }
  box(3.6, 0.15, 0.16, colors.wood, -5, 2.78, -1.5);
  // Outdoor glass aquarium, containing original low-poly fish.
  box(3.1, 0.65, 1.5, 0xb98a5b, -4.7, 0.95, 2.4);
  box(3.3, 0.12, 1.7, 0xf5dfb5, -4.7, 1.32, 2.4);
  const glass = new T.MeshPhysicalMaterial({
    color: 0x82d4d1,
    transparent: true,
    opacity: 0.4,
    roughness: 0.15,
    metalness: 0,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const tank = new T.Mesh(new T.BoxGeometry(3, 1.25, 1.4), glass);
  tank.position.set(-4.7, 1.98, 2.4);
  scene.add(tank);
  for (const x of [-6.2, -3.2])
    for (const z of [1.7, 3.1]) box(0.06, 1.28, 0.06, 0xf4e5bf, x, 1.97, z);
  box(3.15, 0.09, 1.53, 0xf3dfb2, -4.7, 2.62, 2.4);
  const fishes: T.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const fish = new T.Group();
    scene.add(fish);
    fish.position.set(-5.6 + i * 0.44, 1.7 + (i % 2) * 0.3, 2.4);
    const body = ball(
      0.19,
      [0xf7b956, 0xe58469, 0xf2eee0, 0x7faaa4, 0xedc86c][i],
      0,
      0,
      0,
      fish,
    );
    body.scale.set(1.5, 0.75, 0.55);
    const tail = mesh(
      new T.ConeGeometry(0.16, 0.27, 3),
      0xeac16c,
      -0.32,
      0,
      0,
      fish,
    );
    tail.rotation.z = Math.PI / 2;
    ball(0.035, 0x293b3e, 0.22, 0.035, 0.09, fish);
    fishes.push(fish);
  }
  // Journal picnic table.
  box(1.8, 0.14, 1.05, colors.wood, 0, 1.25, -3);
  for (const x of [-0.7, 0.7])
    for (const z of [-3.35, -2.65])
      box(0.12, 0.65, 0.12, colors.wood, x, 0.91, z);
  box(1.9, 0.15, 0.32, 0xc39865, 0, 0.95, -2.15);
  const book = box(0.65, 0.09, 0.62, 0x466e64, 0, 1.38, -3);
  book.rotation.y = 0.18;
  box(0.55, 0.025, 0.53, 0xf7e6c3, 0, 1.44, -3);
  box(0.025, 0.03, 0.53, 0xbe795c, 0, 1.46, -3);
  cylinder(0.12, 0.12, 0.24, 0xf8e7c4, 0.62, 1.44, -3.15);
  // Toolbox and rod stand.
  box(1.35, 0.65, 0.78, 0xc9674c, 5, 1.03, 2);
  box(1.44, 0.16, 0.86, 0xe98a64, 5, 1.43, 2);
  box(0.13, 0.25, 0.08, 0xf5d59c, 5, 1.35, 2.47);
  box(0.63, 0.07, 0.08, colors.dark, 5, 1.68, 2);
  for (const x of [4.71, 5.29]) box(0.07, 0.2, 0.08, colors.dark, x, 1.59, 2);
  const rod = box(0.045, 2.8, 0.045, 0x505d4e, 6, 1.9, 1.65);
  rod.rotation.z = -0.2;
  const line = new T.Line(
    new T.BufferGeometry().setFromPoints([
      new T.Vector3(6.28, 3.25, 1.65),
      new T.Vector3(6.6, 1.1, 1.65),
    ]),
    new T.LineBasicMaterial({ color: 0xefead3 }),
  );
  scene.add(line);
  cylinder(0.35, 0.29, 0.45, 0xb0c2bd, 5.6, 0.92, 3.1);
  cylinder(0.29, 0.29, 0.025, 0x5b9292, 5.6, 1.16, 3.1);
  // Map board.
  for (const x of [3.3, 4.7]) box(0.14, 2.25, 0.14, colors.wood, x, 1.65, -4);
  box(2, 0.95, 0.14, colors.wood, 4, 2.25, -4);
  box(1.76, 0.73, 0.04, 0xf5e3b9, 4, 2.25, -3.9);
  for (let i = 0; i < 5; i++) {
    const blob = ball(
      0.18,
      0x8dad7b,
      3.55 + i * 0.22,
      2.3 + Math.sin(i * 2) * 0.16,
      -3.86,
    );
    blob.scale.set(1, 0.6, 0.1);
  }
  const boardRoof = box(2.25, 0.12, 0.6, 0x6b8d76, 4, 2.9, -4);
  boardRoof.rotation.x = 0.12;
  // Pier with planks, rope posts and bobbing boat.
  for (let i = 0; i < 22; i++)
    box(
      1.8,
      0.13,
      0.25,
      i % 3 === 0 ? 0xc39a6a : 0xb48859,
      6.35,
      0.55,
      3.9 + i * 0.27,
    );
  for (const z of [4.1, 6, 8, 9.5])
    for (const x of [5.5, 7.2]) {
      cylinder(0.1, 0.12, 1.3, 0x886743, x, 0.42, z);
      cylinder(0.14, 0.14, 0.08, 0xe5d6b5, x, 1.1, z);
    }
  const boat = new T.Group();
  boat.position.set(8.3, 0.05, 8.4);
  boat.rotation.y = -0.2;
  scene.add(boat);
  const hull = mesh(
    new T.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    0xf0e8c9,
    0,
    0.2,
    0,
    boat,
  );
  hull.rotation.x = Math.PI;
  hull.scale.set(0.7, 0.45, 1.6);
  box(1.15, 0.12, 0.3, colors.wood, 0, 0.15, 0, boat);
  box(0.11, 0.1, 2.4, colors.wood, 0.35, 0.25, 0, boat);
  // Trees and planting, with deterministic variation.
  function tree(x: number, z: number, s = 1) {
    const group = new T.Group();
    scene.add(group);
    group.position.set(x, 0.66, z);
    group.scale.setScalar(s);
    cylinder(0.13, 0.22, 1.8, 0x8f7953, 0, 0.9, 0, group);
    for (let j = 0; j < 3; j++) {
      const top = mesh(
        new T.ConeGeometry(1 - j * 0.18, 1.9 - j * 0.2, 7),
        [0x507b58, 0x608b5e, 0x709d68][j],
        0,
        1.7 + j * 0.6,
        0,
        group,
      );
      top.rotation.y = j * 0.6;
    }
    return group;
  }
  for (const [x, z, s] of [
    [-7, -3, 1.1],
    [-7, -0.7, 0.8],
    [-7, 3.7, 0.9],
    [-5.7, -5.2, 1],
    [-2.8, -5.4, 1.2],
    [-1.4, -5.5, 0.9],
    [1.5, -5.5, 1.1],
    [5.9, -4.3, 0.85],
    [7, -1.8, 1],
    [7.4, 0.1, 0.75],
    [-2.8, 5.2, 0.8],
    [-1.4, 5.7, 0.6],
  ])
    tree(x, z, s);
  for (let i = 0; i < 65; i++) {
    const a = i * 2.399,
      r = 6.3 + Math.sin(i * 7) * 0.7,
      x = Math.cos(a) * r * 1.22,
      z = Math.sin(a) * r * 0.84;
    if ((x > 4 && z > 2) || (x < -3 && z < -1 && z > -5)) continue;
    const b = ball(
      0.2 + (i % 4) * 0.06,
      [0x73964f, 0x87a65b, 0x9db96c][i % 3],
      x,
      0.85,
      z,
    );
    b.scale.y = 0.8;
    if (i % 3 === 0) {
      for (let j = 0; j < 3; j++)
        ball(0.06, 0xffe7b1, x + j * 0.14 - 0.14, 1.05, z);
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4,
      x = Math.cos(a) * 9.1,
      z = Math.sin(a) * 6.65;
    const rock = ball(0.22 + (i % 3) * 0.1, 0xb4baa2, x, 0.62, z);
    rock.scale.set(1.4, 0.65, 1);
  }
  // Seashells, beach towel and umbrella.
  const umbrella = new T.Group();
  umbrella.position.set(-1, 0.6, 4.5);
  scene.add(umbrella);
  cylinder(0.035, 0.035, 2.2, colors.wood, 0, 1.1, 0, umbrella);
  mesh(new T.ConeGeometry(1.15, 0.6, 8), 0xe7ad70, 0, 2.2, 0, umbrella);
  box(0.8, 0.025, 1.7, 0xf2ead2, -1, 0.83, 4.6);
  for (let i = 0; i < 3; i++)
    box(0.8, 0.03, 0.12, 0xc7785a, -1, 0.85, 4.2 + i * 0.3);
  // Water glints, animated without expensive full-surface deformation.
  const glints: T.Mesh[] = [];
  for (let i = 0; i < 110; i++) {
    const a = i * 2.399,
      r = 11 + (i % 9) * 1.4;
    const g = box(
      0.25 + (i % 4) * 0.14,
      0.014,
      0.04,
      0xb0ded0,
      Math.cos(a) * r,
      -0.02,
      Math.sin(a) * r * 0.7,
    );
    g.castShadow = false;
    glints.push(g);
  }
  const gulls: T.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const gull = new T.Group();
    for (const side of [-1, 1]) {
      const wing = box(0.38, 0.035, 0.11, 0xfff5dc, side * 0.16, 0, 0, gull);
      wing.rotation.z = side * 0.25;
    }
    scene.add(gull);
    gulls.push(gull);
  }
  return { fishes, boat, glints, gulls, mat, box, ball, cylinder };
}
