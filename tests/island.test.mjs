import test from "node:test";
import assert from "node:assert/strict";
import {
  movePlayer,
  nearestStation,
  stations,
  isWalkable,
} from "../lib/island-world.ts";
test("movement stays on land even after a delayed frame", () => {
  const p = movePlayer({ x: 0, z: 6 }, { x: 0, z: 1 }, 10);
  assert.ok(p.z < 6.6);
  assert.ok(isWalkable(p));
});
test("diagonal walking has the same speed as straight walking", () => {
  const a = movePlayer({ x: 0, z: 1 }, { x: 1, z: 0 }, 0.1);
  const b = movePlayer({ x: 0, z: 1 }, { x: 1, z: 1 }, 0.1);
  assert.ok(
    Math.abs(Math.hypot(a.x, a.z - 1) - Math.hypot(b.x, b.z - 1)) < 0.001,
  );
});
test("cabin walls stop the player", () => {
  let p = { x: -5, z: 0 };
  for (let i = 0; i < 60; i++) p = movePlayer(p, { x: 0, z: -1 }, 0.05);
  assert.ok(p.z > -1.8);
});
test("stations are usable nearby but not across the island", () => {
  assert.equal(nearestStation({ x: 5, z: 2.8 })?.id, "toolbox");
  assert.equal(nearestStation({ x: 0, z: 6 }), null);
  assert.equal(new Set(stations.map((s) => s.id)).size, 5);
});

test("click-to-walk finds a route around the aquarium to the cabin", async () => {
  const { findPath } = await import("../lib/island-world.ts");
  const start = { x: -4.7, z: 4.2 },
    goal = { x: -5, z: -0.9 };
  const path = findPath(start, goal);
  assert.ok(path.length > 2);
  assert.ok(path.every(isWalkable));
  let p = start;
  for (let i = 0; i < 2000 && path.length; i++) {
    const next = path[0];
    if (Math.hypot(next.x - p.x, next.z - p.z) < 0.14) path.shift();
    else p = movePlayer(p, { x: next.x - p.x, z: next.z - p.z }, 0.05);
  }
  assert.ok(Math.hypot(p.x - goal.x, p.z - goal.z) < 0.3);
});
test("water destinations do not produce a walking route", async () => {
  const { findPath } = await import("../lib/island-world.ts");
  assert.deepEqual(findPath({ x: 0, z: 0 }, { x: 20, z: 20 }), []);
});
