import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts.transpileModule(
  await readFile(new URL("../lib/fish-log.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { catchMarkerKey } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
test("selecting a marker includes only catches at its exact named coordinate", () => {
  const records = [
    { id: "a", location: "西貢", latitude: 22.3, longitude: 114.2 },
    { id: "b", location: "西貢", latitude: 22.3, longitude: 114.2 },
    { id: "c", location: "西貢", latitude: 22.4, longitude: 114.2 },
    { id: "d", location: "西貢" },
  ];
  const selected = catchMarkerKey(records[0]);
  assert.ok(selected);
  assert.deepEqual(records.filter(c => catchMarkerKey(c) === selected).map(c => c.id), ["a", "b"]);
  assert.notEqual(catchMarkerKey(records[2]), selected);
});
test("unmapped or invalid coordinates cannot create a selectable marker", () => {
  for (const point of [{}, { latitude: 22 }, { latitude: NaN, longitude: 114 }, { latitude: 91, longitude: 114 }])
    assert.equal(catchMarkerKey({ location: "海邊", ...point }), null);
  assert.ok(catchMarkerKey({ location: "赤道", latitude: 0, longitude: 0 }));
});
