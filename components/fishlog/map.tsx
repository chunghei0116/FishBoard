"use client";
import { useLoading } from "./loading-dialog";
import { useEffect, useRef, useState } from "react";
import type { Map as JournalMap, StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { journalMapStyle } from "@/lib/map-style";
import { useFishLog } from "./provider";
import { CatchRows } from "./catch-log";
import { sortCatches, catchMarkerKey } from "@/lib/fish-log";
import { X, MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
export default function CatchMap() {
  const { data } = useFishLog();
  const { resolvedTheme } = useTheme();
  const host = useRef<HTMLDivElement>(null),
    map = useRef<JournalMap | null>(null);
  const [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [fetching, setFetching] = useState(true);
  useLoading(fetching, "載入釣獲地圖…", 0);
  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    async function initialize() {
      try {
        setFetching(true);
        setError("");
        const [M, response] = await Promise.all([
          import("maplibre-gl"),
          fetch("https://tiles.openfreemap.org/styles/positron", {
            signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
          }),
        ]);
        if (!response.ok) throw Error("Map unavailable");
        const style = (await response.json()) as StyleSpecification;
        if (disposed || !host.current) return;
        M.setWorkerUrl(
          new URL(
            "maplibre-gl/dist/maplibre-gl-worker.mjs",
            import.meta.url,
          ).toString(),
        );
        const instance = new M.Map({
          container: host.current,
          style: journalMapStyle(style, resolvedTheme === "dark"),
          center: [114.195, 22.305],
          zoom: 11,
          scrollZoom: false,
          locale: {
            "Map.Title": "釣獲地點地圖",
            "NavigationControl.ZoomIn": "放大地圖",
            "NavigationControl.ZoomOut": "縮小地圖",
            "AttributionControl.ToggleAttribution": "地圖資料來源",
          },
          dragRotate: false,
        });
        map.current = instance;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(
          new M.NavigationControl({ showCompass: false }),
          "top-right",
        );
        const records = data.catches.filter(
          (c) => catchMarkerKey(c) !== null,
        );
        const points = new Map<string, typeof records>();
        for (const record of records) {
          const key = catchMarkerKey(record)!;
          points.set(key, [...(points.get(key) || []), record]);
        }
        for (const records of points.values()) {
          const c = records[0];
          const button = document.createElement("button");
          button.type = "button";
          button.className = "fl-map-marker";
          button.textContent = String(records.length);
          button.setAttribute(
            "aria-label",
            `${c.location} · ${records.length} 筆漁獲`,
          );
          button.title = `${c.location} · ${records.length} 筆漁獲`;
          button.dataset.markerKey = catchMarkerKey(c)!;
          button.setAttribute("aria-pressed", "false");
          button.addEventListener("click", () => {
            setSelected(catchMarkerKey(c)!);
            instance.panTo([c.longitude!, c.latitude!]);
          });
          new M.Marker({ element: button })
            .setLngLat([c.longitude!, c.latitude!])
            .addTo(instance);
        }
        if (records.length) {
          const bounds = new M.LngLatBounds();
          records.forEach((c) => bounds.extend([c.longitude!, c.latitude!]));
          instance.fitBounds(bounds, { padding: 35, maxZoom: 13, duration: 0 });
        }
      } catch {
        if (!disposed) setError("地圖未能載入；地點紀錄仍可在下面查看。");
      } finally {
        if (!disposed) setFetching(false);
      }
    }
    void initialize();
    return () => {
      disposed = true;
      abort.abort();
      map.current?.remove();
      map.current = null;
    };
  }, [data.catches, resolvedTheme]);
  const records = sortCatches(
    data.catches.filter((c) => !selected || catchMarkerKey(c) === selected),
  );
  const selectedLocation = selected ? records[0]?.location : undefined;
  useEffect(() => {
    host.current?.querySelectorAll<HTMLButtonElement>(".fl-map-marker").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.markerKey === selected));
    });
  }, [selected, fetching]);
  return (
    <>
      <div className="fl-page-heading">
        <h1>釣獲地圖</h1>
      </div>
      {error && <p className="fl-error">{error}</p>}
      <div className="fl-map-panel">
        <div>
          <div ref={host} className="fl-map" aria-label="釣獲地點地圖" />
          <p className="fl-map-note"><MapPin size={14} aria-hidden="true" />點選地圖標記，查看該位置的漁獲。</p>
        </div>
      </div>
      <div className="fl-section-header fl-map-results">
        <div><h2>{selectedLocation || (selected ? "此位置的漁獲" : "所有漁獲")}</h2><span className="fl-result-count" aria-live="polite">{records.length} 筆紀錄</span></div>
        {selected && <button className="fl-clear-filter" onClick={() => setSelected("")}><X size={15} />顯示全部</button>}
      </div>
      <CatchRows catches={records} species={data.species} />
      {!records.length && (
        <div className="fl-empty">
          未有地點紀錄。新增漁獲時填寫座標，就會喺地圖出現。
        </div>
      )}
    </>
  );
}
