import test from "node:test";
import assert from "node:assert/strict";
import { isMobileIslandViewport, mobileIslandZoom } from "../lib/island-camera.ts";

test("phone portrait and touch landscape use the closer camera while desktop stays unchanged", () => {
  assert.equal(isMobileIslandViewport(390, 844, true), true);
  assert.equal(isMobileIslandViewport(844, 390, true), true);
  assert.equal(isMobileIslandViewport(1280, 800, false), false);
  assert.equal(isMobileIslandViewport(1280, 800, true), false);
  assert.equal(isMobileIslandViewport(844, 390, false), false);
});
test("mobile launch establishes the island then eases monotonically into a bounded close-up", () => {
  assert.equal(mobileIslandZoom(0, false), 1);
  assert.equal(mobileIslandZoom(0.35, false), 1);
  let previous = 1;
  for (let time = 0; time <= 5; time += 0.02) {
    const zoom = mobileIslandZoom(time, false);
    assert.ok(zoom >= previous && zoom <= 2.2);
    previous = zoom;
  }
  assert.equal(mobileIslandZoom(3, false), 2.2);
  assert.ok(Math.abs(mobileIslandZoom(0.351, false) - 1) < 0.00001);
  assert.ok(Math.abs(mobileIslandZoom(1.999, false) - 2.2) < 0.00001);
});
test("reduced motion starts directly at the closer view", () => {
  assert.equal(mobileIslandZoom(0, true), 2.2);
  assert.equal(mobileIslandZoom(10, true), 2.2);
});
