import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: "https://fish.test" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const moduleUrl = source => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const helperUrl = moduleUrl(transpile(await readFile(new URL("../lib/fish-log.ts", import.meta.url), "utf8")));
globalThis.homeFixture = { data: { species: [{ id: "fish", chineseName: "鱸魚", englishName: "Bass", pixelImage: "/fish.png" }], catches: [] }, loading: false };
const mocks = {
  "next/image": `import {createElement} from '${import.meta.resolve("react")}'; export default function Image({fill,unoptimized,preload,sizes,...p}){return createElement('img',p)}`,
  "next/link": `import {createElement} from '${import.meta.resolve("react")}'; export default function Link(p){return createElement('a',p,p.children)}`,
  "./provider": "export function useFishLog(){return globalThis.homeFixture}",
  "./aquarium": "export default function Aquarium(){return null}",
  "./pixel-fish": "export default function PixelFish(){return null}",
  "@gsap/react": "export function useGSAP(){}",
  "gsap": "export const gsap={registerPlugin(){}}",
  "gsap/ScrollTrigger": "export const ScrollTrigger={}",
};
function resolveImports(source) {
  for (const name of ["react", "react/jsx-runtime", "lucide-react"]) source = source.replaceAll(`from "${name}"`, `from "${import.meta.resolve(name)}"`);
  for (const [name, mock] of Object.entries(mocks)) source = source.replaceAll(`from "${name}"`, `from "${moduleUrl(mock)}"`);
  return source.replaceAll('from "@/lib/fish-log"', `from "${helperUrl}"`);
}
const logUrl = moduleUrl(resolveImports(transpile(await readFile(new URL("../components/fishlog/catch-log.tsx", import.meta.url), "utf8"))));
const source = resolveImports(transpile(await readFile(new URL("../components/fishlog/home.tsx", import.meta.url), "utf8"))).replaceAll('from "./catch-log"', `from "${logUrl}"`);
const { default: Home } = await import(moduleUrl(source));

function records() {
  return [
    { id: "older", speciesId: "fish", date: "2025-09-01", location: "西貢", note: "第一次試新釣組。" },
    { id: "latest", speciesId: "fish", date: "2026-10-01", location: "大埔", note: "日落前最後一投。" },
  ];
}

test("homepage ends at the catch list and leaves creation to the navigation", async () => {
  homeFixture.data.catches = records();
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    const home = document.querySelector('.fl-home');
    assert.equal(home.lastElementChild.className, 'fh-archive');
    assert.ok(home.lastElementChild.querySelector('#catch-log'));
    assert.equal(home.querySelector('button[aria-label="新增漁獲"]'), null);
    assert.equal(home.querySelector('footer'), null);
    assert.equal(home.querySelector('[aria-roledescription="carousel"]'), null);
    assert.equal(home.querySelector('#action-title'), null);
    assert.equal(home.querySelectorAll('.fl-catch-row').length, 2);
  } finally { await act(async () => root.unmount()); }
});

test("empty journal retains the archive link and honest empty state", async () => {
  homeFixture.data.catches = [];
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    assert.ok(document.querySelector('a[href="#catch-log"]'));
    assert.ok(document.querySelector('#catch-log .fl-empty'));
    assert.equal(document.querySelectorAll('.fl-catch-row').length, 0);
    assert.equal(document.querySelector('.fl-home').lastElementChild.className, 'fh-archive');
  } finally { await act(async () => root.unmount()); }
});

test("homepage search and combined year/location filters remain usable", async () => {
  homeFixture.data.catches = records();
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    const input = document.querySelector('input[type="search"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '大埔');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(document.querySelectorAll('.fl-catch-row').length, 1);
    assert.ok(document.querySelector('.fl-catch-row').getAttribute('href').endsWith('/latest'));
    const year = document.querySelector('select[aria-label="按年份篩選"]');
    await act(async () => { year.value = '2025'; year.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.equal(document.querySelectorAll('.fl-catch-row').length, 0);
    await act(async () => document.querySelector('.fl-clear-filter').click());
    assert.equal(document.querySelectorAll('.fl-catch-row').length, 2);
    assert.equal(input.value, '');
    assert.equal(year.value, '');
  } finally { await act(async () => root.unmount()); }
});

test("pending journal shows loading without an empty archive or zero statistics", async () => {
  homeFixture.loading = true;
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    assert.equal(document.querySelector('#catch-log .fl-empty'), null);
    assert.ok(document.querySelector('[aria-busy="true"]'));
    assert.ok(document.querySelector('[role="status"]').textContent.includes("讀取"));
    assert.equal(document.querySelector('.fh-summary strong').textContent, '—筆');
  } finally { await act(async () => root.unmount()); homeFixture.loading = false; }
});
