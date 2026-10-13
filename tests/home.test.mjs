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
  "next/dynamic": `import {createElement} from '${import.meta.resolve("react")}'; export default function dynamic(){return function Add(p){return createElement('button',{'aria-label':'關閉新增',onClick:p.onClose},'新增視窗')}}`,
  "./provider": "export function useFishLog(){return globalThis.homeFixture}",
  "./aquarium": "export default function Aquarium(){return null}",
  "./pixel-fish": "export default function PixelFish(){return null}",
  "./catch-log": `import {createElement} from '${import.meta.resolve("react")}'; export default function Log(){return createElement('section',{id:'catch-log'},'漁獲紀錄')}`,
  "@gsap/react": "export function useGSAP(){}",
  "gsap": "export const gsap={registerPlugin(){}}",
  "gsap/ScrollTrigger": "export const ScrollTrigger={}",
};
let source = transpile(await readFile(new URL("../components/fishlog/home.tsx", import.meta.url), "utf8"));
for (const name of ["react", "react/jsx-runtime", "lucide-react"]) source = source.replaceAll(`from "${name}"`, `from "${import.meta.resolve(name)}"`);
for (const [name, mock] of Object.entries(mocks)) source = source.replaceAll(`from "${name}"`, `from "${moduleUrl(mock)}"`);
source = source.replaceAll('from "@/lib/fish-log"', `from "${helperUrl}"`);
const { default: Home } = await import(moduleUrl(source));
const click = async name => { const button = document.querySelector(`button[aria-label="${name}"]`); assert.ok(button, name); await act(async () => button.click()); };

test("empty journal keeps add and archive actions, without invented catches", async () => {
  homeFixture.data.catches = [];
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    assert.ok(document.querySelector('a[href="#catch-log"]'));
    assert.ok(document.querySelector('#catch-log'));
    assert.equal(document.querySelector('[aria-roledescription="carousel"]'), null);
    await click("新增漁獲");
    assert.ok(document.querySelector('button[aria-label="關閉新增"]'));
    await click("關閉新增");
    assert.equal(document.querySelector('button[aria-label="關閉新增"]'), null);
  } finally { await act(async () => root.unmount()); }
});

test("story carousel wraps, links to the displayed catch, and recovers after a deletion", async () => {
  homeFixture.data.catches = [
    { id: "older", speciesId: "fish", date: "2026-09-01", location: "西貢", note: "第一次試新釣組。" },
    { id: "latest", speciesId: "fish", date: "2026-10-01", location: "大埔", note: "日落前最後一投。" },
  ];
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    const story = () => document.querySelector('[aria-roledescription="carousel"]');
    assert.ok(story().textContent.includes("日落前最後一投。"));
    await click("下一筆故事");
    assert.ok(story().textContent.includes("第一次試新釣組。"));
    assert.ok(story().querySelector('a[href="/catches/older"]'));
    await click("下一筆故事");
    assert.ok(story().textContent.includes("日落前最後一投。"));
    await click("上一筆故事");
    homeFixture.data.catches = homeFixture.data.catches.filter(c => c.id !== "older");
    await act(async () => root.render(createElement(Home)));
    assert.ok(story().querySelector('a[href="/catches/latest"]'));
    assert.ok(story().querySelector('button[aria-label="下一筆故事"]').disabled);
    homeFixture.data.catches = [];
    await act(async () => root.render(createElement(Home)));
    assert.equal(story(), null);
  } finally { await act(async () => root.unmount()); }
});

test("pending journal does not show empty archive or fictitious zero statistics", async () => {
  homeFixture.loading = true;
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    assert.equal(document.querySelector('#catch-log .fl-empty'), null);
    assert.ok(document.querySelector('[aria-busy="true"]'));
    assert.ok(document.querySelector('[role="status"]').textContent.includes("讀取"));
  } finally { await act(async () => root.unmount()); homeFixture.loading = false; }
});

test("unavailable private story photo falls back to the fish artwork", async () => {
  homeFixture.data.catches = [{ id: "photo", speciesId: "fish", date: "2026-10-01", location: "大埔", photo: "/api/images/private-photo" }];
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(Home)));
    const photo = document.querySelector('.fh-story-art img');
    assert.equal(photo.getAttribute('src'), '/api/images/private-photo');
    await act(async () => photo.dispatchEvent(new dom.window.Event('error')));
    assert.ok(document.querySelector('.fh-fish-art').textContent.includes('相片暫時未能載入'));
    assert.ok(document.querySelector('.fh-story-art').getAttribute('href').includes('/catches/photo'));
  } finally { await act(async () => root.unmount()); }
});
