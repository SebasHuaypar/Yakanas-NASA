"use client";

import { hud } from "./fonts";
import { useLang } from "@/lib/lang";

const TXT = {
  en: {
    loc: "en",
    aria: (y: number, m: string, lo: string, hi: string) =>
      `Estimate for ${y}: ${m} hotspots, with a likely range of ${lo} to ${hi}.`,
    title: (y: number) => `Estimate for ${y}`,
    cap: "The mark is the best estimate; the band is the likely range (p10–p90). An estimated year is not a measured year.",
  },
  es: {
    loc: "es",
    aria: (y: number, m: string, lo: string, hi: string) =>
      `Estimación de ${y}: ${m} focos, con un rango probable de ${lo} a ${hi}.`,
    title: (y: number) => `Estimación de ${y}`,
    cap: "La marca es la mejor estimación; la franja es el rango probable (p10–p90). Un año estimado no es un año medido.",
  },
};

/** Barra de rango: valor estimado (marca) dentro de su intervalo probable (franja). */
export default function RangeBar({
  low,
  mid,
  high,
  year,
}: {
  low: number;
  mid: number;
  high: number;
  year: number;
}) {
  const [lang] = useLang();
  const L = TXT[lang];
  const nf = new Intl.NumberFormat(L.loc);
  const max = high * 1.12;
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <figure
      className="m-0"
      aria-label={L.aria(year, nf.format(mid), nf.format(low), nf.format(high))}
    >
      <p className={`text-xs text-slate ${hud}`}>{L.title(year)}</p>
      <div className="relative mt-8 h-3 rounded-full bg-(--mist)">
        <div
          className="absolute inset-y-0 rounded-full bg-navy/25"
          style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
        />
        <div
          className="absolute -top-3 h-9 w-0.5 bg-navy"
          style={{ left: pct(mid) }}
        />
        <span
          className="absolute -top-9 -translate-x-1/2 font-heading text-xl font-bold text-navy"
          style={{ left: pct(mid) }}
        >
          {nf.format(mid)}
        </span>
      </div>
      <div className="relative mt-3 h-5 text-xs text-slate">
        <span className="absolute -translate-x-1/2" style={{ left: pct(low) }}>
          {nf.format(low)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(high) }}>
          {nf.format(high)}
        </span>
      </div>
      <figcaption className="mt-4 text-sm text-slate">{L.cap}</figcaption>
    </figure>
  );
}
