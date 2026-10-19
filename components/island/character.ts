import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { MotionState } from "@/lib/character-motion";
function release(root: T.Object3D) {
  const textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material]) {
        for (const value of Object.values(material)) {
          if (value instanceof T.Texture) textures.add(value);
        }
        material.dispose();
      }
      if (o instanceof T.SkinnedMesh) o.skeleton.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}
/** Load the authored Blender asset; Three.js only handles playback and world placement. */
export function createCharacter(
  scene: T.Scene,
  onError?: (error: unknown) => void,
) {
  const group = new T.Group();
  scene.add(group);
  let disposed = false,
    model: T.Group | null = null,
    mixer: T.AnimationMixer | null = null,
    idle: T.AnimationAction | null = null,
    walk: T.AnimationAction | null = null;
  new GLTFLoader().load(
    "/models/hoodie-character.glb",
    (gltf) => {
      if (disposed) {
        release(gltf.scene);
        return;
      }
      model = gltf.scene;
      const bounds = new T.Box3().setFromObject(model);
      model.position.y += 0.06 - bounds.min.y;
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = !o.name.includes("Subtle_cheek");
          o.receiveShadow = true;
          o.frustumCulled = false;
        }
      });
      group.add(model);
      mixer = new T.AnimationMixer(model);
      const idleClip = T.AnimationClip.findByName(gltf.animations, "Idle"),
        walkClip = T.AnimationClip.findByName(gltf.animations, "Walk");
      if (!idleClip || !walkClip) {
        onError?.(
          new Error("Blender character is missing Idle or Walk animation"),
        );
        return;
      }
      idle = mixer.clipAction(idleClip).play();
      walk = mixer.clipAction(walkClip).play();
      walk.setEffectiveWeight(0);
      mixer.update(0);
    },
    undefined,
    (error) => {
      if (!disposed) onError?.(error);
    },
  );
  function animate(state: MotionState, time: number, reduced: boolean) {
    group.rotation.y = state.yaw;
    if (!mixer || !idle || !walk) return;
    const blend = reduced ? 0 : T.MathUtils.clamp(state.blend, 0, 1);
    idle.setEffectiveWeight(1 - blend);
    walk.setEffectiveWeight(blend);
    idle.time = reduced ? 0 : time % idle.getClip().duration;
    walk.time = ((state.phase / (Math.PI * 2)) % 1) * walk.getClip().duration;
    mixer.update(0);
  }
  function dispose() {
    disposed = true;
    if (mixer && model) {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
    if (model) release(model);
    group.removeFromParent();
  }
  return { group, animate, dispose };
}
