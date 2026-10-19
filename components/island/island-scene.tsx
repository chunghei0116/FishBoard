"use client";
import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { createScenery } from "./scenery";
import { createCharacter } from "./character";
import { updateMotion, type MotionState } from "@/lib/character-motion";
import {
  movePlayer,
  findPath,
  nearestStation,
  stations,
  isWalkable,
  type StationId,
  type Point,
} from "@/lib/island-world";
type Props = {
  paused: boolean;
  onInteract: (id: StationId) => void;
  onNear: (id: StationId | null) => void;
  input: React.RefObject<Point>;
  onReady: () => void;
};
export default function IslandScene({
  paused,
  onInteract,
  onNear,
  input,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    labels = useRef<(HTMLButtonElement | null)[]>([]);
  const current = useRef({ paused, onInteract, onNear, onReady });
  useEffect(() => {
    current.current = { paused, onInteract, onNear, onReady };
  }, [paused, onInteract, onNear, onReady]);
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => {
        setFailure(true);
        current.current.onReady();
      });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.setClearColor(0xa9d6c9);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute(
      "aria-label",
      "Playable fishing island. Use WASD or arrow keys to walk, E to interact.",
    );
    renderer.domElement.tabIndex = 0;
    el.insertBefore(renderer.domElement, el.firstChild);
    const scene = new T.Scene();
    scene.fog = new T.Fog(0xa9d6c9, 48, 100);
    const camera = new T.OrthographicCamera(-16, 16, 12, -12, 0.1, 120);
    camera.position.set(14, 24, 28);
    camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xfff9e5, 0x72967a, 2.6));
    const sun = new T.DirectionalLight(0xffe4b2, 3.2);
    sun.position.set(-10, 22, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -18,
      right: 18,
      top: 18,
      bottom: -18,
      near: 1,
      far: 60,
    });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 4;
    scene.add(sun);
    const sea = new T.Mesh(
      new T.PlaneGeometry(300, 300),
      new T.MeshStandardMaterial({ color: 0x91cbbf, roughness: 0.8 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.16;
    sea.receiveShadow = true;
    scene.add(sea);
    const art = createScenery(scene),
      character = createCharacter(scene);
    let position: Point = { x: 0.6, z: 2.4 };
    character.group.position.set(position.x, 0.7, position.z);
    const halo = new T.Mesh(
      new T.RingGeometry(0.42, 0.51, 32),
      new T.MeshBasicMaterial({
        color: 0xfff2ca,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.85;
    scene.add(halo);
    const marker = new T.Mesh(
      new T.RingGeometry(0.15, 0.21, 24),
      new T.MeshBasicMaterial({ color: 0xfffaf0, side: T.DoubleSide }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.85;
    marker.visible = false;
    scene.add(marker);
    const keys = new Set<string>();
    let route: Point[] = [];
    let target: Point | null = null,
      near: StationId | null = null,
      previous = 0,
      animationTime = 0;
    let motion: MotionState = { blend: 0, phase: 0, yaw: 0 };
    let targetYaw = 0;
    const ground = new T.Plane(new T.Vector3(0, 1, 0), -0.72),
      ray = new T.Raycaster(),
      hit = new T.Vector3();
    const keydown = (e: KeyboardEvent) => {
      if (current.current.paused || e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
          "e",
        ].includes(e.key.toLowerCase()) ||
        e.key.startsWith("Arrow")
      )
        e.preventDefault();
      keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" && !e.repeat && near)
        current.current.onInteract(near);
    };
    const keyup = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const blur = () => {
      keys.clear();
      target = null;
      route = [];
      input.current = { x: 0, z: 0 };
    };
    const click = (e: PointerEvent) => {
      if (current.current.paused || e.button !== 0) return;
      const r = el.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      if (
        ray.ray.intersectPlane(ground, hit) &&
        isWalkable({ x: hit.x, z: hit.z })
      ) {
        route = findPath(position, { x: hit.x, z: hit.z });
        target = route.shift() ?? null;
        marker.position.set(hit.x, 0.85, hit.z);
        marker.visible = true;
        renderer.domElement.focus({ preventScroll: true });
      }
    };
    const walk = (event: Event) => {
      if (current.current.paused) return;
      const id = (event as CustomEvent<StationId>).detail;
      const s = stations.find((s) => s.id === id);
      if (!s) return;
      const offsets: Record<StationId, Point> = {
        aquarium: { x: 0, z: 1.8 },
        cabin: { x: 0, z: 1.1 },
        journal: { x: 0, z: 1.3 },
        map: { x: 0, z: 1.4 },
        toolbox: { x: 0, z: 1.3 },
      };
      route = findPath(position, {
        x: s.x + offsets[id].x,
        z: s.z + offsets[id].z,
      });
      target = route.shift() ?? null;
      if (!target) return;
      marker.position.set(target.x, 0.85, target.z);
      marker.visible = true;
    };
    el.addEventListener("island-walk", walk);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    renderer.domElement.addEventListener("pointerdown", click);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      const aspect = w / h;
      const halfWidth = aspect < 0.8 ? 12.4 : aspect < 1.2 ? 13.8 : 16;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfWidth / aspect;
      camera.bottom = -halfWidth / aspect;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const projected = new T.Vector3();
    let frame = 0;
    renderer.setAnimationLoop((ms: number) => {
      if (document.hidden) {
        previous = ms;
        return;
      }
      const dt = previous ? Math.min((ms - previous) / 1000, 0.05) : 0;
      previous = ms;
      const time = ms / 1000;
      let moving = false;
      if (!current.current.paused) {
        const sx =
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
          input.current.x;
        const sy =
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
          (keys.has("w") || keys.has("arrowup") ? 1 : 0) +
          input.current.z;
        let direction = {
          x: sx * 0.894 + sy * 0.447,
          z: -sx * 0.447 + sy * 0.894,
        };
        if (sx || sy) {
          target = null;
          route = [];
          marker.visible = false;
        } else if (target) {
          direction = { x: target.x - position.x, z: target.z - position.z };
          while (target && Math.hypot(direction.x, direction.z) < 0.13) {
            target = route.shift() ?? null;
            marker.visible = !!target;
            direction = target
              ? { x: target.x - position.x, z: target.z - position.z }
              : { x: 0, z: 0 };
          }
        }
        const next = movePlayer(position, direction, dt);
        moving = Math.hypot(next.x - position.x, next.z - position.z) > 0.0001;
        if (moving) {
          targetYaw = Math.atan2(direction.x, direction.z);
        } else if (target && Math.hypot(direction.x, direction.z) > 0.2) {
          target = null;
          route = [];
          marker.visible = false;
        }
        const distance = Math.hypot(next.x - position.x, next.z - position.z);
        motion = updateMotion(motion, moving, distance, targetYaw, dt);
        position = next;
        const follow = 1 - Math.exp(-22 * dt);
        character.group.position.x +=
          (position.x - character.group.position.x) * follow;
        character.group.position.z +=
          (position.z - character.group.position.z) * follow;
        animationTime += dt;
        character.animate(motion, animationTime, reduced);
        const station = nearestStation(position);
        if (station?.id !== near) {
          near = station?.id ?? null;
          current.current.onNear(near);
        }
      } else {
        keys.clear();
        target = null;
        marker.visible = false;
      }
      halo.position.x = position.x;
      halo.position.z = position.z;
      if (!reduced) {
        art.fishes.forEach((fish, i) => {
          fish.position.x = -4.7 + Math.sin(time * 0.45 + i * 1.4) * 0.95;
          fish.position.y = 1.85 + Math.sin(time + i) * 0.18;
          fish.rotation.y = Math.cos(time * 0.45 + i * 1.4) > 0 ? 0 : Math.PI;
        });
        art.boat.position.y = Math.sin(time * 1.2) * 0.045;
        art.boat.rotation.z = Math.sin(time) * 0.025;
        art.glints.forEach((g, i) => {
          g.scale.x = 0.7 + Math.sin(time * 0.8 + i) * 0.3;
        });
        art.gulls.forEach((g, i) => {
          const a = time * 0.07 + i * 2.1;
          g.position.set(Math.cos(a) * 12, 6 + i * 0.8, Math.sin(a) * 9);
          g.rotation.y = -a;
        });
      }
      stations.forEach((s, i) => {
        projected
          .set(
            s.x,
            s.id === "cabin"
              ? 3.6
              : s.id === "map"
                ? 3.2
                : s.id === "aquarium"
                  ? 2.8
                  : 2,
            s.z,
          )
          .project(camera);
        const label = labels.current[i];
        if (label) {
          label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
          label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
          label.dataset.near = String(near === s.id);
        }
      });
      renderer.render(scene, camera);
      if (frame++ === 1) current.current.onReady();
    });
    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      el.removeEventListener("island-walk", walk);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      renderer.domElement.removeEventListener("pointerdown", click);
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [input]);
  return (
    <div className="island-scene" ref={host}>
      {failure ? (
        <div className="island-render-error">
          <h2>Your island needs WebGL</h2>
          <p>
            Try a browser with hardware acceleration enabled. Your collection is
            still available from the menu.
          </p>
        </div>
      ) : (
        stations.map((s, i) => (
          <button
            key={s.id}
            ref={(node) => {
              labels.current[i] = node;
            }}
            className="world-label"
            aria-label={`Walk to ${s.name}`}
            onClick={() => {
              const station = nearestStation({ x: s.x, z: s.z });
              if (station && labels.current[i]?.dataset.near === "true")
                current.current.onInteract(s.id);
              else {
                rendererWalk(s.id);
              }
            }}
          >
            <span>{s.number}</span>
            <b className="world-label-full">{s.name}</b>
            <b className="world-label-short">
              {
                {
                  aquarium: "Aquarium",
                  journal: "Journal",
                  toolbox: "Toolbox",
                  map: "Map",
                  cabin: "Cabin",
                }[s.id]
              }
            </b>
          </button>
        ))
      )}
    </div>
  );
  // Labels dispatch a destination to the canvas, allowing the scene to resolve movement.
  function rendererWalk(id: StationId) {
    host.current?.dispatchEvent(new CustomEvent("island-walk", { detail: id }));
  }
}
