"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { WebGLRenderer } from "three";

export default function WaterBackground({ paused }: { paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const update = useRef<((paused: boolean, dark: boolean) => void) | null>(null);
  const latest = useRef({ paused, dark: resolvedTheme === "dark" });
  useEffect(() => {
    latest.current = { paused, dark: resolvedTheme === "dark" };
    update.current?.(paused, latest.current.dark);
  }, [paused, resolvedTheme]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    async function initialize() {
      const THREE = await import("three");
      const container = host.current;
      if (cancelled || !container) return;
      let renderer: WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: { time: { value: 0 }, aspect: { value: 1 }, dark: { value: latest.current.dark ? 1 : 0 } },
        vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
        fragmentShader: `varying vec2 vUv; uniform float time; uniform float aspect; uniform float dark;
          void main(){
            vec2 p = vUv * vec2(aspect, 1.0) * 5.0;
            vec2 drift = vec2(sin(p.y * 1.5 + time * .14), cos(p.x * 1.35 - time * .11)) * .31;
            float a = sin((p.x + drift.x) * 2.35 + time * .10);
            float b = sin((p.y + drift.y) * 2.75 - time * .09);
            float caustic = pow(max(0.0, 1.0 - abs(a + b) * .64), 10.0);
            vec3 lightBase = mix(vec3(.976,.986,.996), vec3(.961,.978,.992), vUv.y);
            vec3 darkBase = mix(vec3(.068,.103,.153), vec3(.076,.118,.169), vUv.y);
            vec3 light = mix(vec3(.010,.014,.017), vec3(.009,.016,.025), dark);
            gl_FragColor = vec4(mix(lightBase, darkBase, dark) + caustic * light, 1.0);
          }`,
      });
      scene.add(new THREE.Mesh(geometry, material));
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      container.appendChild(canvas);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      let frame = 0, previous = 0, lastDraw = 0, dirty = true, lost = false;
      function schedule() {
        if (!frame && !cancelled && !document.hidden && !lost) frame = requestAnimationFrame(tick);
      }
      function tick(now: number) {
        frame = 0;
        if (cancelled || document.hidden || lost) return;
        const delta = previous ? Math.min((now - previous) / 1000, .06) : 0;
        previous = now;
        if (!latest.current.paused && !reduced.matches) { material.uniforms.time.value += delta; dirty = true; }
        if (dirty && now - lastDraw >= 1000 / 24) {
          renderer.render(scene, camera); lastDraw = now; dirty = false;
        }
        if ((!latest.current.paused && !reduced.matches) || dirty) schedule();
      }
      function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        material.uniforms.aspect.value = window.innerWidth / Math.max(1, window.innerHeight);
        dirty = true; schedule();
      }
      function visibility() {
        previous = 0;
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
        else { dirty = true; schedule(); }
      }
      function motionChange() { dirty = true; previous = 0; schedule(); }
      function contextLost(event: Event) {
        event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0;
        canvas.style.visibility = "hidden";
      }
      function contextRestored() { lost = false; canvas.style.visibility = ""; dirty = true; previous = 0; schedule(); }
      update.current = (nextPaused, dark) => {
        latest.current = { paused: nextPaused, dark };
        material.uniforms.dark.value = dark ? 1 : 0;
        previous = 0; dirty = true; schedule();
      };
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", visibility);
      reduced.addEventListener("change", motionChange);
      canvas.addEventListener("webglcontextlost", contextLost);
      canvas.addEventListener("webglcontextrestored", contextRestored);
      resize();
      return () => {
        update.current = null; cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", visibility);
        reduced.removeEventListener("change", motionChange);
        canvas.removeEventListener("webglcontextlost", contextLost);
        canvas.removeEventListener("webglcontextrestored", contextRestored);
        geometry.dispose(); material.dispose(); renderer.dispose(); canvas.remove();
      };
    }
    void initialize().then(cleanup => { if (cancelled) cleanup?.(); else dispose = cleanup; }).catch(() => {});
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div className="shared-water" ref={host} aria-hidden="true" />;
}
