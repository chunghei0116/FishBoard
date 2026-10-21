"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useTransition,
  useRef,
  useState,
} from "react";
import {
  Anchor,
  ArrowUpRight,
  BookOpen,
  Fish,
  Map,
  Package,
  House,
  X,
  Compass,
  ChevronDown,
  Keyboard,
  Sun,
} from "lucide-react";
import { stations, type StationId, type Point } from "@/lib/island-world";
import { IslandJoystick } from "./island-joystick";
import { useFishLog } from "@/components/fishlog/provider";
const Scene = lazy(() => import("./island-scene"));
const icons = {
  aquarium: Fish,
  journal: BookOpen,
  toolbox: Package,
  map: Map,
  cabin: House,
};
export default function IslandExperience() {
  const router = useRouter();
  const { loading, error } = useFishLog();
  const [navigating, startTransition] = useTransition();
  const [near, setNear] = useState<StationId | null>(null),
    [ready, setReady] = useState(false),
    [guide, setGuide] = useState(true),
    [menu, setMenu] = useState(false);
  const input = useRef<Point>({ x: 0, z: 0 });
  const move = useCallback((point: Point) => { input.current = point; }, []);
  const open = useCallback((id: StationId) => {
    const station = stations.find((station) => station.id === id);
    if (!station) return;
    startTransition(() => router.push(station.href));
    setMenu(false);
    input.current = { x: 0, z: 0 };
  }, [router]);
  useEffect(() => {
    if (window.location.hash === "#catch-log") router.replace("/journal#catch-log");
  }, [router]);
  const sceneReady = useCallback(() => setReady(true), []);
  const onNear = useCallback((id: StationId | null) => setNear(id), []);
  const nearby = stations.find((s) => s.id === near);
  return (
    <main className="island-app">
      <Suspense fallback={null}>
        <Scene
          paused={navigating || loading}
          onInteract={open}
          onNear={onNear}
          input={input}
          onReady={sceneReady}
        />
      </Suspense>
      {!ready && (
        <div className="island-loading">
          <Anchor size={30} />
          <p>Finding your little island…</p>
        </div>
      )}
      {error && <p className="island-service-notice" role="alert">{error} <Link href="/journal">開啟漁獲日誌</Link></p>}
      <header className="island-header">
        <Link href="/" className="island-brand">
          <span className="island-brand-icon">
            <Fish size={25} />
          </span>
          <span>
            FISH LOG<small>A LITTLE CLOSER TO THE WATER</small>
          </span>
        </Link>
        <div className="island-header-right">
          <span className="island-weather">
            <Sun size={17} /> A good day to take it slow
          </span>
          <button
            className="island-menu-button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
          >
            Your island <ChevronDown size={15} />
          </button>
        </div>
      </header>
      <section className="island-intro">
        <span className="island-eyebrow">WELCOME TO YOUR OWN LITTLE WORLD</span>
        <h1>
          Less hurry.
          <br />
          More fishing.
        </h1>
        <p>
          A place for your catches.
          <br />
          And a little room to wander.
        </p>
        <span className="island-location">
          <span /> Fisherman’s Island
        </span>
      </section>
      {menu && (
        <nav className="island-menu" aria-label="Island features">
          {stations.map((s) => {
            const Icon = icons[s.id];
            return (
              <button key={s.id} onClick={() => open(s.id)}>
                <Icon size={17} />
                {s.name}
                <ArrowUpRight size={14} />
              </button>
            );
          })}
        </nav>
      )}
      <aside className="island-compass" aria-label="Island orientation">
        <span>N</span>
        <Compass size={37} strokeWidth={1} />
        <small>MAKE YOURSELF AT HOME</small>
      </aside>
      {guide && (
        <aside className="island-guide">
          <button
            className="guide-close"
            onClick={() => setGuide(false)}
            aria-label="Dismiss welcome tip"
          >
            <X size={14} />
          </button>
          <span className="guide-icon">
            <Package size={22} />
          </span>
          <div>
            <small>YOUR FIRST STOP</small>
            <h2>Every catch has a story.</h2>
            <p>Find the red toolbox to add yours.</p>
            <button
              onClick={() =>
                document
                  .querySelector(".island-scene")
                  ?.dispatchEvent(
                    new CustomEvent("island-walk", { detail: "toolbox" }),
                  )
              }
            >
              Let’s wander over <ArrowUpRight size={14} />
            </button>
          </div>
        </aside>
      )}
      <div className="island-interaction" aria-live="polite">
        {nearby ? (
          <button onClick={() => open(nearby.id)}>
            <kbd>E</kbd>
            <span>
              <small>{nearby.name}</small>
              {nearby.action}
            </span>
            <ArrowUpRight size={20} />
          </button>
        ) : (
          <span className="island-wander">
            <span /> Click the ground to wander
          </span>
        )}
      </div>
      <footer className="island-bottom">
        <div className="island-controls">
          <Keyboard size={17} />
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> to walk
          </span>
          <i />
          <span>
            <kbd>E</kbd> to interact
          </span>
        </div>
        <div className="island-bottom-note">YOUR WATERS. YOUR STORIES.</div>
        <button
          className="island-guide-toggle"
          onClick={() => setGuide(!guide)}
          aria-expanded={guide}
        >
          A little guidance <span>?</span>
        </button>
      </footer>
      <IslandJoystick onMove={move} disabled={navigating || loading || !ready} />
    </main>
  );
}
