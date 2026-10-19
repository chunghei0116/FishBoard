import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { sampleGait, type MotionState } from "@/lib/character-motion";

/** Original smooth-shaded fisherman, with limbs articulated at real joints. */
export function createCharacter(scene: T.Scene) {
  const group = new T.Group(),
    body = new T.Group();
  group.add(body);
  scene.add(group);
  const materials = new Map<number, T.MeshStandardMaterial>();
  const material = (color: number) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
    return materials.get(color)!;
  };
  function mesh(
    geometry: T.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) {
    const m = new T.Mesh(geometry, material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const round = (
    w: number,
    h: number,
    d: number,
    r: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), c, x, y, z, parent);
  const sphere = (
    r: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) => mesh(new T.SphereGeometry(r, 32, 24), c, x, y, z, parent);
  const capsule = (
    r: number,
    length: number,
    c: number,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) => mesh(new T.CapsuleGeometry(r, length, 8, 24), c, x, y, z, parent);
  const joint = (
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const skin = 0xe8b990,
    shirt = 0xe9bf77,
    vest = 0xc58c48,
    trousers = 0x4e7180,
    boots = 0x665445;
  // Soft jacket, collar and pocket seams.
  round(0.57, 0.62, 0.38, 0.13, vest, 0, 0.94, 0);
  round(0.32, 0.44, 0.045, 0.025, shirt, 0, 1.03, 0.195);
  for (const side of [-1, 1]) {
    round(0.18, 0.4, 0.06, 0.025, vest, side * 0.205, 0.99, 0.205);
    round(0.14, 0.16, 0.045, 0.02, 0xd8a35b, side * 0.205, 0.84, 0.25);
    round(0.15, 0.035, 0.05, 0.012, 0xe7bd79, side * 0.205, 0.92, 0.255);
    sphere(0.018, 0x927048, side * 0.205, 0.91, 0.286);
  }
  capsule(0.09, 0.06, skin, 0, 1.29, 0);
  round(0.13, 0.06, 0.12, 0.02, 0xf1d39c, -0.08, 1.26, 0.15);
  round(0.13, 0.06, 0.12, 0.02, 0xf1d39c, 0.08, 1.26, 0.15);
  // Full rounded face, ears, nose, hair and eyes with white highlights.
  const head = joint(0, 1.53, 0);
  const face = sphere(0.285, skin, 0, 0, 0, head);
  face.scale.set(0.95, 1.05, 0.92);
  for (const side of [-1, 1]) {
    const ear = sphere(0.065, skin, side * 0.264, -0.015, 0, head);
    ear.scale.set(0.6, 1, 0.8);
    const eye = sphere(0.032, 0x353d35, side * 0.092, 0.025, 0.24, head);
    eye.scale.set(0.8, 1.12, 0.5);
    sphere(0.008, 0xfff7e7, side * 0.092 - 0.006, 0.034, 0.256, head);
    const brow = round(
      0.065,
      0.012,
      0.016,
      0.005,
      0x78604b,
      side * 0.093,
      0.094,
      0.239,
      head,
    );
    brow.rotation.z = -side * 0.06;
    const cheek = sphere(0.042, 0xdda282, side * 0.15, -0.055, 0.225, head);
    cheek.scale.set(1, 0.45, 0.18);
  }
  const nose = sphere(0.047, skin, 0, -0.023, 0.26, head);
  nose.scale.set(0.75, 0.85, 1);
  const smile = new T.EllipseCurve(
    0,
    0,
    0.048,
    0.025,
    Math.PI * 1.12,
    Math.PI * 1.88,
    false,
    0,
  )
    .getPoints(20)
    .map((p) => new T.Vector3(p.x, p.y - 0.071, 0.251));
  const mouth = new T.Mesh(
    new T.TubeGeometry(new T.CatmullRomCurve3(smile), 20, 0.006, 6, false),
    material(0x966f55),
  );
  head.add(mouth);
  const hair = sphere(0.279, 0x6d5946, 0, 0.035, -0.035, head);
  hair.scale.set(1, 0.8, 0.94);
  // A lathed crown and curved brim give the straw hat a continuous silhouette.
  const profile = [
    [0, 0.28],
    [0.12, 0.28],
    [0.22, 0.26],
    [0.25, 0.21],
    [0.26, 0.08],
    [0.28, 0.04],
    [0.42, 0.025],
    [0.46, 0],
    [0.45, -0.025],
    [0.38, -0.035],
    [0.27, -0.02],
    [0.25, 0.05],
    [0.23, 0.21],
    [0.18, 0.24],
    [0, 0.24],
  ].map(([x, y]) => new T.Vector2(x, y));
  mesh(new T.LatheGeometry(profile, 64), 0xf2d8a0, 0, 0.25, 0, head);
  mesh(
    new T.CylinderGeometry(0.263, 0.275, 0.066, 48),
    0xb97b52,
    0,
    0.316,
    0,
    head,
  );
  const hatStitch = mesh(
    new T.TorusGeometry(0.412, 0.007, 6, 64),
    0xe3c28a,
    0,
    0.252,
    0,
    head,
  );
  hatStitch.rotation.x = Math.PI / 2;
  round(0.07, 0.055, 0.025, 0.012, 0xd8b27c, 0.12, 0.315, 0.243, head);
  // Hip, knee, shoulder and elbow pivots carry the meshes, hands and boots together.
  const legs: T.Group[] = [],
    knees: T.Group[] = [],
    arms: T.Group[] = [],
    elbows: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = joint(side * 0.155, 0.69, 0);
    legs.push(leg);
    capsule(0.105, 0.15, trousers, 0, -0.13, 0, leg);
    const knee = joint(0, -0.29, 0, leg);
    knees.push(knee);
    capsule(0.097, 0.12, trousers, 0, -0.1, 0, knee);
    round(0.205, 0.075, 0.2, 0.025, 0x63838e, 0, -0.205, 0, knee);
    round(0.225, 0.18, 0.35, 0.065, boots, 0, -0.255, 0.055, knee);
    round(0.235, 0.045, 0.36, 0.018, 0x41433b, 0, -0.33, 0.055, knee);
    const arm = joint(side * 0.34, 1.15, 0);
    arms.push(arm);
    capsule(0.095, 0.16, shirt, side * 0.015, -0.14, 0, arm);
    const elbow = joint(side * 0.025, -0.29, 0, arm);
    elbows.push(elbow);
    capsule(0.078, 0.12, shirt, 0, -0.08, 0, elbow);
    round(0.16, 0.045, 0.16, 0.018, 0xf1d19b, 0, -0.17, 0, elbow);
    const hand = sphere(0.087, skin, 0, -0.235, 0.015, elbow);
    hand.scale.y = 1.15;
    sphere(0.042, skin, -side * 0.062, -0.22, 0.054, elbow);
    arm.rotation.z = side * 0.08;
  }
  // Canvas backpack with a lid, front pocket and brass fasteners.
  const backpack = joint(0, 0.99, -0.27);
  round(0.43, 0.48, 0.24, 0.085, 0x78866c, 0, 0, -0.035, backpack);
  round(0.46, 0.13, 0.27, 0.05, 0x8b9676, 0, 0.19, -0.035, backpack);
  round(0.29, 0.18, 0.07, 0.035, 0x909b7f, 0, -0.08, -0.18, backpack);
  for (const side of [-1, 1]) {
    round(
      0.038,
      0.33,
      0.025,
      0.012,
      0xc4b58d,
      side * 0.145,
      0.025,
      -0.17,
      backpack,
    );
    round(
      0.06,
      0.055,
      0.025,
      0.009,
      0xc8aa6f,
      side * 0.145,
      -0.04,
      -0.19,
      backpack,
    );
    round(0.045, 0.46, 0.055, 0.02, 0xa6a584, side * 0.24, 1.02, 0.2);
  }
  function animate(state: MotionState, time: number, reduced: boolean) {
    const gait = sampleGait(state, time, reduced);
    group.rotation.y = state.yaw;
    body.position.y = gait.bob + gait.breath;
    body.rotation.z = gait.sway;
    body.rotation.x = gait.lean;
    head.rotation.y =
      Math.sin(time * 0.65) * 0.035 * (1 - state.blend) * (reduced ? 0 : 1);
    backpack.rotation.x = -gait.lean * 0.4;
    legs.forEach((g, i) => (g.rotation.x = gait.legs[i]));
    knees.forEach((g, i) => (g.rotation.x = gait.knees[i]));
    arms.forEach((g, i) => (g.rotation.x = gait.arms[i] - 0.06));
    elbows.forEach(
      (g, i) => (g.rotation.x = -0.12 - Math.max(0, -gait.arms[i]) * 0.45),
    );
  }
  return { group, animate };
}
