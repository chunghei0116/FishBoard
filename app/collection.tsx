"use client";
import { FirebaseSession } from '@/components/firebase-session';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { firebaseAuth, firebaseRequest } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';

import Link from "next/link";
import { FishSwimmer } from "@/components/fish-swimmer";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Sparkles,
  LoaderCircle,
  Check,
  ImageIcon,
  Settings,
  ChevronDown,
  ArrowRight,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Catch = {
  id: string;
  name: string;
  date: string;
  x: number;
  y: number;
  image: string;
  source?: string;
  sample?: boolean;
  sprite?: string;
  english?: string;
  time?: string;
  location?: string;
  length?: number;
};
const examples: Catch[] = [
  {
    id: "demo-yellow",
    name: "黃腳鱲",
    english: "YELLOWFIN SEABREAM",
    date: "2026-10-04",
    time: "19:42",
    location: "Cheung Sha Wan",
    length: 21,
    x: 0.46,
    y: 0.44,
    sprite: "yellow",
    image: "",
    sample: true,
  },
  {
    id: "demo-black",
    name: "黑鯛",
    english: "BLACK SEABREAM",
    date: "2026-09-28",
    time: "16:20",
    location: "Victoria Harbour",
    length: 18,
    x: 0.12,
    y: 0.28,
    sprite: "black",
    image: "",
    sample: true,
  },
  {
    id: "demo-red",
    name: "石狗公",
    english: "RED SCORPIONFISH",
    date: "2026-09-21",
    time: "07:15",
    location: "Tung Lung Chau",
    length: 16,
    x: 0.74,
    y: 0.43,
    sprite: "red",
    image: "",
    sample: true,
  },
  {
    id: "demo-bass",
    name: "鱸魚",
    english: "JAPANESE SEABASS",
    date: "2026-09-14",
    time: "18:03",
    location: "Sai Kung",
    length: 42,
    x: 0.9,
    y: 0.65,
    sprite: "bass",
    image: "",
    sample: true,
  },
  {
    id: "demo-jack",
    name: "池魚",
    english: "JAPANESE JACK MACKEREL",
    date: "2026-09-03",
    time: "19:11",
    location: "Kwun Tong Typhoon Shelter",
    length: 15,
    x: 0.73,
    y: 0.9,
    sprite: "jack",
    image: "",
    sample: true,
  },
  {
    id: "demo-rabbit",
    name: "臭肚魚",
    english: "RABBITFISH",
    date: "2026-08-27",
    time: "12:36",
    location: "Sham Wan",
    length: 22,
    x: 0.48,
    y: 0.82,
    sprite: "rabbit",
    image: "",
    sample: true,
  },
];
function FishArt({ item }: { item: Catch }) {
  return item.sprite ? (
    <span
      role="img"
      aria-label={item.name}
      className={`fish-art sprite sprite-${item.sprite}`}
    />
  ) : (
    <AuthenticatedImage
      className="fish-art"
      src={item.image}
      alt={item.name}
      draggable={false}
    />
  );
}
async function request(url: string, options?: RequestInit) {
  const r = await firebaseRequest(url, options);
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("收藏室暫時連線唔到，請重新整理再試。");
  const data = (await r.json()) as {
    error?: string;
    items: Catch[];
    item: Catch;
    generationReady: boolean;
  };
  if (!r.ok) throw Error(data.error || "暫時未能儲存，請再試一次。");
  return data;
}
export default function Collection(){return <FirebaseSession><Home/></FirebaseSession>}
function Home() {
  const [items, setItems] = useState<Catch[]>([]),
    [open, setOpen] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [photo, setPhoto] = useState(""),
    [name, setName] = useState(""),
    [date, setDate] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState<boolean | null>(null),
    [reveal, setReveal] = useState<Catch | null>(null),
    [detail, setDetail] = useState<Catch | null>(null),
    [saving, setSaving] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [sample, setSample] = useState<Catch | null>(null);
  const [tab, setTab] = useState("home"),
    [settings, setSettings] = useState(false),
    [species, setSpecies] = useState(""),
    [location, setLocation] = useState(""),
    [year, setYear] = useState("");
  const showingExamples = loaded && items.length === 0;
  const displayItems = showingExamples ? examples : items;
  const logItems = [...displayItems]
    .filter(
      (i) =>
        (!species || i.name === species) &&
        (!location || i.location === location) &&
        (!year || i.date.startsWith(year)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const board = useRef<HTMLDivElement>(null),
    drag = useRef<{
      item: Catch;
      startX: number;
      startY: number;
      moved: boolean;
    } | null>(null),
    submitting = useRef(false);
  useEffect(() => {
    request("/api/catches")
      .then((d) => {
        setDate(
          new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Hong_Kong",
          }),
        );
        setItems(d.items);
        setReady(d.generationReady);
        setLoaded(true);
      })
      .catch((e) => {
        setDate(
          new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Hong_Kong",
          }),
        );
        setNotice(e.message);
        setLoaded(true);
      });
  }, []);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "start_catch_upload",
          description:
            "Open the fish photo upload form; does not upload or generate a badge.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw Error("Expected an empty object");
            setOpen(true);
            return { status: "upload_form_open" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  function choose(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("請選擇 JPG、PNG 或 WebP 圖片。");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("圖片太大，請選擇 10 MB 以下嘅相片。");
      return;
    }
    setFile(f);
    setPhoto(URL.createObjectURL(f));
    setError("");
  }
  async function generate() {
    if (!file || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("name", name.trim() || "我的漁獲");
      body.append("date", date);
      const d = await request("/api/catches", { method: "POST", body });
      setItems((i) => [...i, d.item]);
      setSpecies("");
      setLocation("");
      setYear("");
      setTab("home");
      setOpen(false);
      setReveal(d.item);
      setFile(null);
      setPhoto("");
      setName("");
      setSample(null);
      setNotice("新襟章已儲存，拖到魚缸入面吧！");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  async function place(item: Catch, x: number, y: number) {
    const next = {
      ...item,
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    setReveal(null);
    if (item.sample) {
      setSample(next);
      setNotice("呢枚係示範襟章，唔會計入你嘅收藏。");
      return;
    }
    setItems((all) => all.map((i) => (i.id === item.id ? next : i)));
    setSaving(item.id);
    try {
      await request("/api/catches/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: next.x, y: next.y }),
      });
      setNotice("位置已儲存。");
    } catch (e) {
      setItems((all) => all.map((i) => (i.id === item.id ? item : i)));
      setNotice((e as Error).message);
    } finally {
      setSaving(null);
    }
  }
  function position(e: React.PointerEvent) {
    const b = board.current!.getBoundingClientRect();
    const w = window.innerWidth < 700 ? 92 : 150;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left - w / 2) / (b.width - w))),
      y: Math.max(0, Math.min(1, (e.clientY - b.top - 50) / (b.height - 100))),
    };
  }
  function start(e: React.PointerEvent<HTMLButtonElement>, item: Catch) {
    if (saving || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { item, startX: e.clientX, startY: e.clientY, moved: false };
  }
  function moving(e: React.PointerEvent) {
    if (!drag.current) return;
    if (
      Math.hypot(
        e.clientX - drag.current.startX,
        e.clientY - drag.current.startY,
      ) < 5 &&
      !drag.current.moved
    )
      return;
    drag.current.moved = true;
    if (reveal) {
      (e.currentTarget as HTMLElement).style.transform =
        `translate(${e.clientX - drag.current.startX}px,${e.clientY - drag.current.startY}px)`;
      return;
    }
    const p = position(e),
      item = { ...drag.current.item, ...p };
    if (item.sample) setSample(item);
    else setItems((all) => all.map((i) => (i.id === item.id ? item : i)));
  }
  function end(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    (e.currentTarget as HTMLElement).style.transform = "";
    if (d.moved) {
      const b = board.current!.getBoundingClientRect();
      if (
        e.clientX < b.left ||
        e.clientX > b.right ||
        e.clientY < b.top ||
        e.clientY > b.bottom
      ) {
        if (!reveal) {
          if (d.item.sample) setSample(d.item);
          else
            setItems((all) =>
              all.map((i) => (i.id === d.item.id ? d.item : i)),
            );
        }
        return;
      }
      const p = position(e);
      void place(d.item, p.x, p.y);
    } else if (!reveal) setDetail(d.item);
  }
  function badge(item: Catch, isReveal = false) {
    const fish = (
      <button
        aria-label={`${item.name}，拖放移動或按方向鍵調整位置`}
        className={"catch " + (isReveal ? "reveal-catch" : "")}
        onPointerDown={(e) => start(e, item)}
        onPointerMove={moving}
        onPointerUp={end}
        onPointerCancel={() => {
          drag.current = null;
          if (item.sample) setSample(item);
          else setItems((all) => all.map((i) => (i.id === item.id ? item : i)));
        }}
        onKeyDown={(e) => {
          const dirs: Record<string, number[]> = {
            ArrowLeft: [-0.03, 0],
            ArrowRight: [0.03, 0],
            ArrowUp: [0, -0.03],
            ArrowDown: [0, 0.03],
          };
          if (dirs[e.key]) {
            e.preventDefault();
            if (!saving)
              void place(
                item,
                item.x + dirs[e.key][0],
                item.y + dirs[e.key][1],
              );
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isReveal) void place(item, 0.5, 0.45);
            else setDetail(item);
          }
        }}
      >
        <FishArt item={item} />
      </button>
    );
    return isReveal ? (
      fish
    ) : (
      <FishSwimmer
        id={item.id}
        x={item.x}
        y={item.y}
        facesRight={item.sprite === "black" || item.sprite === "jack"}
      >
        {fish}
      </FishSwimmer>
    );
  }
  return (
    <main className="club">
      <header className="masthead">
        <Link href="/" className="brand">
          <svg
            className="brandmark"
            viewBox="0 0 48 52"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 46V37L10 28L17 19L29 7L36 6L39 10V29L37 31V40L41 44L38 47L34 44V40M8 39L12 31L17 26"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="miter"
            />
          </svg>
          <span>
            FISH LOG <i />
            <small>MY WATERS, MY CATCHES.</small>
          </span>
        </Link>
        <nav aria-label="主要導覽">
          {["home", "collection", "map"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
          <button
            className="settings-button"
            aria-label="設定"
            onClick={() => setSettings(true)}
          >
            <Settings size={21} />
          </button>
        </nav>
      </header>
      {tab === "home" && (
        <>
          <section className="aquarium" aria-label="我的魚缸" ref={board}>
            <div className="tank-count">
              {String(items.length).padStart(2, "0")} CAUGHT{" "}
              <span>/ {new Set(items.map((i) => i.name)).size} SPECIES</span>
              {showingExamples && <small>DEMO AQUARIUM</small>}
            </div>
            <div className="sun" />
            <div className="water-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="coral" />
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="bubble"
                style={{
                  left: `${8 + ((i * 23) % 89)}%`,
                  top: `${24 + ((i * 17) % 54)}%`,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}
            {displayItems
              .filter((i) => i.id !== reveal?.id && i.id !== sample?.id)
              .map((i) => (
                <div key={i.id}>{badge(i)}</div>
              ))}
            {sample && reveal?.id !== sample.id && badge(sample)}
            <span className="tank-motto">
              DIFFERENT WATERS
              <br />
              SAME OBSESSION.
            </span>
            {!loaded && <span className="tank-loading">讀取收藏中…</span>}
          </section>
          <a className="scroll-prompt" href="#catch-log">
            <ChevronDown size={23} />
            <span>SCROLL FOR CATCH LOG</span>
          </a>
        </>
      )}
      {tab === "map" ? (
        <section className="map-empty">
          <MapPin size={30} />
          <h1>YOUR FISHING WATERS</h1>
          <p>現有漁獲未有儲存地點，暫時未能標示在地圖上。</p>
          <button className="text-button" onClick={() => setTab("home")}>
            返回我的魚缸 <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        <section id="catch-log" className="catch-log">
          <div className="log-heading">
            <h1>{tab === "collection" ? "COLLECTION" : "CATCH LOG"}</h1>
            <div className="filters">
              <button
                className={!species && !location && !year ? "active" : ""}
                onClick={() => {
                  setSpecies("");
                  setLocation("");
                  setYear("");
                }}
              >
                ALL
              </button>
              <label>
                <span className="sr-only">魚種</span>
                <select
                  aria-label="魚種"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                >
                  <option value="">SPECIES</option>
                  {[...new Set(displayItems.map((i) => i.name))].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">地點</span>
                <select
                  aria-label="地點"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">LOCATION</option>
                  {[
                    ...new Set(
                      displayItems
                        .map((i) => i.location)
                        .filter((v): v is string => !!v),
                    ),
                  ].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">年份</span>
                <select
                  aria-label="年份"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="">YEAR</option>
                  {[
                    ...new Set(
                      displayItems
                        .map((i) => i.date.slice(0, 4))
                        .filter(Boolean),
                    ),
                  ]
                    .sort()
                    .reverse()
                    .map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                </select>
              </label>
            </div>
          </div>
          {showingExamples && (
            <div className="demo-note">
              示範漁獲 · 上載第一尾魚，開始你自己的紀錄。
              <button onClick={() => setOpen(true)}>
                <Plus size={14} /> 新增漁獲
              </button>
            </div>
          )}
          <div
            className={tab === "collection" ? "collection-grid" : "timeline"}
          >
            {logItems.map((item) => {
              const parsed = item.date
                ? new Date(item.date + "T12:00:00")
                : null;
              return (
                <article className="log-entry" key={item.id}>
                  <time dateTime={item.date || undefined}>
                    <b>
                      {parsed ? String(parsed.getDate()).padStart(2, "0") : "—"}
                    </b>
                    <span>
                      {parsed
                        ? parsed
                            .toLocaleDateString("en", { month: "short" })
                            .toUpperCase()
                        : "UNDATED"}
                    </span>
                    <span>{parsed ? parsed.getFullYear() : ""}</span>
                  </time>
                  <span className="timeline-dot" />
                  <button className="log-card" onClick={() => setDetail(item)}>
                    <span className="log-fish">
                      <FishArt item={item} />
                    </span>
                    <span className="fish-name">
                      <b>{item.name}</b>
                      <small>
                        {item.english ||
                          (item.sample ? "DEMO CATCH" : "PERSONAL CATCH")}
                      </small>
                    </span>
                    <span className="log-time">
                      <Clock size={16} />
                      {item.time || "未記錄"}
                    </span>
                    <span className="log-location">
                      <MapPin size={16} />
                      {item.location || "未記錄地點"}
                    </span>
                    <span className="log-length">
                      {item.length ? `${item.length} cm` : "— cm"}
                    </span>
                    <ArrowRight className="row-arrow" size={19} />
                  </button>
                </article>
              );
            })}
          </div>
          {!logItems.length && (
            <p className="empty-log">
              {loaded ? "沒有符合篩選條件的漁獲。" : "讀取漁獲中…"}
            </p>
          )}
          {!showingExamples && (
            <button className="add-catch" onClick={() => setOpen(true)}>
              <Plus size={17} /> 新增漁獲
            </button>
          )}
        </section>
      )}
      <div className="notice" role="status">
        {notice}
      </div>
      <footer>
        MY WATERS, MY CATCHES. <span>FISH LOG · EST. 2026</span>
      </footer>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="upload-dialog">
          <DialogTitle>FISH LOG · 設定</DialogTitle>
          <DialogDescription>你的個人漁獲收藏室</DialogDescription>
          <p className="settings-copy">
            上載魚相生成像素魚；拖放魚仔或使用方向鍵調整魚缸位置。按魚仔或漁獲紀錄可查看原相。
          </p>
          <button
            className="primary"
            onClick={() => {
              setSettings(false);
              setOpen(true);
            }}
          >
            <Plus size={16} /> 新增漁獲
          </button>
          <button className="signout" onClick={() => signOut(firebaseAuth())}>
            登出收藏室
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent
          className="upload-dialog"
          showCloseButton={!busy}
          onInteractOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <span className="eyebrow">A NEW CATCH / 新しい出会い</span>
          <DialogTitle className="dialog-heading">
            將今日嘅漁獲，變成收藏。
          </DialogTitle>
          <DialogDescription>
            上載一張清楚嘅魚相，AI 會保留外形同花紋，重畫成日系像素魚仔。
          </DialogDescription>
          <label
            className={"upload-zone " + (photo ? "has-photo" : "")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            {photo ? (
              <img src={photo} alt="待生成嘅魚相" />
            ) : (
              <>
                <Upload size={28} />
                <b>揀一張魚相，或者拖入嚟</b>
                <small>JPG、PNG、WebP · 上限 10 MB</small>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => choose(e.target.files?.[0])}
            />
            {photo && <span className="change-photo">更換相片</span>}
          </label>
          <div className="form-row">
            <label>
              魚名／暱稱
              <input
                value={name}
                maxLength={50}
                placeholder="例如：第一尾黑鯛"
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              釣獲日期
              <input
                type="date"
                value={date}
                required
                disabled={busy}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {ready === false && (
            <p className="setup-note">
              AI 生圖連線尚未設定。你可以先揀相，或者試玩示範襟章。
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={!file || !date || busy || ready === false}
            onClick={generate}
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}{" "}
            {busy ? "魚仔變身中…" : "生成我的像素襟章"}
          </button>
          {busy && (
            <p className="waiting">好作品需要少少耐性，請保持視窗開啟。</p>
          )}
        </DialogContent>
      </Dialog>
      {reveal && (
        <div className="reveal-stage">
          <div className="reveal-copy">
            <span className="eyebrow">
              {reveal.sample ? "TRY A LITTLE MAGIC" : "NEW CATCH UNLOCKED!"}
            </span>
            <h2>{reveal.sample ? "試吓將佢放入魚缸。" : "新夥伴，入手！"}</h2>
            <p>拖住魚仔，放到魚缸入面。</p>
          </div>
          {badge(reveal, true)}
          <button
            className="place-button"
            onClick={() => void place(reveal, 0.5, 0.45)}
          >
            <Check size={16} /> 放入魚缸
          </button>
        </div>
      )}
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="upload-dialog">
          <DialogTitle>{detail?.name}</DialogTitle>
          <DialogDescription>
            {detail?.sample
              ? "示範襟章，未計入收藏。"
              : `釣獲日期：${detail?.date}`}
          </DialogDescription>
          {detail && (
            <div className="detail-images">
              <FishArt item={detail} />
              {detail.source && <AuthenticatedImage src={detail.source} alt="原始漁獲照片" />}
            </div>
          )}
          <p className="waiting">
            <ImageIcon size={16} /> 一張相片，留低一個釣魚故事。
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
