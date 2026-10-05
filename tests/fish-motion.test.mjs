import assert from "node:assert/strict";
import test from "node:test";
import { createFishMotion, advanceFish } from "../lib/fish-motion.ts";

test("fish move independently and remain inside the aquarium through turns and rests", () => {
  let first = createFishMotion("black", 0.1, 0.2);
  let second = createFishMotion("yellow", 0.1, 0.2);
  let moved = false,
    rested = false,
    turned = false;
  let previousDirection = first.facing;
  for (let frame = 0; frame < 18000; frame++) {
    first = advanceFish(first, 1 / 60, 320, 240);
    second = advanceFish(second, 1 / 60, 320, 240);
    assert.ok(first.x >= 0 && first.x <= 1);
    assert.ok(first.y >= 0 && first.y <= 1);
    moved ||= Math.abs(first.x - 0.1) > 0.05;
    rested ||= first.rest > 0;
    turned ||= first.facing !== previousDirection;
    previousDirection = first.facing;
  }
  assert.ok(moved, "fish must actually swim");
  assert.ok(rested, "fish occasionally rest");
  assert.ok(turned, "fish change direction");
  assert.notEqual(first.x, second.x, "fish do not move in lockstep");
});

test("paused fish hold position and long frame gaps cannot teleport fish", () => {
  const fish = createFishMotion("rabbit", 0.5, 0.5);
  assert.deepEqual(advanceFish(fish, 1, 400, 300, true), fish);
  const next = advanceFish(fish, 60, 400, 300);
  assert.ok(Math.abs(next.x - fish.x) < 0.02);
  assert.ok(Math.abs(next.y - fish.y) < 0.02);
});
