"use client";
import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import type { Point } from "@/lib/island-world";
import { joystickPosition } from "@/lib/island-joystick";

export function IslandJoystick({ onMove, disabled }: { onMove: (point: Point) => void; disabled: boolean }) {
  const base = useRef<HTMLButtonElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const reset = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    onMove({ x: 0, z: 0 });
    if (base.current) {
      base.current.dataset.active = "false";
      if (id !== null && base.current.hasPointerCapture(id)) base.current.releasePointerCapture(id);
    }
    if (thumb.current) thumb.current.style.transform = "translate3d(0, 0, 0)";
  }, [onMove]);

  useEffect(() => {
    if (disabled) reset();
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    window.addEventListener("pagehide", reset);
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      reset();
      window.removeEventListener("blur", reset);
      window.removeEventListener("pagehide", reset);
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [disabled, reset]);

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || pointer.current !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = (rect.width - (thumb.current?.offsetWidth ?? 56)) / 2 - 4;
    const stick = joystickPosition(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, radius);
    onMove({ x: stick.x, z: stick.z });
    if (thumb.current) thumb.current.style.transform = `translate3d(${stick.thumbX}px, ${stick.thumbY}px, 0)`;
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current === event.pointerId) reset();
  }
  return (
    <div className="island-touch">
      <button
        ref={base}
        type="button"
        className="island-joystick"
        aria-label="Movement joystick"
        aria-describedby="island-joystick-help"
        disabled={disabled}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (disabled || pointer.current !== null || event.button !== 0) return;
          event.preventDefault();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.active = "true";
          move(event);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <span className="island-joystick-ring" aria-hidden="true" />
        <span ref={thumb} className="island-joystick-thumb" aria-hidden="true"><span /></span>
      </button>
      <span id="island-joystick-help" className="sr-only">Drag in any direction to walk. Push further to walk faster. Release to stop. Keyboard users can use WASD or arrow keys.</span>
    </div>
  );
}
