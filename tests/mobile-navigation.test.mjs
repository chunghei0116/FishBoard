import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts.transpileModule(
  await readFile(new URL("../lib/mobile-navigation.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { updateAddVisibility } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const visible = { lastY: 100, travel: 0, hidden: false };
test("small downward scrolls accumulate before hiding; upward scroll restores add", () => {
  let state = visible;
  for (const y of [103, 106, 109]) state = updateAddVisibility(state, y, 1000);
  assert.equal(state.hidden, false);
  state = updateAddVisibility(state, 112, 1000);
  assert.equal(state.hidden, true);
  state = updateAddVisibility(state, 109, 1000);
  assert.equal(state.hidden, true);
  state = updateAddVisibility(state, 103, 1000);
  assert.equal(state.hidden, false);
});
test("scroll jitter does not toggle add, and returning to top always restores it", () => {
  let state = visible;
  for (const y of [102, 100, 102, 100, 103, 101]) state = updateAddVisibility(state, y, 1000);
  assert.equal(state.hidden, false);
  state = updateAddVisibility({ lastY: 100, travel: 20, hidden: true }, -10, 1000);
  assert.equal(state.hidden, false);
  assert.equal(state.lastY, 0);
});
test("Safari bottom overscroll cannot cause a false upward reveal", () => {
  let state = { lastY: 980, travel: 20, hidden: true };
  state = updateAddVisibility(state, 1100, 1000);
  state = updateAddVisibility(state, 1040, 1000);
  assert.equal(state.hidden, true);
  assert.equal(state.lastY, 1000);
  state = updateAddVisibility(state, 990, 1000);
  assert.equal(state.hidden, false);
});
