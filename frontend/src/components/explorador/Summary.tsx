"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  annualTotals,
  climatology,
  quant,
  statusOf,
  type Status,
} from "@/app/explorador/lib/stats";
import { fmt } from "@/app/explorador/lib/ui";
import type { FireDataset, FireZone } from "@/app/explorador/lib/types";
import type { Texts } from "@/app/explorador/lib/i18n";

const PILL: Record<Status, string> = {
  high: "bg-snow text-ink",
  low: "bg-snow/15 text-snow/75",
  normal: "bg-snow/10 text-snow/60",
};

/** Número que se anima hasta su nuevo valor cuando cambia (sin animación con "reducir movimiento"). */
function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dur = reduce ? 0 : ms;
    const a = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
      const cur = a + (target - a) * (1 - Math.pow(1 - k, 3));
      from.current = cur;
      setV(cur);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Curva semanal del año elegido; el mes elegido queda resaltado como una banda. */
function Sparkline({
  values,
  band,
}: {
  values: number[];
  band: [number, number] | null;
}) {
  const W = 200,
    H = 34;
  const mx = Math.max(1, ...values);
  const pts = values.map(
    (v, i) =>
      [(i / (values.length - 1)) * W, H - 3 - (v / mx) * (H - 8)] as const,
  );
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-2 block h-8 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f9fc" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f3f9fc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {band && (
        <rect
          x={Math.max(0, ((band[0] - 0.5) / (values.length - 1)) * W)}
          y={0}
          width={((band[1] - band[0] + 1) / (values.length - 1)) * W}
          height={H}
          fill="#f3f9fc"
          fillOpacity={0.1}
          rx={2}
        />
      )}
      <path d={`${line}L${W},${H}L0,${H}Z`} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#f3f9fc"
        strokeOpacity={0.85}
        strokeWidth={1.4}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Doce barritas, una por mes: el pico en blanco y el mes elegido con aro. */
function MonthBars({
  values,
  peak,
  selected,
  labels,
}: {
  values: number[];
  peak: number;
  selected: number;
  labels: string[];
}) {
  const mx = Math.max(1, ...values);
  return (
    <div className="mt-2 flex h-8 items-end gap-[3px]" aria-hidden>
      {values.map((v, m) => (
        <div
          key={m}
          title={labels[m]}
          className={`flex-1 rounded-[3px] transition-all duration-500 ${m === peak ? "bg-snow" : "bg-snow/25"} ${m === selected ? "ring-1 ring-snow ring-offset-1 ring-offset-ink" : ""}`}
          style={{ height: `${Math.max(8, (v / mx) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** Medidor 0–300 % frente a lo típico; la marca vertical es el 100 %. */
function Gauge({ pct, label }: { pct: number; label: string }) {
  const pos = Math.min(1, pct / 300);
  return (
    <div className="mt-2.5" aria-hidden>
      <div className="relative h-1.5 rounded-full bg-snow/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-snow/25 to-snow transition-all duration-700"
          style={{ width: `${pos * 100}%` }}
        />
        <div
          className="absolute -top-1 bottom-[-4px] w-px bg-snow/50"
          style={{ left: `${(100 / 300) * 100}%` }}
        />
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-snow/45">
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${(100 / 300) * 100}%` }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/** Línea de tiempo del origen del dato: MODIS ajustado (hasta 2011) y VIIRS (desde 2012), con el año elegido marcado. */
function SensorTimeline({ ds, year }: { ds: FireDataset; year: number }) {
  const total = ds.yearCount - 1;
  const split = ((ds.lastEstimatedYear + 1 - ds.startYear) / total) * 100;
  const pos = ((year - ds.startYear) / total) * 100;
  return (
    <div className="mt-2.5" aria-hidden>
      <div className="relative flex h-1.5 gap-[3px]">
        <div
          className="rounded-full bg-snow/20"
          style={{ width: `${split}%` }}
        />
        <div className="flex-1 rounded-full bg-snow/70" />
        <div
          className="absolute -top-[3px] size-3 -translate-x-1/2 rounded-full border-2 border-ink bg-snow transition-all duration-500"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-snow/45">
        <span>{ds.startYear}</span>
        <span>{ds.startYear + total}</span>
      </div>
    </div>
  );
}

/** Frase en lenguaje llano + cuatro tarjetas con el resumen del periodo elegido. */
export default function Summary({
  zone,
  zoneName,
  ds,
  t,
  year,
  month,
}: {
  zone: FireZone;
  zoneName: string;
  ds: FireDataset;
  t: Texts;
  year: number;
  month: number;
}) {
  const yi = year - ds.startYear;
  const est =
    year <= ds.lastEstimatedYear || (month >= 0 && zone.EST[yi * 12 + month]);
  const cl = useMemo(() => climatology(zone, ds), [zone, ds]);
  const when = month >= 0 ? `${t.months[month]} ${year}` : `${year}`;

  let v = 0,
    lo = 0,
    hi = 0,
    normal: number,
    st: Status;
  if (month >= 0) {
    const i = yi * 12 + month;
    v = zone.H[i];
    lo = zone.LO[i];
    hi = zone.HI[i];
    normal = cl[month].med;
    st = statusOf(v, cl[month]);
  } else {
    for (let m = 0; m < 12; m++) {
      v += zone.H[yi * 12 + m];
      lo += zone.LO[yi * 12 + m];
      hi += zone.HI[yi * 12 + m];
    }
    const yt = annualTotals(zone, ds).slice(0, ds.baselineYears);
    normal = quant(yt, 0.5);
    st = v > quant(yt, 0.75) ? "high" : v < quant(yt, 0.25) ? "low" : "normal";
  }
  const monthly = useMemo(
    () => Array.from({ length: 12 }, (_, m) => zone.H[yi * 12 + m]),
    [zone, yi],
  );
  let pk = 0,
    pv = -1;
  monthly.forEach((x, m) => {
    if (x > pv) {
      pv = x;
      pk = m;
    }
  });

  const pctNum = normal > 0 ? (v / normal) * 100 : NaN;
  const pct = Number.isNaN(pctNum) ? "–" : `${Math.round(pctNum)}%`;
  const countV = useCountUp(v);
  const countP = useCountUp(Number.isNaN(pctNum) ? 0 : pctNum);
  const band: [number, number] | null = month >= 0 ? [month, month] : null;

  const TILE =
    "min-w-0 rounded-2xl border border-snow/15 bg-ink/45 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-snow/35";
  const LBL = "text-[11px] uppercase tracking-[0.14em] text-snow/60";
  const VAL = "text-[28px] font-bold leading-tight tabular-nums text-snow";
  const SUB = "text-[13px] text-snow/60 tabular-nums";

  return (
    <>
      <p
        aria-live="polite"
        className="mb-6 max-w-[60ch] animate-rise text-base leading-relaxed text-snow/80 [animation-delay:800ms] sm:text-xl [&_b]:font-semibold [&_b]:text-snow"
        dangerouslySetInnerHTML={{
          __html: t.plain({
            when,
            zone: zoneName,
            v: fmt(v, t.loc),
            est,
            pct,
            month: month >= 0,
            st: t.stWord[st],
            peak: t.months[pk],
          }),
        }}
      />
      <div className="mb-4 grid animate-rise grid-cols-2 gap-3 [animation-delay:850ms] lg:grid-cols-4">
        <div className={TILE}>
          <div className={LBL}>{t.hsIn(when)}</div>
          <div className={VAL}>{fmt(countV, t.loc)}</div>
          <div className={SUB}>
            {est ? `${t.range} ${fmt(lo, t.loc)}–${fmt(hi, t.loc)}` : t.viirsEq}
          </div>
          <Sparkline values={monthly} band={band} />
        </div>

        <div className={TILE}>
          <div className={LBL}>{t.t2l}</div>
          <div className={VAL}>
            {Number.isNaN(pctNum) ? "–" : `${Math.round(countP)}%`}
          </div>
          <div className={SUB}>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${PILL[st]}`}
            >
              {t.stShort[st]}
            </span>{" "}
            {t.median}: {fmt(normal, t.loc)}
          </div>
          {!Number.isNaN(pctNum) && <Gauge pct={pctNum} label={t.median} />}
        </div>

        <div className={TILE}>
          <div className={LBL}>{t.t3l}</div>
          <div className={VAL}>{t.mshort[pk]}</div>
          <div className={SUB}>
            {fmt(pv, t.loc)} · {year}
          </div>
          <MonthBars
            values={monthly}
            peak={pk}
            selected={month}
            labels={t.months}
          />
        </div>

        <div className={TILE}>
          <div className={LBL}>{t.t4l}</div>
          <div className={VAL}>{est ? t.src1 : t.src2}</div>
          <div className={SUB}>
            {est ? t.srcEst : year >= 2018 ? t.srcN20 : t.srcSnpp}
          </div>
          <SensorTimeline ds={ds} year={year} />
        </div>
      </div>
    </>
  );
}
