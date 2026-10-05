"use client";
import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { advanceFish, createFishMotion } from "@/lib/fish-motion";

export function FishSwimmer({
  id,
  x,
  y,
  children,
  facesRight = false,
}: {
  id: string;
  x: number;
  y: number;
  children: ReactNode;
  facesRight?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const focused = useRef(false);
  useEffect(() => {
    const element = track.current;
    const aquarium = element?.closest(".aquarium");
    if (!element || !aquarium) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let fish = createFishMotion(id, x, y);
    let frame = 0,
      lastTime = 0,
      visible = true,
      width = 0,
      height = 0;
    function measure() {
      width = Math.max(0, aquarium!.clientWidth - element!.offsetWidth);
      height = Math.max(0, aquarium!.clientHeight - element!.offsetHeight);
    }
    function animate(time: number) {
      frame = 0;
      if (media.matches || document.hidden || !visible) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;
      fish = advanceFish(
        fish,
        dt,
        width,
        height,
        held.current || focused.current,
      );
      element!.style.transform = `translate(${(fish.x - x) * width}px, ${(fish.y - y) * height}px)`;
      element!.style.setProperty(
        "--fish-facing",
        String(fish.facing * (facesRight ? 1 : -1)),
      );
      if (!held.current && !focused.current) {
        element!.style.setProperty(
          "--fish-bob",
          `${Math.sin(time / 850 + (fish.seed % 20)) * 2}px`,
        );
      }
      frame = requestAnimationFrame(animate);
    }
    function resume() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (!media.matches && !document.hidden && visible)
        frame = requestAnimationFrame(animate);
      if (media.matches) {
        element!.style.transform = "";
        element!.style.removeProperty("--fish-bob");
        element!.style.removeProperty("--fish-facing");
      }
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(aquarium);
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(aquarium);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, [id, x, y, facesRight]);
  const position: CSSProperties = {
    left: `calc(${x * 100}% - ${x} * var(--badge-size))`,
    top: `calc(${y * 100}% - ${y * 100}px)`,
  };
  return (
    <div
      ref={track}
      className="swim-track"
      style={position}
      onPointerDownCapture={() => {
        held.current = true;
      }}
      onPointerUpCapture={() => {
        held.current = false;
      }}
      onPointerCancelCapture={() => {
        held.current = false;
      }}
      onFocusCapture={(event) => {
        focused.current = (event.target as HTMLElement).matches(
          ":focus-visible",
        );
      }}
      onBlurCapture={() => {
        focused.current = false;
      }}
    >
      {children}
    </div>
  );
}
