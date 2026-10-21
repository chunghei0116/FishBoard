import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sampleGait } from "../../lib/character-motion.ts";

// Original geometry, modelled at island scale. Forward is +Z, ground is Y=0.
export function createAngler() {
  const root = new T.Group();
  root.name = "IslandAngler";
  const rig = new T.Group();
  rig.name = "AnglerMotion";
  root.add(rig);
  const palette = Object.fromEntries(Object.entries({
    skin: "#d4a078", hair: "#49372e", ink: "#253a3e",
    sand: "#d7c399", band: "#857c51", shirt: "#668e9a",
    vest: "#929572", pocket: "#b1ae8a", shorts: "#435d61",
    socks: "#e4ddc9", boots: "#785d44", sole: "#473f36",
    bag: "#b67950", brass: "#d8b975", white: "#f7edd7",
  }).map(([key, color]) => [key, new T.MeshStandardMaterial({ color, roughness: 0.94, flatShading: true })]));
  function mesh(parent, name, geometry, color, position, scale = [1, 1, 1]) {
    const faceted = geometry.index ? geometry.toNonIndexed() : geometry;
    if (faceted !== geometry) geometry.dispose();
    faceted.computeVertexNormals();
    const obj = new T.Mesh(faceted, palette[color]);
    obj.name = name;
    obj.position.set(...position);
    obj.scale.set(...scale);
    parent.add(obj);
    return obj;
  }
  function box(parent, name, size, color, position) {
    if (Math.min(...size) < 0.055) return mesh(parent, name, new T.BoxGeometry(...size), color, position);
    const [w, h, d] = size, bevel = Math.min(0.022, Math.min(...size) * 0.16);
    const x = w / 2 - bevel, y = h / 2 - bevel;
    const shape = new T.Shape().moveTo(-x, -y).lineTo(x, -y).lineTo(x, y).lineTo(-x, y).closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: d - bevel * 2, bevelEnabled: true, bevelSegments: 1,
      bevelThickness: bevel, bevelSize: bevel, steps: 1, curveSegments: 1,
    });
    geometry.translate(0, 0, -(d - bevel * 2) / 2);
    return mesh(parent, name, geometry, color, position);
  }
  const ico = (parent, name, size, color, position, detail = 0) => mesh(parent, name, new T.IcosahedronGeometry(1, detail), color, position, size);
  const cylinder = (parent, name, top, bottom, height, color, position, sides = 8, depth = 1) => mesh(parent, name, new T.CylinderGeometry(top, bottom, height, sides), color, position, [1, 1, depth]);
  function joint(parent, name, position) {
    const group = new T.Group();
    group.name = name;
    group.position.set(...position);
    parent.add(group);
    return group;
  }

  const torso = joint(rig, "Torso", [0, 1.25, 0]);
  cylinder(torso, "SeaBlueShirt", 0.25, 0.28, 0.59, "shirt", [0, 0, 0], 6, 0.7);
  box(torso, "VestBack", [0.49, 0.48, 0.055], "vest", [0, 0.015, -0.165]);
  for (const side of [-1, 1]) {
    const panel = box(torso, `VestPanel${side}`, [0.195, 0.46, 0.07], "vest", [side * 0.153, 0.005, 0.16]);
    panel.rotation.z = -side * 0.065;
    box(torso, `UtilityPocket${side}`, [0.15, 0.14, 0.055], "pocket", [side * 0.153, -0.1, 0.215]);
    box(torso, `PocketFlap${side}`, [0.16, 0.038, 0.065], "vest", [side * 0.153, -0.035, 0.22]);
    box(torso, `VestShoulder${side}`, [0.14, 0.055, 0.32], "vest", [side * 0.175, 0.27, 0]);
  }
  box(torso, "FieldNotebook", [0.065, 0.095, 0.025], "white", [-0.15, 0.15, 0.21]);
  box(torso, "NotebookBinding", [0.013, 0.095, 0.03], "bag", [-0.18, 0.15, 0.215]);
  cylinder(torso, "Neck", 0.085, 0.095, 0.15, "skin", [0, 0.36, 0]);

  const head = joint(torso, "Head", [0, 0.63, 0]);
  ico(head, "FacetedFace", [0.29, 0.33, 0.255], "skin", [0, 0, 0.015], 1);
  ico(head, "CroppedHair", [0.3, 0.25, 0.24], "hair", [0, 0.11, -0.075], 1);
  for (const side of [-1, 1]) {
    ico(head, `Ear${side}`, [0.055, 0.08, 0.055], "skin", [side * 0.275, -0.015, 0]);
    ico(head, `Eye${side}`, [0.023, 0.032, 0.016], "ink", [side * 0.105, 0.015, 0.255], 1);
    const brow = box(head, `Brow${side}`, [0.062, 0.015, 0.018], "hair", [side * 0.105, 0.085, 0.245]);
    brow.rotation.z = side * -0.08;
    box(head, `Sideburn${side}`, [0.045, 0.13, 0.07], "hair", [side * 0.25, 0.08, 0.04]);
  }
  ico(head, "SmallNose", [0.035, 0.04, 0.048], "skin", [0, -0.038, 0.26]);
  // A tiny angular smile built from solid bars survives glTF export at island scale.
  for (const side of [-1, 1]) {
    const mouth = box(head, `Smile${side}`, [0.041, 0.009, 0.01], "hair", [side * 0.02, -0.12, 0.246]);
    mouth.rotation.z = side * 0.16;
  }
  cylinder(head, "BucketHatBrim", 0.37, 0.43, 0.075, "sand", [0, 0.255, 0], 10, 0.94);
  cylinder(head, "BucketHatCrown", 0.255, 0.32, 0.235, "sand", [0, 0.4, -0.012], 8, 0.96);
  cylinder(head, "HatBand", 0.313, 0.325, 0.052, "band", [0, 0.3, -0.012], 8, 0.96);
  box(head, "HatBadge", [0.072, 0.046, 0.018], "brass", [-0.16, 0.31, 0.268]);

  // Compact canvas fishing bag with a visible flap and brass clasp.
  box(torso, "CanvasPack", [0.34, 0.38, 0.16], "bag", [0, -0.015, -0.27]);
  box(torso, "PackFlap", [0.37, 0.14, 0.065], "sand", [0, 0.11, -0.365]);
  box(torso, "PackClasp", [0.045, 0.07, 0.025], "brass", [0, 0.04, -0.407]);
  for (const side of [-1, 1]) {
    box(torso, `PackStrap${side}`, [0.038, 0.37, 0.03], "boots", [side * 0.205, 0.09, 0.208]);
    box(torso, `PackHandle${side}`, [0.025, 0.085, 0.025], "boots", [side * 0.06, 0.23, -0.27]);
  }
  box(torso, "PackHandleTop", [0.145, 0.025, 0.025], "boots", [0, 0.265, -0.27]);
  cylinder(torso, "RolledMat", 0.062, 0.062, 0.39, "shirt", [0, -0.24, -0.28], 6).rotation.z = Math.PI / 2;

  box(rig, "ShortsWaist", [0.48, 0.2, 0.32], "shorts", [0, 0.92, 0]);
  box(rig, "Belt", [0.485, 0.04, 0.325], "boots", [0, 1, 0]);
  box(rig, "BeltBuckle", [0.06, 0.045, 0.025], "brass", [0, 1, 0.175]);
  for (const [index, side] of [-1, 1].entries()) {
    const leg = joint(rig, `Thigh${index}`, [side * 0.145, 0.94, 0]);
    cylinder(leg, `ShortsLeg${index}`, 0.135, 0.145, 0.26, "shorts", [0, -0.14, 0], 6, 0.9);
    cylinder(leg, `UpperLeg${index}`, 0.085, 0.08, 0.19, "skin", [0, -0.275, 0], 6);
    const knee = joint(leg, `Knee${index}`, [0, -0.34, 0]);
    cylinder(knee, `Calf${index}`, 0.08, 0.062, 0.34, "skin", [0, -0.16, 0], 6);
    cylinder(knee, `Sock${index}`, 0.072, 0.07, 0.14, "socks", [0, -0.25, 0], 6);
    const foot = joint(knee, `Foot${index}`, [0, -0.34, 0]);
    box(foot, `DeckBoot${index}`, [0.19, 0.19, 0.3], "boots", [0, -0.105, 0.055]);
    box(foot, `BootSole${index}`, [0.2, 0.04, 0.315], "sole", [0, -0.195, 0.06]);
    box(foot, `BootCuff${index}`, [0.195, 0.045, 0.2], "sand", [0, -0.025, 0.005]);

    const arm = joint(torso, `Arm${index}`, [side * 0.31, 0.21, 0]);
    cylinder(arm, `ShortSleeve${index}`, 0.115, 0.105, 0.19, "shirt", [side * 0.025, -0.09, 0], 6);
    cylinder(arm, `UpperArm${index}`, 0.075, 0.065, 0.17, "skin", [side * 0.035, -0.22, 0], 6);
    const elbow = joint(arm, `Elbow${index}`, [side * 0.035, -0.29, 0]);
    cylinder(elbow, `Forearm${index}`, 0.065, 0.05, 0.22, "skin", [0, -0.105, 0], 6);
    ico(elbow, `Hand${index}`, [0.07, 0.085, 0.065], "skin", [0, -0.25, 0], 0);
  }

  const times = Array.from({ length: 33 }, (_, i) => i / 32);
  function clip(name, moving) {
    const tracks = [];
    function rotate(node, angles) {
      const values = angles.flatMap((angle) => new T.Quaternion().setFromEuler(new T.Euler(...angle)).toArray());
      tracks.push(new T.QuaternionKeyframeTrack(`${node}.quaternion`, times, values));
    }
    const poses = times.map((t) => sampleGait({ blend: moving ? 1 : 0, phase: t * Math.PI * 2, yaw: 0 }, t * Math.PI * 2 / 1.8, false));
    tracks.push(new T.VectorKeyframeTrack("AnglerMotion.position", times, poses.flatMap((g) => [0, g.bob + g.breath, 0])));
    rotate("Torso", poses.map((g) => [g.lean, 0, g.sway]));
    rotate("Head", times.map((t) => [0, moving ? 0 : Math.sin(t * Math.PI * 2) * 0.035, 0]));
    for (let i = 0; i < 2; i++) {
      rotate(`Thigh${i}`, poses.map((g) => [g.legs[i], 0, 0]));
      rotate(`Knee${i}`, poses.map((g) => [g.knees[i], 0, 0]));
      rotate(`Arm${i}`, poses.map((g) => [g.arms[i], 0, i === 0 ? -0.065 : 0.065]));
      rotate(`Elbow${i}`, poses.map((g) => [-0.12 - Math.max(0, -g.arms[i]) * 0.4, 0, 0]));
    }
    return new T.AnimationClip(name, 1, tracks);
  }
  root.updateMatrixWorld(true);
  return { root, animations: [clip("Idle", false), clip("Walk", true)] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // GLTFExporter's binary writer uses FileReader; Node provides Blob instead.
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); });
    }
  };
  const { root, animations } = createAngler();
  let triangles = 0;
  root.traverse((obj) => {
    if (obj.isMesh) triangles += obj.geometry.attributes.position.count / 3;
  });
  if (triangles > 4000) throw new Error(`Character exceeds triangle budget: ${triangles}`);
  const glb = await new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: true });
  await writeFile(new URL("../../public/models/island-angler.glb", import.meta.url), Buffer.from(glb));
  console.log(`Original island angler: ${triangles} triangles, ${(glb.byteLength / 1024).toFixed(0)} KB, Idle/Walk clips`);
}
