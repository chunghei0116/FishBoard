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
  "./content-navigation": "export function useContentPath(){return undefined}",
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
  "./island-popup": `import {createElement as h} from '${import.meta.resolve("react")}';export function IslandPopup(p){globalThis.popupProps=p;return h('div',{role:'dialog'},h('button',{onClick:p.onClose},'關閉 popup'))}`,
  "./island-scene": `import {useEffect} from '${import.meta.resolve("react")}';export default function Scene(props){globalThis.islandSceneProps=props;useEffect(props.onReady,[props.onReady]);return null}`,
});
const { default: Shell } = await compile("../components/fishlog/shell.tsx", { "@/lib/mobile-navigation": await raw("../lib/mobile-navigation.ts") });
const { CatchDetail, Collection, SpeciesDetail } = await compile("../components/fishlog/pages.tsx", { "@/lib/fish-log": await raw("../lib/fish-log.ts") });
async function mount(Component, props = {}) {
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(Component, props)));
  return () => act(async () => root.unmount());
}

test("each island station opens each original feature in a popup while keeping the scene mounted", async () => {
  navigation.length = 0;
  const unmount = await mount(Island);
  try {
    const expected = ["/journal#collection-title", "/journal#catch-log", "/add", "/map", "/settings"];
    for (let i = 0; i < expected.length; i++) {
      await act(async () => document.querySelector('.island-menu-button').click());
      const buttons = document.querySelectorAll('nav[aria-label="Island features"] button');
      await act(async () => buttons[i].click());
      assert.equal(popupProps.initialHref, expected[i]);
      assert.equal(islandSceneProps.paused, true);
      const input = islandSceneProps.input;
      await act(async () => popupProps.onClose());
      assert.equal(islandSceneProps.paused, false);
      assert.equal(islandSceneProps.input, input);
    }
    islandSceneProps.input.current = { x: 1, z: 1 };
    await act(async () => islandSceneProps.onNear("toolbox"));
    await act(async () => document.querySelector('.island-interaction button').click());
    assert.equal(popupProps.initialHref, "/add");
    assert.deepEqual(navigation, []);
    assert.deepEqual(islandSceneProps.input.current, { x: 0, z: 0 });
  } finally { await unmount(); }
});
test("legacy catch-list bookmarks still open the full original journal", async () => {
  window.history.replaceState({}, "", "/#catch-log");
  navigation.length = 0;
  const unmount = await mount(Island);
  try { assert.deepEqual(navigation, []); assert.equal(popupProps.initialHref, "/journal#catch-log"); }
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


// Exercise the real popup and navigation context, with the expensive scene/form work stubbed.
globalThis.popupModalOrder = [];
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; popupModalOrder.push(this.className); };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.CSS = { escape: (value) => value };
const contentNav = await compile("../components/fishlog/content-navigation.tsx");
globalThis.popupNavigation = contentNav;
const navModule = "export const ContentNavigationProvider=globalThis.popupNavigation.ContentNavigationProvider; export const useContentPath=globalThis.popupNavigation.useContentPath;export const useContentNavigation=globalThis.popupNavigation.useContentNavigation";
const { default: PopupShell } = await compile("../components/fishlog/shell.tsx", { "@/lib/mobile-navigation": await raw("../lib/mobile-navigation.ts"), "./content-navigation": navModule });
globalThis.popupShell = PopupShell;
globalThis.popupPages = { CatchDetail, Collection, SpeciesDetail };
globalThis.popupBusy = false;
const { IslandPopup } = await compile("../components/island/island-popup.tsx", {
  "@/components/fishlog/content-navigation": navModule,
  "@/components/fishlog/loading-dialog": "export function useLoadingBusy(){return globalThis.popupBusy}",
  "@/components/fishlog/shell": "export default globalThis.popupShell",
  "@/components/fishlog/home": `import {createElement as h} from '${import.meta.resolve("react")}';export default function Home(){return h('a',{href:'/catches/record'},'開啟測試紀錄')}`,
  "@/components/fishlog/pages": "export const CatchDetail=globalThis.popupPages.CatchDetail;export const Collection=globalThis.popupPages.Collection;export const SpeciesDetail=globalThis.popupPages.SpeciesDetail",
  "@/components/fishlog/map": "export default function Map(){return null}",
  "@/components/fishlog/settings": "export default function Settings(){return null}",
  "@/components/fishlog/gear": "export default function Gear(){return null}",
  "@/components/fishlog/add-catch": `import {createElement as h,useRef,useEffect} from '${import.meta.resolve("react")}';export default function Add(){const nav=globalThis.popupNavigation.useContentNavigation();const ref=useRef(null);useEffect(()=>{const dialog=ref.current;dialog.showModal();return ()=>dialog.close()},[]);return h('dialog',{ref,className:'test-form'},h('button',{onClick:()=>nav.push('/catches/record')},'完成新增'))}`,
});
test("full-page popup keeps catch detail, photos and back navigation inside the same page", async () => {
  navigation.length = 0;
  const unmount = await mount(IslandPopup, { initialHref: "/journal", onClose() {} });
  try {
    assert.ok(document.querySelector('.island-popup').open);
    await act(async () => document.querySelector('a[href="/catches/record"]').click());
    assert.equal(document.querySelector('.island-popup-header h2').textContent, '漁獲詳情');
    assert.equal(document.querySelector('.fl-original img').getAttribute('src'), '/api/media/photo-fixture');
    assert.deepEqual(navigation, []);
    assert.equal(window.location.pathname, '/');
    await act(async () => document.querySelector('[aria-label="返回上一個收藏畫面"]').click());
    assert.equal(document.querySelector('.island-popup-header h2').textContent, '漁獲日誌');
    assert.ok(document.querySelector('a[href="/catches/record"]'));
    assert.equal(document.body.style.overflow, '');
  } finally { await unmount(); }
});
test("save completion can open details while the busy overlay still guards closing", async () => {
  popupBusy = true;
  popupModalOrder.length = 0;
  navigation.length = 0;
  let closed = 0;
  const unmount = await mount(IslandPopup, { initialHref: "/add", onClose() { closed++; } });
  try {
    assert.deepEqual(popupModalOrder, ['island-popup', 'test-form']);
    const close = document.querySelector('[aria-label="關閉收藏，返回小島"]');
    assert.ok(close.disabled);
    await act(async () => close.click());
    const cancel = new dom.window.Event('cancel', { bubbles: false, cancelable: true });
    await act(async () => document.querySelector('.island-popup').dispatchEvent(cancel));
    assert.ok(cancel.defaultPrevented);
    assert.equal(closed, 0);
    await act(async () => [...document.querySelectorAll('button')].find((b) => b.textContent === '完成新增').click());
    assert.equal(document.querySelector('.island-popup-header h2').textContent, '漁獲詳情');
    assert.equal(document.querySelector('.test-form'), null);
    assert.deepEqual(navigation, []);
  } finally { await unmount(); popupBusy = false; }
});
test("standalone forms keep normal Next navigation outside a popup", async () => {
  function Probe() { globalThis.outsideNavigation=contentNav.useContentNavigation();return null; }
  const unmount = await mount(Probe);
  try { assert.equal(outsideNavigation, router); }
  finally { await unmount(); }
});

test("popup waits for authenticated data before mounting the existing add form", async () => {
  islandTest.loading = true;
  const root = createRoot(document.getElementById("root"));
  const props = { initialHref: "/add", onClose() {} };
  try {
    await act(async () => root.render(h(IslandPopup, props)));
    assert.equal(document.querySelector('.test-form'), null);
    assert.ok(document.querySelector('.island-popup [role="status"]'));
    islandTest.loading = false;
    await act(async () => root.render(h(IslandPopup, props)));
    assert.ok(document.querySelector('.test-form').open);
  } finally { await act(async () => root.unmount()); islandTest.loading = false; }
});
