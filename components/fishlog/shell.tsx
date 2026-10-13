"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Settings, House, BookOpen, MapPin, Plus, Fish, ArrowUpRight } from "lucide-react";
import { updateAddVisibility } from "@/lib/mobile-navigation";
import { useFishLog } from "./provider";
import { ThemeSwitch, useWaterMotion } from "./theme";
import Landing from "./landing";
const AddCatch = dynamic(() => import("./add-catch"), { ssr: false });
const WaterBackground = dynamic(() => import("@/app/water-background"), { ssr: false });
const items = [
  { href: "/", label: "總覽", Icon: House },
  { href: "/collection", label: "魚種圖鑑", Icon: BookOpen },
  { href: "/map", label: "釣獲地點", Icon: MapPin },
  { href: "/settings", label: "設定", Icon: Settings },
];
function Brand() {
  return <Link href="/" className="fl-brand" aria-label="Fishboard 釣魚日和首頁">
    <span className="fl-brand-mark"><Fish size={24} aria-hidden="true" /></span>
    <span><b>Fishboard</b><small>釣魚日和</small></span>
  </Link>;
}
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { error, user, data } = useFishLog();
  const { waterPaused } = useWaterMotion();
  const reduced = useReducedMotion();
  const [adding, setAdding] = useState(false);
  const [scrollVisibility, setScrollVisibility] = useState({ path, hidden: false });
  const addHidden = scrollVisibility.path === path && scrollVisibility.hidden;
  const activeHref = path.startsWith("/species") ? "/collection" : path.startsWith("/catches") ? "/" : path;
  const activeLabel = items.find(item => item.href === activeHref)?.label || "我的空間";
  useEffect(() => {
    let state = { lastY: window.scrollY, travel: 0, hidden: false };
    let frame = 0;
    function scroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        state = updateAddVisibility(state, window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
        setScrollVisibility(previous => previous.path === path && previous.hidden === state.hidden ? previous : { path, hidden: state.hidden });
      });
    }
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, [path]);
  const navLinks = (mobile: boolean) => items.map(({ href, label, Icon }) => {
    const active = activeHref === href;
    return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined}
      className={"fl-nav-link" + (active ? " is-active" : "")}>
      {mobile && active && <motion.span className="fl-nav-indicator" layoutId="mobile-nav-indicator"
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} />}
      <Icon size={20} aria-hidden="true" /><span>{label}</span>
      {!mobile && href === "/collection" && <small>{new Set(data.catches.map(c => c.speciesId)).size}</small>}
    </Link>;
  });
  if (!user) return <div className="fl-shell fl-shell-guest"><header className="fl-header"><Brand /><ThemeSwitch /></header><Landing /></div>;
  return <>
    <WaterBackground paused={waterPaused} />
    <div className="fl-shell fl-app-shell">
      <aside className="fl-sidebar">
        <Brand /><p className="fl-sidebar-label">我的釣魚日誌</p>
        <nav aria-label="桌面主要導覽">{navLinks(false)}</nav>
        <div className="fl-sidebar-note"><b>一尾一故事</b><p>慢慢記下每次與水邊相遇。</p></div>
      </aside>
      <div className="fl-workspace">
        <header className="fl-header fl-app-header">
          <div className="fl-mobile-brand"><Brand /></div>
          <p className="fl-breadcrumb">我的空間 <span>/</span> <b>{activeLabel}</b></p>
          <div className="fl-header-actions"><ThemeSwitch />
            <button className="fl-primary fl-desktop-add" onClick={() => setAdding(true)}><Plus size={18} />新增漁獲</button>
          </div>
        </header>
        <main className="fl-main-content">
          {error && <p className="fl-error" role="alert">{error} <Link href="/settings">登入設定 <ArrowUpRight size={14} /></Link></p>}
          {children}
        </main>
      </div>
    </div>
    <div className="fl-mobile-dock">
      <motion.button type="button" className="fl-mobile-add" aria-label="新增漁獲"
        aria-hidden={addHidden && !adding} tabIndex={addHidden && !adding ? -1 : 0}
        initial={false} animate={{ x: addHidden && !adding ? -90 : 0, opacity: addHidden && !adding ? 0 : 1, rotate: addHidden && !adding ? -25 : 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
        onFocus={() => setScrollVisibility({ path, hidden: false })} onClick={() => setAdding(true)}>
        <Plus size={25} strokeWidth={1.8} aria-hidden="true" />
      </motion.button>
      <nav className="fl-mobile-nav" aria-label="手機主要導覽">{navLinks(true)}</nav>
    </div>
    {adding && <AddCatch onClose={() => setAdding(false)} />}
  </>;
}
