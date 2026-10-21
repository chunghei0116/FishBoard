import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const path = new URL("../public/models/hoodie-character.glb", import.meta.url);
const lowPolyPath = new URL("../public/models/hoodie-character-low-poly.glb", import.meta.url);
function readAsset(assetPath = path) {
  const data = readFileSync(assetPath);
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  assert.equal(data.readUInt32LE(4), 2);
  const length = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + length).toString());
}

// Rig/topology checks need the original binary geometry, not browser image decoding.
// Keep the skin/animation buffers intact and remove material bindings in this test copy.
async function loadGeometryAsset(assetPath = path) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const data = readFileSync(assetPath),
    gltf = readAsset(assetPath),
    jsonLength = data.readUInt32LE(12),
    binStart = 28 + jsonLength;
  const binary = data.subarray(
    binStart,
    binStart + data.readUInt32LE(20 + jsonLength),
  );
  delete gltf.buffers[0].uri;
  for (const mesh of gltf.meshes)
    for (const primitive of mesh.primitives) delete primitive.material;
  delete gltf.materials;
  delete gltf.images;
  delete gltf.textures;
  delete gltf.samplers;
  const json=Buffer.from(JSON.stringify(gltf)),padded=(json.length+3)&~3;
  const glb=Buffer.alloc(28+padded+binary.length);
  glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(padded,12);glb.writeUInt32LE(0x4e4f534a,16);glb.fill(0x20,20,20+padded);json.copy(glb,20);
  glb.writeUInt32LE(binary.length,20+padded);glb.writeUInt32LE(0x004e4942,24+padded);binary.copy(glb,28+padded);
  return new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength), "");
}
test("Blender character includes a real skin and named idle and walk clips", () => {
  const gltf = readAsset();
  assert.ok(gltf.skins?.some((s) => s.joints.length >= 12));
  const clips = gltf.animations.map((a) => a.name);
  assert.ok(clips.includes("Idle"));
  assert.ok(clips.includes("Walk"));
  assert.ok(gltf.meshes.length > 5);
});
test("export is a bounded game asset with normals and valid animation references", () => {
  const gltf = readAsset();
  let count = 0;
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives) {
      assert.ok(p.attributes.NORMAL !== undefined);
      const a = gltf.accessors[p.attributes.POSITION];
      assert.ok(a.min.every(Number.isFinite));
      assert.ok(a.max.every(Number.isFinite));
      count += a.count;
    }
  assert.ok(count < 180000);
  for (const a of gltf.animations)
    for (const c of a.channels) {
      assert.ok(gltf.nodes[c.target.node]);
      assert.ok(a.samplers[c.sampler]);
    }
});

for (const assetPath of [path, lowPolyPath]) test(`${assetPath === path ? "Authored" : "Low-poly"} walk bends knees backward throughout the loop`, async () => {
  const { AnimationMixer, Vector3 } = await import("three");
  const gltf = await loadGeometryAsset(assetPath);
  const clip = gltf.animations.find((a) => a.name === "Walk");
  const mixer = new AnimationMixer(gltf.scene);
  mixer.clipAction(clip).play();
  for (let frame = 0; frame < 32; frame++) {
    mixer.setTime(frame / 30);
    gltf.scene.updateMatrixWorld(true);
    for (const side of ["L", "R"]) {
      const get = (name) => {
        let found;
        gltf.scene.traverse((n) => {
          if (
            n.isBone &&
            n.name.replace(/[^a-zA-Z0-9]/g, "") === `${name}${side}`
          )
            found = n;
        });
        assert.ok(found);
        return found.getWorldPosition(new Vector3());
      };
      const hip = get("Thigh"),
        knee = get("Shin"),
        ankle = get("Foot");
      const thigh = knee.clone().sub(hip),
        shin = ankle.clone().sub(knee);
      assert.ok(
        new Vector3().crossVectors(thigh, shin).x >= -0.00001,
        `Knee ${side} hyperextends at frame ${frame}`,
      );
    }
  }
});

test("runtime character has real low-poly facets and retains the authored rig and animations", async () => {
  const source = readAsset(), low = readAsset(lowPolyPath);
  assert.deepEqual(low.skins.map((s) => s.joints.length), source.skins.map((s) => s.joints.length));
  assert.deepEqual(low.animations.map((a) => [a.name, a.channels.length]), source.animations.map((a) => [a.name, a.channels.length]));
  assert.ok(!low.images?.length, "Solid colours must not retain fabric textures");
  const colour = (name) => low.materials.find((m) => m.name === name).pbrMetallicRoughness.baseColorFactor;
  assert.ok(colour("Warm cream cotton hoodie")[0] > 0.6);
  assert.ok(colour("Washed charcoal cargo cotton").slice(0, 3).every((v) => v < 0.1));
  assert.ok(colour("Black woven backpack").slice(0, 3).every((v) => v < 0.04));
  const gltf = await loadGeometryAsset(lowPolyPath);
  let triangles = 0;
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;
    assert.ok(obj.isSkinnedMesh, `${obj.name} lost its skin`);
    const { position, normal, skinIndex, skinWeight } = obj.geometry.attributes;
    const index = obj.geometry.index;
    const count = index?.count ?? position.count;
    triangles += count / 3;
    for (let i = 0; i < count; i += 3) {
      const a = index ? index.getX(i) : i;
      for (let corner = 1; corner < 3; corner++) {
        const b = index ? index.getX(i + corner) : i + corner;
        for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(normal.getComponent(a, axis) - normal.getComponent(b, axis)) < 1e-6);
      }
    }
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) {
        assert.ok(skinIndex.getComponent(i, j) < obj.skeleton.bones.length);
        weight += skinWeight.getComponent(i, j);
      }
      assert.ok(Math.abs(weight - 1) < 1e-4, `${obj.name}: invalid skin weights`);
    }
  });
  assert.ok(triangles > 1000 && triangles <= 12000, `${triangles} triangles exceeds the game budget`);
});

test("tailored mesh surfaces have outward-facing topology", async () => {
  const gltf = await loadGeometryAsset();
  let checked = 0;
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh || !/Hoodie_sleeve|Hoodie_body|Cargo_trousers/.test(obj.name))
      return;
    const g = obj.geometry,
      p = g.attributes.position,
      index = g.index;
    let volume = 0;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i),
        b = index.getX(i + 1),
        c = index.getX(i + 2);
      volume +=
        (p.getX(a) * (p.getY(b) * p.getZ(c) - p.getZ(b) * p.getY(c)) +
          p.getY(a) * (p.getZ(b) * p.getX(c) - p.getX(b) * p.getZ(c)) +
          p.getZ(a) * (p.getX(b) * p.getY(c) - p.getY(b) * p.getX(c))) /
        6;
    }
    assert.ok(volume > 0, `${obj.name} has inward-facing topology`);
    checked++;
  });
  assert.equal(checked, 5);
});

test("cotton and backpack textures are packed into the exported game asset", () => {
  const gltf = readAsset();
  assert.ok(gltf.images.length >= 6);
  for (const image of gltf.images) {
    assert.ok(gltf.bufferViews[image.bufferView].byteLength > 1000);
  }
  assert.ok(
    gltf.meshes.some((m) =>
      m.primitives.some((p) => p.attributes.COLOR_0 !== undefined),
    ),
  );
  assert.ok(
    gltf.materials.filter((m) => m.pbrMetallicRoughness?.baseColorTexture)
      .length >= 6,
  );
});

test('surface normal maps are independent from color textures',()=>{
 const gltf=readAsset();for(const m of gltf.materials){if(!m.normalTexture||!m.pbrMetallicRoughness?.baseColorTexture)continue;assert.notEqual(gltf.textures[m.normalTexture.index].source,gltf.textures[m.pbrMetallicRoughness.baseColorTexture.index].source,`${m.name} must use a real normal map`);assert.ok((m.normalTexture.scale??1)<=.4);}
});
