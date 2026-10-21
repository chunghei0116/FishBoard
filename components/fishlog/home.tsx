"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { summarizeSpecies, sortCatches, speciesName } from "@/lib/fish-log";
import { useFishLog } from "./provider";
import Aquarium from "./aquarium";
import CatchLog from "./catch-log";

gsap.registerPlugin(useGSAP, ScrollTrigger);
export default function Home({ className = "" }: { className?: string }) {
  const { data, loading } = useFishLog();
  const root = useRef<HTMLDivElement>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const species = summarizeSpecies(data.species, data.catches);
  const longest = data.catches.reduce((max, c) => Math.max(max, c.length ?? 0), 0);
  const latest = sortCatches(data.catches)[0];

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-home-image]", root.current).forEach(image => {
        gsap.timeline({ scrollTrigger: { trigger: image, start: "top 95%", end: "bottom top", scrub: 1 } })
          .fromTo(image, { scale: .8, opacity: 1, filter: "brightness(1)" }, { scale: 1, opacity: 1, duration: .65, ease: "none" })
          .to(image, { scale: .96, opacity: .2, filter: "brightness(.7)", duration: .35, ease: "none" });
      });
    });
    return () => media.revert();
  }, { scope: root });

  return (
    <div ref={root} className={`fl-home overflow-x-hidden w-full max-w-full ${className}`}>
      <section className="fh-hero" aria-labelledby="home-title">
        <div className="fh-hero-copy">
          <h1 id="home-title" className="max-w-6xl">在水邊，<span className="fh-inline-coast" aria-hidden="true" /><br />留下好故事。</h1>
          <p>每一次拋竿，都有值得留住的片刻。<br />收藏漁獲，記下屬於你的水邊日常。</p>
          <div className="fh-hero-actions">
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
    </div>
  );
}
