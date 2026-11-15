"use client";

import { useEffect, useState } from "react";
import { FlameIcon } from "./Icons";

export type RiskPoint = { date: string; p: number | null; lv: "low" | "mid" | "high" };
export type RiskMode = "weeks" | "days";

const TXT = {
  en: {
    loc: "en-US",
    weeks: "Weeks",
    days: "Days",
    today: "Today",
    thisWeek: "This week",
    nowLow: "Fire risk is low right now.",
    nowMid: "Fire risk is moderate right now.",
    nowHigh: "Fire risk is high right now.",
    peak: (when: string, pct: string) => `The highest chance comes ${when}: ${pct}.`,
    allLow: (n: string) => `Low risk expected for the next ${n}.`,
    nextWeeks: "8 weeks",
    nextDays: "14 days",
    onThe: (d: string) => `around ${d}`,
    low: "Low",
    mid: "Medium",
    high: "High",
    chance: "Chance of fire",
    historic: "Showing how often fire appeared here in past years. The prediction is not available right now.",
    aria: "Fire risk forecast",
    lt5: "< 5 %",
  },
  es: {
    loc: "es-PE",
    weeks: "Semanas",
    days: "Días",
    today: "Hoy",
    thisWeek: "Esta semana",
    nowLow: "El riesgo de fuego es bajo ahora.",
    nowMid: "El riesgo de fuego es moderado ahora.",
    nowHigh: "El riesgo de fuego es alto ahora.",
    peak: (when: string, pct: string) => `La mayor probabilidad llega ${when}: ${pct}.`,
    allLow: (n: string) => `Se espera riesgo bajo durante los próximos ${n}.`,
    nextWeeks: "8 semanas",
    nextDays: "14 días",
    onThe: (d: string) => `hacia el ${d}`,
    low: "Bajo",
    mid: "Medio",
    high: "Alto",
    chance: "Probabilidad de fuego",
    historic: "Se muestra qué tan seguido hubo fuego aquí en años pasados. La predicción no está disponible por ahora.",
    aria: "Pronóstico de riesgo de fuego",
    lt5: "< 5 %",
  },
};

const MIN_COL = 76; // ancho mínimo de cada columna en px (la curva y la tira comparten el mismo eje)
const H = 120;
const PAD = 14;

const COLOR = { low: "#8FB1C7", mid: "#FFB347", high: "#FF7A2F" } as const;

/** Curva suave (Catmull-Rom → Bézier) por los puntos. */
function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

const flameSize = { low: "size-4 opacity-50", mid: "size-5", high: "size-7" };

/**
 * Pronóstico de riesgo al estilo del clima: una frase, una tira con la llama de cada periodo y una curva de probabilidad.
 * `weeks` = próximas 8 semanas; `days` = próximos 14 días. Si no hay predicción (p = null) se muestra la recurrencia histórica.
 */
export default function RiskForecast({
  points,
  mode,
  setMode,
  canDays,
  loading,
  lang,
}: {
  points: RiskPoint[];
  mode: RiskMode;
  setMode: (m: RiskMode) => void;
  canDays: boolean;
  loading: boolean;
  lang: "en" | "es";
}) {
  const t = TXT[lang];
  const hasP = points.length > 0 && points.every((x) => x.p !== null);
  const n = points.length;
  // Las columnas se reparten todo el ancho disponible (con un mínimo; si no caben, la tira se desliza)
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState(0);
  useEffect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => setAvail(box.clientWidth));
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);
  const COL = Math.max(MIN_COL, n ? Math.floor(avail / n) : MIN_COL);
  const W = Math.max(n, 1) * COL;

  const pv = points.map((x) => x.p ?? 0);
  const top = Math.max(0.4, Math.max(...pv) * 1.45); // la escala se ajusta a los datos; la banda "alta" solo se dibuja si cabe
  const y = (v: number) => PAD + (1 - v / top) * (H - PAD * 2);
  const xy = points.map((_, i) => ({ x: i * COL + COL / 2, y: y(pv[i]) }));
  const line = smooth(xy);
  const area = xy.length ? `${line} L${xy[xy.length - 1].x},${H} L${xy[0].x},${H} Z` : "";

  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => {
    const [yy, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(yy, m - 1, d)).toLocaleDateString(t.loc, { ...o, timeZone: "UTC" });
  };
  const pct = (p: number | null) => (p === null ? "" : p < 0.05 ? t.lt5 : `${Math.round(p * 100)} %`);

  // Frase de titular
  const first = points[0];
  let peak = points[0];
  for (const x of points) if ((x.p ?? 0) > (peak?.p ?? 0)) peak = x;
  const nowTxt = !first ? "" : first.lv === "high" ? t.nowHigh : first.lv === "mid" ? t.nowMid : t.nowLow;
  const peakTxt =
    !first || !peak || peak === first || peak.lv === "low"
      ? points.every((x) => x.lv === "low")
        ? t.allLow(mode === "weeks" ? t.nextWeeks : t.nextDays)
        : ""
      : t.peak(t.onThe(fmt(peak.date, { day: "numeric", month: "long" })), pct(peak.p));

  return (
    <div role="group" aria-label={t.aria}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug text-snow sm:text-xl">{nowTxt || "…"}</p>
          {peakTxt && <p className="mt-1 text-sm text-snow/75">{peakTxt}</p>}
        </div>
        {canDays && (
          <div role="tablist" aria-label={t.aria} className="flex shrink-0 rounded-full border border-snow/20 p-0.5 text-xs font-semibold">
            {(["weeks", "days"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`cursor-pointer rounded-full px-3.5 py-1.5 transition-colors ${mode === m ? "bg-snow text-ink" : "text-snow/70 hover:text-snow"}`}>
                {t[m]}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !n ? (
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-snow/[0.05]" aria-hidden="true" />
      ) : (
        <div ref={setBox} className="mt-5 overflow-x-auto pb-1">
          <div style={{ width: W }} className="relative">
            {/* Tira: una columna por periodo */}
            <ul className="flex" style={{ width: W }}>
              {points.map((x, i) => {
                const label = mode === "days" ? fmt(x.date, { weekday: "short" }) : fmt(x.date, { day: "numeric", month: "short" });
                const sub = mode === "days" ? fmt(x.date, { day: "numeric", month: "short" }) : i === 0 ? t.thisWeek : "";
                return (
                  <li key={x.date} style={{ width: COL }} className={`flex flex-col items-center gap-1.5 rounded-2xl py-2.5 text-center ${i === 0 ? "bg-snow/[0.07]" : ""}`}>
                    <span className="text-xs font-semibold text-snow">{i === 0 && mode === "days" ? t.today : label}</span>
                    <span className="h-3.5 text-[10px] text-snow/50">{sub}</span>
                    <span className="grid h-8 place-items-center" style={{ color: COLOR[x.lv] }}>
                      <FlameIcon className={flameSize[x.lv]} />
                    </span>
                    <span className="text-sm font-bold tabular-nums text-snow">{hasP ? pct(x.p) : t[x.lv]}</span>
                  </li>
                );
              })}
            </ul>

            {/* Curva de probabilidad (mismo eje horizontal que la tira) */}
            {hasP && (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.chance} className="mt-2 block">
                <defs>
                  <linearGradient id="risk-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB347" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FFB347" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Bandas: bajo / medio / alto */}
                {top > 0.5 && <rect x="0" y={y(top)} width={W} height={y(0.5) - y(top)} fill="#FF7A2F" fillOpacity="0.09" />}
                <rect x="0" y={y(0.5)} width={W} height={y(0.2) - y(0.5)} fill="#FFB347" fillOpacity="0.07" />
                <g stroke="#F3F9FC" strokeOpacity="0.18" strokeDasharray="3 4">
                  {top > 0.5 && <line x1="0" x2={W} y1={y(0.5)} y2={y(0.5)} />}
                  <line x1="0" x2={W} y1={y(0.2)} y2={y(0.2)} />
                </g>
                <g fontSize="10" fill="#F3F9FC" fillOpacity="0.5">
                  {top > 0.5 && <text x="4" y={y(0.5) - 4}>{t.high}</text>}
                  <text x="4" y={y(0.2) - 4}>{t.mid}</text>
                </g>
                <path d={area} fill="url(#risk-area)" />
                <path d={line} fill="none" stroke="#FFB347" strokeWidth="2.2" strokeLinecap="round" />
                {xy.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 4.5 : 3} fill={i === 0 ? "#F3F9FC" : COLOR[points[i].lv]} stroke="#0C090A" strokeWidth="1.5" />
                ))}
              </svg>
            )}
          </div>
        </div>
      )}

      {!hasP && n > 0 && <p className="mt-2 text-xs text-amber">{t.historic}</p>}
    </div>
  );
}
