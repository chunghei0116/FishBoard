"use client";
import Link from "next/link";
import { useState } from "react";
import { Clock3, MapPin, ArrowRight, Search, X } from "lucide-react";
import type { Catch, Species } from "@/data/types";
import { filterCatches, speciesName, catchTimeLabel } from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
export function CatchRows({
  catches,
  species,
}: {
  catches: Catch[];
  species: Species[];
}) {
  return <div className="fl-catch-list">
    {catches.map(c => {
      const fish = species.find(s => s.id === c.speciesId);
      if (!fish) return null;
      return <Link href={`/catches/${c.id}`} className="fl-catch-row" key={c.id}>
        <PixelFish species={fish} />
        <div className="fl-catch-name"><b>{speciesName(fish)}</b>
          {fish.chineseName && fish.englishName && <span>{fish.englishName}</span>}
        </div>
        <span className="fl-catch-time"><Clock3 size={14} /><time>{c.date}{catchTimeLabel(c) && ` · ${catchTimeLabel(c)}`}</time></span>
        <span className="fl-catch-location"><MapPin size={14} />{c.location}</span>
        <span className="fl-catch-length">{c.length ?? "—"} <small>厘米</small></span>
        <ArrowRight className="fl-card-arrow" size={17} />
      </Link>;
    })}
  </div>;
}

export default function CatchLog({
  catches,
  species,
}: {
  catches: Catch[];
  species: Species[];
}) {
  const [query, setQuery] = useState("");
  const [selectedSpecies, setSpecies] = useState(""),
    [location, setLocation] = useState(""),
    [year, setYear] = useState("");
  const filtered = filterCatches(catches, {
    species: selectedSpecies,
    location,
    year,
  }).filter(c => {
    const fish = species.find(s => s.id === c.speciesId);
    const text = [c.location, fish?.chineseName, fish?.englishName].join(" ").toLocaleLowerCase();
    return text.includes(query.trim().toLocaleLowerCase());
  });
  return (
    <section id="catch-log" className="fl-log">
      <div className="fl-section-header fl-log-title">
        <h2>漁獲紀錄</h2>
        <span className="fl-result-count" aria-live="polite">{filtered.length} / {catches.length} 筆紀錄</span>
      </div>
      <div className="fl-filter-bar">
        <label className="fl-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" aria-label="搜尋漁獲" placeholder="搜尋魚種或地點" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className="fl-filter-options">
          <label className="fl-filter-field"><span>魚種</span>
            <select aria-label="按魚種篩選" value={selectedSpecies} onChange={e => setSpecies(e.target.value)}>
              <option value="">全部魚種</option>
              {species.filter(s => catches.some(c => c.speciesId === s.id)).map(s => <option value={s.id} key={s.id}>{speciesName(s)}</option>)}
            </select>
          </label>
          <label className="fl-filter-field"><span>地點</span>
            <select aria-label="按地點篩選" value={location} onChange={e => setLocation(e.target.value)}>
              <option value="">全部地點</option>
              {[...new Set(catches.map(c => c.location))].map(l => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="fl-filter-field"><span>年份</span>
            <select aria-label="按年份篩選" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">全部年份</option>
              {[...new Set(catches.map(c => c.date.slice(0, 4)))].sort().reverse().map(y => <option key={y}>{y}</option>)}
            </select>
          </label>
          <button type="button" className="fl-clear-filter" disabled={!selectedSpecies && !location && !year && !query}
            onClick={() => { setSpecies(""); setLocation(""); setYear(""); setQuery(""); }}>
            <X size={15} aria-hidden="true" /><span>清除篩選</span>
          </button>
        </div>
      </div>
      <CatchRows catches={filtered} species={species} />
      {!filtered.length && (
        <div className="fl-empty">
          <h2>
            {catches.length
              ? "呢個篩選未有紀錄。"
              : "水邊嘅故事，由第一尾開始。"}
          </h2>
          <p>
            {catches.length
              ? "試下其他魚種、地點或年份。"
              : "新增漁獲，收藏會隨每次釣魚慢慢成長。"}
          </p>
        </div>
      )}
    </section>
  );
}
