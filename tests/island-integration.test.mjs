import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<body><div id="root"></div></body>', { url: "https://fish.test" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout,
});
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const urls = new Map();
const url = (source) => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const transpile = (source) => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const router = { push: (href) => navigation.push(["push", href]), replace: (href) => navigation.push(["replace", href]) };
const navigation = [];
globalThis.islandTest = { router, path: "/", loading: false, error: "", user: { uid: "test-owner" }, data: {
  species: [{ id: "bass", chineseName: "鱸魚", pixelImage: "/api/media/pixel-fixture" }],
  catches: [{ id: "record", speciesId: "bass", date: "2026-10-21", location: "測試地點", photo: "/api/media/photo-fixture", created: "2026-10-21T00:00:00Z" }],
} };
const mocks = {
  "next/link": `import {createElement as h} from '${import.meta.resolve("react")}'; export default function Link(p){return h('a',p,p.children)}`,
  "next/navigation": "export function useRouter(){return globalThis.islandTest.router} export function usePathname(){return globalThis.islandTest.path}",
  "next/dynamic": "export default function dynamic(){return ()=>null}",
  "./provider": "export function useFishLog(){return globalThis.islandTest}",
  "@/components/fishlog/provider": "export function useFishLog(){return globalThis.islandTest}",
  "./theme": "export function ThemeSwitch(){return null}",
  "./landing": `import {createElement as h} from '${import.meta.resolve("react")}'; export default function Landing(){return h('p',{},'原有登入頁')}`,
  "framer-motion": `import {createElement as h} from '${import.meta.resolve("react")}'; export const useReducedMotion=()=>false;export const motion=new Proxy({},{get:(_,tag)=>({children,initial,animate,transition,layoutId,...props})=>h(tag,props,children)});`,
  "./pixel-fish": `import {createElement as h} from '${import.meta.resolve("react")}';export default function PixelFish({species}){return h('img',{src:species.pixelImage,alt:species.chineseName})}`,
  "./delete-catch": `import {createElement as h} from '${import.meta.resolve("react")}';export default function DeleteCatch(){return h('button',{},'刪除漁獲')}`,
  "./catch-log": "export function CatchRows(){return null}",
};
async function compile(path, extra = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [name, value] of Object.entries({ ...mocks, ...extra })) {
    const mockUrl = urls.get(value) || url(value);
    urls.set(value, mockUrl);
    source = source.replaceAll(`from "${name}"`, `from "${mockUrl}"`).replaceAll(`import("${name}")`, `import("${mockUrl}")`);
  }
  for (const name of ["react", "react/jsx-runtime", "lucide-react"]) source = source.replaceAll(`from "${name}"`, `from "${import.meta.resolve(name)}"`);
  let output = transpile(source).replaceAll('from "react/jsx-runtime"', `from "${import.meta.resolve("react/jsx-runtime")}"`);
  return import(url(output));
}
const raw = async (p) => transpile(await readFile(new URL(p, import.meta.url), "utf8"));
const world = await raw("../lib/island-world.ts");
const helper = await raw("../lib/island-joystick.ts");
const { IslandJoystick } = await compile("../components/island/island-joystick.tsx", { "@/lib/island-joystick": helper });
globalThis.islandTest.Joystick = IslandJoystick;
const { default: Island } = await compile("../components/island/island-experience.tsx", {
  "@/lib/island-world": world,
  "./island-joystick": "export const IslandJoystick=globalThis.islandTest.Joystick",
  "./island-scene": `import {useEffect} from '${import.meta.resolve("react")}';export default function Scene(props){globalThis.islandSceneProps=props;useEffect(props.onReady,[props.onReady]);return null}`,
});
const { default: Shell } = await compile("../components/fishlog/shell.tsx", { "@/lib/mobile-navigation": await raw("../lib/mobile-navigation.ts") });
const { CatchDetail } = await compile("../components/fishlog/pages.tsx", { "@/lib/fish-log": await raw("../lib/fish-log.ts") });
async function mount(Component, props = {}) {
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(Component, props)));
  return () => act(async () => root.unmount());
}

test("each island station opens its existing journal feature instead of a separate collection app", async () => {
  navigation.length = 0;
  const unmount = await mount(Island);
  try {
    const expected = ["/journal#collection-title", "/journal#catch-log", "/add", "/map", "/settings"];
    for (let i = 0; i < expected.length; i++) {
      await act(async () => document.querySelector('.island-menu-button').click());
      const buttons = document.querySelectorAll('nav[aria-label="Island features"] button');
      await act(async () => buttons[i].click());
      assert.deepEqual(navigation.at(-1), ["push", expected[i]]);
    }
    islandSceneProps.input.current = { x: 1, z: 1 };
    await act(async () => islandSceneProps.onNear("toolbox"));
    await act(async () => document.querySelector('.island-interaction button').click());
    assert.deepEqual(navigation.at(-1), ["push", "/add"]);
    assert.deepEqual(islandSceneProps.input.current, { x: 0, z: 0 });
  } finally { await unmount(); }
});
test("legacy catch-list bookmarks still open the full original journal", async () => {
  window.history.replaceState({}, "", "/#catch-log");
  navigation.length = 0;
  const unmount = await mount(Island);
  try { assert.deepEqual(navigation, [["replace", "/journal#catch-log"]]); }
  finally { await unmount(); window.history.replaceState({}, "", "/"); }
});
test("island remains public while original journal authentication and navigation are retained", async () => {
  islandTest.path = "/"; islandTest.user = null;
  let unmount = await mount(Shell, { children: h("p", {}, "小島內容") });
  assert.ok(document.body.textContent.includes("小島內容"));
  assert.equal(document.querySelector('.fl-sidebar'), null);
  await unmount();
  islandTest.path = "/journal";
  unmount = await mount(Shell, { children: h("p", {}, "私人日誌內容") });
  assert.ok(document.body.textContent.includes("原有登入頁"));
  assert.ok(!document.body.textContent.includes("私人日誌內容"));
  await unmount();
  islandTest.user = { uid: "test-owner" };
  unmount = await mount(Shell, { children: h("p", {}, "私人日誌內容") });
  try {
    assert.ok(document.body.textContent.includes("私人日誌內容"));
    for (const href of ["/", "/journal", "/collection", "/map", "/settings"])
      assert.ok(document.querySelector(`.fl-sidebar nav a[href="${href}"]`));
    assert.equal(document.querySelectorAll('.fl-mobile-nav a').length, 5);
  } finally { await unmount(); islandTest.path = "/"; }
});
test("catch detail keeps the original photo, species image and editing controls with a journal return", async () => {
  const unmount = await mount(CatchDetail, { id: "record" });
  try {
    assert.equal(document.querySelector('.fl-original img').getAttribute('src'), '/api/media/photo-fixture');
    assert.equal(document.querySelector('.fl-detail-pixel img').getAttribute('src'), '/api/media/pixel-fixture');
    assert.equal(document.querySelector('.fl-back').getAttribute('href'), '/journal#catch-log');
    assert.ok(document.querySelector('.fl-edit-catch'));
    assert.ok(document.querySelector('a[href="/species/bass"]'));
  } finally { await unmount(); }
});
