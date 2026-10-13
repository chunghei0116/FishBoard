"use client";
import { ThemeProvider, useTheme } from "next-themes";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
const WaterMotion = createContext<{ waterPaused: boolean; setWaterPaused: (paused: boolean) => void } | null>(null);
export function useWaterMotion() {
  const context = useContext(WaterMotion);
  if (!context) throw Error("Water preferences require JournalTheme");
  return context;
}
function subscribeWater(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function storedWaterPaused() {
  try { return localStorage.getItem("fishlog-water-paused") === "true"; } catch { return false; }
}
export function JournalTheme({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribeWater, storedWaterPaused, () => false);
  const [override, setPaused] = useState<boolean | null>(null);
  const waterPaused = override ?? stored;
  function setWaterPaused(paused: boolean) {
    setPaused(paused);
    try { localStorage.setItem("fishlog-water-paused", String(paused)); } catch { /* The preference still applies for this visit. */ }
  }
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey="fishlog-theme"
      disableTransitionOnChange
    >
      <WaterMotion.Provider value={{ waterPaused, setWaterPaused }}>{children}</WaterMotion.Provider>
    </ThemeProvider>
  );
}
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="fl-theme-toggle"
      role="switch"
      aria-checked={dark}
      aria-label="深色模式"
      title={dark ? "切換淺色模式" : "切換深色模式"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="fl-theme-light" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
