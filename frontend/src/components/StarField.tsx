"use client";

import { useEffect, useRef } from "react";

/** Generador pseudoaleatorio con semilla: las estrellas no cambian entre cargas. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Campo de estrellas fijo detrás de toda la página.
 * Tonos de la paleta (snow y slate) y brillo bajo: da profundidad sin competir con el contenido.
 */
export default function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const low = (navigator.hardwareConcurrency ?? 8) <= 4;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx || !w || !h) return;
      ctx.scale(dpr, dpr);

      const r = rng(77);
      const n = Math.min(low ? 80 : 170, Math.round((w * h) / 7000));
      // snow, snow, slate claro, slate
      const tones = ["243,249,252", "243,249,252", "170,192,210", "76,102,121"];
      for (let i = 0; i < n; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = 0.35 + r() * r() * 1.1;
        ctx.fillStyle = `rgba(${tones[(r() * tones.length) | 0]},${(0.18 + r() * 0.42).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, 6.2832);
        ctx.fill();
      }

      // Unos pocos destellos muy discretos
      const flares = low ? 3 : 6;
      for (let j = 0; j < flares; j++) {
        const fx = r() * w;
        const fy = r() * h;
        const L = 3 + r() * 4;
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, L * 2.4);
        g.addColorStop(0, "rgba(170,192,210,.28)");
        g.addColorStop(1, "rgba(170,192,210,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, L * 2.4, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "rgba(243,249,252,.55)";
        ctx.beginPath();
        ctx.moveTo(fx - L, fy);
        ctx.quadraticCurveTo(fx, fy, fx, fy - L);
        ctx.quadraticCurveTo(fx, fy, fx + L, fy);
        ctx.quadraticCurveTo(fx, fy, fx, fy + L);
        ctx.quadraticCurveTo(fx, fy, fx - L, fy);
        ctx.fill();
      }
    };

    draw();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(draw, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="bg-stars" aria-hidden="true" />;
}
