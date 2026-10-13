"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Plus, Pause, Play } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Catch, Species } from "@/data/types";
import { summarizeSpecies, sortCatches, speciesName, catchTimeLabel } from "@/lib/fish-log";
import { useFishLog } from "./provider";
import Aquarium from "./aquarium";
import PixelFish from "./pixel-fish";
import CatchLog from "./catch-log";

gsap.registerPlugin(useGSAP, ScrollTrigger);
const AddCatch = dynamic(() => import("./add-catch"), { ssr: false });

function CatchArtwork({ record, fish }: { record: Catch; fish: Species }) {
  const [failed, setFailed] = useState(false);
  return record.photo && !failed ? (
    // Private photo URLs need the browser session, so bypass the server image optimizer.
    <Image src={record.photo} alt={`${speciesName(fish)} · ${record.location}`} fill unoptimized sizes="(max-width: 760px) 100vw, 55vw" onError={() => setFailed(true)} />
  ) : <div className="fh-fish-art"><PixelFish species={fish} /><span>{record.photo ? "相片暫時未能載入" : "像素魚收藏"}</span></div>;
}

export default function Home({ className = "" }: { className?: string }) {
  const { data, loading } = useFishLog();
  const root = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [marqueePaused, setMarqueePaused] = useState(false);
  const species = summarizeSpecies(data.species, data.catches);
  const stories = sortCatches(data.catches).filter(c => data.species.some(s => s.id === c.speciesId)).slice(0, 5);
  const activeIndex = Math.max(0, stories.findIndex(c => c.id === selectedId));
  const record = stories[activeIndex];
  const fish = data.species.find(s => s.id === record?.speciesId);
  const longest = data.catches.reduce((max, c) => Math.max(max, c.length ?? 0), 0);
  const latest = stories[0];
  const step = (direction: number) => setSelectedId(stories[(activeIndex + direction + stories.length) % stories.length]?.id);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-home-image]", root.current).forEach(image => {
        gsap.timeline({ scrollTrigger: { trigger: image, start: "top 95%", end: "bottom top", scrub: 1 } })
          .fromTo(image, { scale: .8, opacity: 1, filter: "brightness(1)" }, { scale: 1, opacity: 1, duration: .65, ease: "none" })
          .to(image, { scale: .96, opacity: .2, filter: "brightness(.7)", duration: .35, ease: "none" });
      });
    });
    media.add("(min-width: 1101px) and (prefers-reduced-motion: no-preference)", () => {
      const title = root.current?.querySelector<HTMLElement>(".fh-story-intro");
      const gallery = root.current?.querySelector<HTMLElement>(".fh-story-gallery");
      if (title && gallery) ScrollTrigger.create({
        trigger: title, start: "top 120px", pin: true, pinSpacing: false,
        end: () => `+=${Math.max(0, gallery.offsetHeight - title.offsetHeight)}`,
        invalidateOnRefresh: true,
      });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [loading, stories.length], revertOnUpdate: true });

  return (
    <div ref={root} className={`fl-home overflow-x-hidden w-full max-w-full ${className}`}>
      <section className="fh-hero" aria-labelledby="home-title">
        <div className="fh-hero-copy">
          <h1 id="home-title" className="max-w-6xl">在水邊，<span className="fh-inline-coast" aria-hidden="true" /><br />留下好故事。</h1>
          <p>每一次拋竿，都有值得留住的片刻。<br />收藏漁獲，記下屬於你的水邊日常。</p>
          <div className="fh-hero-actions">
            <button type="button" className="fh-button fh-button-primary" aria-label="新增漁獲" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> 記下一尾</button>
            <a className="fh-button fh-button-secondary" href="#catch-log">瀏覽紀錄 <ArrowDown size={17} aria-hidden="true" /></a>
          </div>
        </div>
        <figure className="fh-hero-media">
          <div className="fh-coast-image" data-home-image>
            <Image src="/fish/landing-coast.webp" alt="海浪輕拍岸邊的日落時分" fill sizes="(max-width: 760px) 100vw, 40vw" preload />
          </div>
          <figcaption>我的水域，我的漁獲。</figcaption>
        </figure>
      </section>

      <section className="fh-collection" aria-labelledby="collection-title" aria-busy={loading}>
        <header className="fh-section-heading"><div><h2 id="collection-title">把熱愛，慢慢收藏。</h2><p>每一尾新魚，都讓這片水域更豐富。</p></div><Link href="/collection" className="fh-text-link">探索圖鑑 <ArrowUpRight size={18} aria-hidden="true" /></Link></header>
        <div className="fh-bento grid-flow-dense">
          <section className="fh-tank-panel" aria-label="我的像素水族箱">
            <div className="fh-tank-title"><h3>我的像素水族箱</h3><span>輕觸游魚，查看收藏</span></div>
            {loading ? <div className="fh-tank-loading" role="status">讀取你的像素水族箱…</div> : <Aquarium species={species} total={data.catches.length} />}
          </section>
          <Link className="fh-summary fh-summary-blue" href="#catch-log">
            <span>漁獲紀錄 <ArrowUpRight size={19} aria-hidden="true" /></span>
            <strong>{loading ? "—" : data.catches.length}<small>筆</small></strong>
            <p>{loading ? "讀取你的收藏…" : `已收藏 ${species.length} 個魚種`}</p>
          </Link>
          <Link className="fh-summary fh-summary-light" href="/collection">
            <span>最長紀錄 <ArrowUpRight size={19} aria-hidden="true" /></span>
            <strong>{loading || !longest ? "—" : longest}<small>厘米</small></strong>
            <p>{loading ? "讀取你的紀錄…" : latest ? `最近出釣 · ${latest.date}` : "下一次，創下你的紀錄。"}</p>
          </Link>
        </div>
        {!!species.length && !loading && <div className={`fh-marquee ${marqueePaused ? "is-paused" : ""}`}>
          <div className="fh-marquee-viewport"><div className="fh-marquee-track" aria-hidden="true">
            {[0, 1].map(copy => <div className="fh-marquee-group" key={copy}>{species.map(s => <span key={s.id}>{speciesName(s)}<i /></span>)}</div>)}
          </div></div>
          <p className="fh-sr-only">已收藏魚種：{species.map(speciesName).join("、")}</p>
          <button type="button" aria-label={marqueePaused ? "繼續魚種跑馬燈" : "暫停魚種跑馬燈"} aria-pressed={marqueePaused} onClick={() => setMarqueePaused(v => !v)}>{marqueePaused ? <Play size={15} /> : <Pause size={15} />}</button>
        </div>}
      </section>

      <div className="fh-archive">
        {loading ? <section id="catch-log" role="status" className="fh-loading">讀取你的漁獲紀錄…</section> : <CatchLog {...data} />}
      </div>

      {record && fish && !loading && <section className="fh-stories" aria-labelledby="story-title">
        <div className="fh-story-intro"><h2 id="story-title">不止是一尾魚。<br /><span>也是一段回憶。</span></h2><p>重新翻開那些日子。<br />水邊的風景、手上的釣組，<br />還有當時的心情。</p><Link className="fh-text-link" href="/map">重訪釣獲地點 <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <div className="fh-story-gallery" role="region" aria-label="水邊故事" aria-roledescription="carousel">
          <Link href={`/catches/${record.id}`} className="fh-story-art" aria-label={`查看${speciesName(fish)}漁獲紀錄`}>
            <div data-home-image><CatchArtwork key={`${record.id}:${record.photo}`} record={record} fish={fish} /></div>
            <span className="fh-art-link"><ArrowUpRight size={21} aria-hidden="true" /></span>
          </Link>
          <div className="fh-story-caption" aria-live="polite" aria-atomic="true">
            <div className="fh-story-meta"><span>{record.date}{catchTimeLabel(record) && ` · ${catchTimeLabel(record)}`}</span><span>{activeIndex + 1} / {stories.length}</span></div>
            <h3>{speciesName(fish)}<span>{record.location}</span></h3>
            <p className="fh-story-note">{record.note?.trim() || "當時沒有留下備註，但這一尾，已經成為收藏的一部分。"}</p>
            <div className="fh-story-bottom">
              <div className="fh-story-fish" aria-hidden="true">{stories.slice(0, 3).map(c => { const s = data.species.find(s => s.id === c.speciesId)!; return <div key={c.id}><PixelFish species={s} /></div>; })}</div>
              <div className="fh-carousel-controls"><button type="button" aria-label="上一筆故事" disabled={stories.length < 2} onClick={() => step(-1)}><ArrowLeft size={18} /></button><button type="button" aria-label="下一筆故事" disabled={stories.length < 2} onClick={() => step(1)}><ArrowRight size={18} /></button></div>
            </div>
          </div>
        </div>
      </section>}

      <section className="fh-action" aria-labelledby="action-title">
        <div><h2 id="action-title">下一尾，<br />值得留下。</h2><p>讓每一次出釣，成為你的收藏。</p></div>
        <button className="fh-button fh-button-white" type="button" onClick={() => setAdding(true)}>新增漁獲 <ArrowUpRight size={19} aria-hidden="true" /></button>
      </section>
      <footer className="fh-footer"><span>Fishboard · 釣魚日和</span><nav aria-label="主頁頁尾"><Link href="/collection">圖鑑</Link><Link href="/map">地點</Link><Link href="/settings">設定</Link></nav></footer>
      {adding && <AddCatch onClose={() => setAdding(false)} />}
    </div>
  );
}
