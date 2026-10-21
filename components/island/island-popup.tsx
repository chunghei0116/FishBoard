"use client";
import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, X } from "lucide-react";
import { ContentNavigationProvider } from "@/components/fishlog/content-navigation";
import { useLoadingBusy } from "@/components/fishlog/loading-dialog";
import Shell from "@/components/fishlog/shell";
import { useFishLog } from "@/components/fishlog/provider";
const Home = lazy(() => import("@/components/fishlog/home"));
const AddCatch = lazy(() => import("@/components/fishlog/add-catch"));
const Map = lazy(() => import("@/components/fishlog/map"));
const Settings = lazy(() => import("@/components/fishlog/settings"));
const Gear = lazy(() => import("@/components/fishlog/gear"));
const Collection = lazy(() => import("@/components/fishlog/pages").then((m) => ({ default: m.Collection })));
const CatchDetail = lazy(() => import("@/components/fishlog/pages").then((m) => ({ default: m.CatchDetail })));
const SpeciesDetail = lazy(() => import("@/components/fishlog/pages").then((m) => ({ default: m.SpeciesDetail })));

const titles: Record<string, string> = { "/journal": "漁獲日誌", "/collection": "魚種圖鑑", "/map": "釣獲地點", "/settings": "設定", "/gear": "釣組配置", "/add": "新增漁獲", "/login": "登入" };

export function IslandPopup({ initialHref, onClose }: { initialHref: string; onClose: () => void }) {
  const [history, setHistory] = useState([initialHref]);
  const href = history[history.length - 1];
  const path = href.split("#")[0];
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const busy = useLoadingBusy();
  const { loading } = useFishLog();
  const navigate = useCallback((next: string, replace = false) => {
    if (next === "/") { onClose(); return; }
    setHistory((previous) => replace ? [...previous.slice(0, -1), next] : previous[previous.length - 1] === next ? previous : [...previous, next]);
  }, [onClose]);
  // Open the parent before existing forms open their own native modal dialogs.
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); };
  }, []);
  useLayoutEffect(() => { body.current?.scrollTo?.(0, 0); }, [href]);
  function intercept(event: MouseEvent<HTMLDialogElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.getAttribute("href")!, window.location.origin + href);
    if (url.origin !== window.location.origin || !/^\/(?:journal|collection|map|settings|gear|add|login|catches\/[\w-]+|species\/[\w-]+)?$/.test(url.pathname)) return;
    event.preventDefault();
    if (!busy) navigate(url.pathname + url.hash);
  }
  function scrollToSection(node: HTMLDivElement | null) {
    const hash = href.split("#")[1];
    if (!node || !hash) return;
    requestAnimationFrame(() => node.querySelector(`#${CSS.escape(hash)}`)?.scrollIntoView({ block: "start" }));
  }
  const title = path.startsWith("/catches/") ? "漁獲詳情" : path.startsWith("/species/") ? "魚種詳情" : (titles[path] ?? "我的收藏");
  return (
    <dialog ref={dialog} className="island-popup" aria-label={title} onClickCapture={intercept}
      onCancel={(event) => { if (event.target !== event.currentTarget) return; event.preventDefault(); if (!busy) onClose(); }}>
      <header className="island-popup-header">
        <button type="button" disabled={busy || history.length < 2} aria-label="返回上一個收藏畫面" onClick={() => setHistory((previous) => previous.slice(0, -1))}><ArrowLeft size={18} /></button>
        <h2>{title}</h2>
        <button type="button" disabled={busy} aria-label="關閉收藏，返回小島" onClick={onClose}><X size={21} /></button>
      </header>
      <div ref={body} className="island-popup-body">
        <ContentNavigationProvider value={{ path, push: (next) => navigate(next), replace: (next) => navigate(next, true) }}>
          <Shell key={path}>
            <Suspense fallback={<p className="fl-empty" role="status">開啟收藏中…</p>}>
              {loading ? <p className="fl-empty" role="status">讀取收藏中…</p> : <div key={href} ref={scrollToSection}>
                {path === "/journal" && <Home />}
                {path === "/collection" && <Collection />}
                {path === "/map" && <Map />}
                {path === "/settings" && <Settings />}
                {path === "/gear" && <Gear />}
                {path === "/add" && <><Home /><AddCatch onClose={onClose} /></>}
                {path.startsWith("/catches/") && <CatchDetail id={path.slice(9)} />}
                {path.startsWith("/species/") && <SpeciesDetail id={path.slice(9)} />}
              </div>}
            </Suspense>
          </Shell>
        </ContentNavigationProvider>
      </div>
    </dialog>
  );
}
