import test from "node:test";
import assert from "node:assert/strict";
import {
  smoothAngle,
  updateMotion,
  sampleGait,
} from "../lib/character-motion.ts";
test("turns ease across the angle seam by the shortest route", () => {
  const yaw = smoothAngle(Math.PI - 0.05, -Math.PI + 0.05, 1 / 60);
  assert.ok(Math.abs(yaw - (Math.PI - 0.05)) < 0.05);
  assert.ok(yaw > Math.PI - 0.05);
});
test("walk blend eases in and settles instead of snapping", () => {
  const idle = { blend: 0, phase: 0, yaw: 0 };
  const start = updateMotion(idle, true, 0.04, 1, 1 / 60);
  assert.ok(start.blend > 0 && start.blend < 0.3);
  const stop = updateMotion({ ...start, blend: 1 }, false, 0, 1, 1 / 60);
  assert.ok(stop.blend > 0.7 && stop.blend < 1);
  let settled = stop;
  for (let i = 0; i < 120; i++)
    settled = updateMotion(settled, false, 0, 1, 1 / 60);
  assert.ok(settled.blend < 0.0001);
});
test("stride follows distance and damping is frame-rate independent", () => {
  let a = { blend: 0, phase: 0, yaw: 0 },
    b = { ...a };
  for (let i = 0; i < 60; i++) a = updateMotion(a, true, 3 / 60, 1, 1 / 60);
  for (let i = 0; i < 120; i++) b = updateMotion(b, true, 3 / 120, 1, 1 / 120);
  assert.ok(Math.abs(a.phase - b.phase) < 1e-10);
  assert.ok(Math.abs(a.blend - b.blend) < 1e-10);
  assert.ok(Math.abs(a.yaw - b.yaw) < 1e-10);
});
test("knees bend only forward and reduced motion removes decorative motion", () => {
  for (let phase = 0; phase < Math.PI * 2; phase += 0.1) {
    const gait = sampleGait({ blend: 1, phase, yaw: 0 }, 5, false);
    assert.ok(gait.knees.every((x) => x >= 0));
  }
  const gait = sampleGait({ blend: 1, phase: 1, yaw: 0 }, 5, true);
  assert.equal(gait.bob, 0);
  assert.ok(gait.legs.every(value=>value===0));
  assert.equal(gait.breath, 0);
});
