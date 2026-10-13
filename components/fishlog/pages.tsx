"use client";
import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, Pencil, Fish, BookOpen, Ruler } from "lucide-react";
import { useFishLog } from "./provider";
import {
  summarizeSpecies,
  sortCatches,
  speciesName,
  catchTimeLabel,
} from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
import Aquarium from "./aquarium";
import DeleteCatch from "./delete-catch";
import CatchLog, { CatchRows } from "./catch-log";
const CatchEditor = dynamic(() => import("./add-catch"), { ssr: false });
export function Home() {
  const { data, loading } = useFishLog();
  const species = summarizeSpecies(data.species, data.catches);
  const latest = sortCatches(data.catches)[0];
  const latestFish = data.species.find(s => s.id === latest?.speciesId);
  const lengths = data.catches.flatMap(c => c.length ? [c.length] : []);
  return (
    <>
      <div className="fl-page-intro"><p className="fl-eyebrow">MY FISHING JOURNAL</p>
        <h1>每次出釣，都值得記住。</h1><p>整理你的漁獲、魚種與水邊足跡。</p>
      </div>
      <section className="fl-overview-stats" aria-label="漁獲統計" aria-busy={loading}>
        {[
          { label: "漁獲紀錄", value: data.catches.length, unit: "筆漁獲", Icon: Fish },
          { label: "已收藏魚種", value: species.length, unit: "種魚類", Icon: BookOpen },
          { label: "最長紀錄", value: lengths.length ? Math.max(...lengths) : "—", unit: "厘米", Icon: Ruler },
        ].map(({ label, value, unit, Icon }) => <div key={label} className="fl-overview-stat">
          <div><span>{label}</span><strong>{loading ? "—" : value}<small>{unit}</small></strong></div>
          <Icon size={20} aria-hidden="true" />
        </div>)}
      </section>
      <div className="fl-overview-grid">
        <section className="fl-overview-tank">
          <header className="fl-panel-heading"><div><h2>我的像素水族箱</h2><p>一個魚種，只會入住一位小住客。</p></div>
            <Link href="/collection">查看圖鑑 <ArrowUpRight size={15} /></Link>
          </header>
          <Aquarium species={species} total={data.catches.length} />
        </section>
        <section className="fl-latest-catch">
          <h2>最近一筆漁獲</h2><p>剛剛記下的水邊時光</p>
          {latest && latestFish && !loading ? <>
            <div className="fl-latest-fish"><PixelFish species={latestFish} /></div>
            <time>{latest.date}{catchTimeLabel(latest) && ` · ${catchTimeLabel(latest)}`}</time>
            <h3>{speciesName(latestFish)}</h3><p>{latest.location}</p>
            <dl><div><dt>魚身長度</dt><dd>{latest.length ?? "—"} 厘米</dd></div>
              <div><dt>重量</dt><dd>{latest.weight ?? "—"} 克</dd></div></dl>
            <Link className="fl-latest-link" href={`/catches/${latest.id}`}>查看紀錄 <ArrowUpRight size={16} /></Link>
          </> : <div className="fl-latest-empty">{loading ? "讀取紀錄中…" : "第一尾魚，第一個故事。"}</div>}
        </section>
      </div>
      {loading ? null : <CatchLog {...data} />}
    </>
  );
}
export function Collection() {
  const { data, loading } = useFishLog();
  const species = summarizeSpecies(data.species, data.catches);
  return (
    <>
      <div className="fl-page-heading">
        <h1>
          魚種圖鑑<span className="fl-heading-count">{species.length}</span>
        </h1>
      </div>
      <div className="fl-collection">
        {species.map((fish, index) => (
          <Link className="fl-species-card" key={fish.id} href={`/species/${fish.id}`}>
            <span className="fl-species-number">
              {String(index + 1).padStart(2, "0")} / 已解鎖
            </span>
            <PixelFish species={fish} />
            <h2>{speciesName(fish)}</h2>
            {fish.chineseName && fish.englishName && (
              <p>{fish.englishName.toUpperCase()}</p>
            )}
            <div>
              <span>{fish.totalCaught} 次釣獲</span>
              <span>最長 {fish.bestLength ?? "—"} 厘米</span>
            </div>
          </Link>
        ))}
      </div>
      {!species.length && !loading && (
        <div className="fl-empty">第一筆漁獲儲存後，魚種就會出現喺呢度。</div>
      )}
    </>
  );
}
export function SpeciesDetail({ id }: { id: string }) {
  const { data, loading } = useFishLog();
  const fish = summarizeSpecies(data.species, data.catches).find(
    (s) => s.id === id,
  );
  if (loading && !fish) return null;
  if (!fish) return <Missing />;
  return (
    <>
      <Link className="fl-back" href="/collection">
        <ArrowLeft size={15} /> 返回魚種圖鑑
      </Link>
      <section className="fl-species-hero">
        <div className="fl-detail-fish">
          <PixelFish species={fish} />
        </div>
        <div>
          <h1>{speciesName(fish)}</h1>
          {fish.chineseName && fish.englishName && (
            <p className="fl-latin">{fish.englishName.toUpperCase()}</p>
          )}
          <p className="fl-scientific">{fish.scientificName || "學名未記錄"}</p>
          <div className="fl-stats">
            <div>
              <b>{fish.totalCaught}</b>
              <span>釣獲次數</span>
            </div>
            <div>
              <b>
                {fish.bestLength ?? "—"}
                <small> 厘米</small>
              </b>
              <span>最長紀錄</span>
            </div>
            <div>
              <b className="fl-stat-date">{fish.firstCaughtDate}</b>
              <span>首次釣獲</span>
            </div>
          </div>
        </div>
      </section>
      <div className="fl-section-header">
        <h2>釣獲歷史</h2>
      </div>
      <CatchRows
        catches={sortCatches(data.catches.filter((c) => c.speciesId === id))}
        species={data.species}
      />
    </>
  );
}
export function CatchDetail({ id }: { id: string }) {
  const [editing, setEditing] = useState(false);
  const { data, loading } = useFishLog();
  const record = data.catches.find((c) => c.id === id),
    fish = data.species.find((s) => s.id === record?.speciesId);
  if (loading && (!record || !fish)) return null;
  if (!record || !fish) return <Missing />;
  const fields = [
    ["日期", record.date],
    ["時段", catchTimeLabel(record)],
    ["地點", record.location],
    ["長度", record.length ? `${record.length} 厘米` : undefined],
    ["重量", record.weight ? `${record.weight} 克` : undefined],
    ["釣竿", record.rod],
    ["魚輪", record.reel],
    ["主線", record.line],
    ["前導線", record.leaderLine],
    ["擬餌／魚餌", record.lure],
  ];
  return (
    <>
      <Link className="fl-back" href="/#catch-log">
        <ArrowLeft size={15} /> 返回漁獲紀錄
      </Link>
      <div className="fl-detail-heading">
        <div className="fl-detail-title">
          <p className="fl-eyebrow">CATCH RECORD</p>
          <h1>{speciesName(fish)}</h1>
          <Link className="fl-species-link" href={`/species/${fish.id}`}>
            查看魚種圖鑑 <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="fl-detail-actions">
          <button
            type="button"
            className="fl-edit-catch"
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} aria-hidden="true" /> 編輯漁獲
          </button>
          <DeleteCatch id={record.id} name={speciesName(fish)} />
        </div>
      </div>
      <div className="fl-catch-detail">
        <div>
          <div className="fl-detail-pixel">
            <PixelFish species={fish} />
          </div>
          <figure className="fl-original">
            {record.photo ? (
              <img src={record.photo} alt={`${speciesName(fish)}原始魚相`} />
            ) : (
              <div>未提供原始魚相</div>
            )}
            <figcaption>原始魚相</figcaption>
          </figure>
        </div>
        <div>
          <dl className="fl-field-list">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "未記錄"}</dd>
              </div>
            ))}
          </dl>
          <section className="fl-notes">
            <h2>備註</h2>
            <p>{record.note || "未記錄"}</p>
          </section>
        </div>
      </div>
      {editing && (
        <CatchEditor record={record} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
function Missing() {
  return (
    <div className="fl-empty">
      <span className="fl-eyebrow">找不到紀錄</span>
      <h1>搵唔到呢條紀錄。</h1>
      <p>紀錄可能未同步，或者呢條連結已經無效。</p>
      <Link href="/">返回漁獲紀錄 →</Link>
    </div>
  );
}
