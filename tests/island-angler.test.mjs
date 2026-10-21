import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

async function loadAngler() {
  const data = await readFile(new URL("../public/models/island-angler.glb", import.meta.url));
  return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "");
}

test("original angler is a compact faceted asset with recognisable fishing equipment", async () => {
  const { scene, animations } = await loadAngler();
  assert.deepEqual(animations.map((clip) => clip.name), ["Idle", "Walk"]);
  for (const name of ["BucketHatBrim", "BucketHatCrown", "UtilityPocket-1", "CanvasPack", "PackClasp", "DeckBoot0"]) {
    // GLTFLoader sanitizes punctuation in exported names.
    assert.ok(scene.getObjectByName(T.PropertyBinding.sanitizeNodeName(name)), name);
  }
  let triangles = 0;
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const { position, normal } = obj.geometry.attributes;
    const index = obj.geometry.index;
    const count = index?.count ?? position.count;
    triangles += count / 3;
    assert.equal(obj.material.map, null);
    assert.equal(obj.material.normalMap, null);
    for (let i = 0; i < count; i += 3) {
      const a = index ? index.getX(i) : i;
      for (let corner = 1; corner < 3; corner++) {
        const b = index ? index.getX(i + corner) : i + corner;
        for (let axis = 0; axis < 3; axis++) {
          assert.ok(Math.abs(normal.getComponent(a, axis) - normal.getComponent(b, axis)) < 1e-6, `${obj.name}: smooth normal`);
        }
      }
    }
  });
  assert.ok(triangles > 500 && triangles < 4000);
  const size = new T.Box3().setFromObject(scene).getSize(new T.Vector3());
  assert.ok(size.y > 2.2 && size.y < 2.6, `Island scale: ${size.y}`);
});

test("exported idle and walk blend cleanly, loop, and keep feet above the ground", async () => {
  for (const blend of [0, 0.5, 1]) {
    const { scene, animations } = await loadAngler();
    const mixer = new T.AnimationMixer(scene);
    const idle = mixer.clipAction(animations[0]).play().setEffectiveWeight(1 - blend);
    const walk = mixer.clipAction(animations[1]).play().setEffectiveWeight(blend);
    const snapshot = () => {
      scene.updateMatrixWorld(true);
      return [0, 1].flatMap((i) => scene.getObjectByName(`Foot${i}`).getWorldPosition(new T.Vector3()).toArray());
    };
    let start;
    for (let frame = 0; frame <= 32; frame++) {
      idle.time = walk.time = frame / 32;
      mixer.update(0);
      const pose = snapshot();
      if (!frame) start = pose;
      assert.ok(pose.every(Number.isFinite));
      if (frame === 32) pose.forEach((value, i) => assert.ok(Math.abs(value - start[i]) < 1e-5, "Visible loop seam"));
      for (let i = 0; i < 2; i++) {
        const sole = scene.getObjectByName(`BootSole${i}`);
        assert.ok(new T.Box3().setFromObject(sole).min.y >= -0.035, `Foot ${i} clips ground at ${frame}, blend ${blend}`);
        const thigh = scene.getObjectByName(`Thigh${i}`).getWorldPosition(new T.Vector3());
        const knee = scene.getObjectByName(`Knee${i}`).getWorldPosition(new T.Vector3());
        const foot = scene.getObjectByName(`Foot${i}`).getWorldPosition(new T.Vector3());
        const bend = knee.clone().sub(thigh).cross(foot.clone().sub(knee));
        assert.ok(bend.x >= -1e-6, `Knee ${i} hyperextends`);
      }
    }
  }
});
