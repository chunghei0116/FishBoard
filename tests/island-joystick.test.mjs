import test from "node:test";
import assert from "node:assert/strict";
import { joystickPosition } from "../lib/island-joystick.ts";
import { movePlayer } from "../lib/island-world.ts";

test("joystick rests without drift and rejects invalid geometry", () => {
  for (const args of [[0, 0, 32], [1, 1, 32], [NaN, 1, 32], [1, 1, 0]]) {
    const value = joystickPosition(...args);
    assert.equal(Math.hypot(value.x, value.z), 0);
  }
});
test("joystick supports every direction and clamps thumb travel and diagonal speed", () => {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    const x = Math.cos(angle), z = Math.sin(angle);
    const value = joystickPosition(x * 200, z * 200, 32);
    assert.ok(Math.abs(Math.hypot(value.thumbX, value.thumbY) - 32) < 1e-8);
    assert.ok(Math.abs(value.x - x) < 1e-8);
    assert.ok(Math.abs(value.z - z) < 1e-8);
  }
});
test("partial stick travel produces slower movement without changing full speed", () => {
  const start = { x: 0, z: 1 };
  const distances = [0, 0.4, 0.7, 1, 2].map((travel) => {
    const value = joystickPosition(travel * 32, 0, 32);
    const speed = Math.min(1, Math.hypot(value.x, value.z));
    const next = movePlayer(start, value, 0.04 * speed);
    return Math.hypot(next.x - start.x, next.z - start.z);
  });
  assert.equal(distances[0], 0);
  assert.ok(distances[1] < distances[2] && distances[2] < distances[3]);
  assert.equal(distances[3], distances[4]);
  assert.ok(Math.abs(distances[3] - 3.1 * 0.04) < 1e-8);
});
