"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FIRST_VIIRS_YEAR, SATELLITE_MARKS, SERIES } from "./data";

const nf = new Intl.NumberFormat("es");
const fmt = (n: number) => nf.format(Math.round(n));
const fmt1 = (n: number) =>
  n.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Paso "bonito" para los ejes (1, 2, 2.5, 5 × 10^n). */
function niceStep(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export default function HarmonizeChart() {
  const sliderId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(FIRST_VIIRS_YEAR);

  // ancho real del contenedor → el SVG se dibuja en píxeles reales (texto legible en móvil)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.max(300, Math.min(1000, Math.round(e.contentRect.width)))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const W = width;
  const H = narrow ? 290 : 360;
  const PAD = { l: narrow ? 44 : 60, r: 24, t: 34, b: 32 };

  const { years, raw, harmonized, low, high } = SERIES;
  const n = years.length;
  const p = pct / 100;

  const top = Math.max(...raw, ...high);
  const step = niceStep(top / 4);
  const ticks = Math.ceil(top / step);
  const yMax = step * ticks;
  const x = (yr: number) =>
    PAD.l + ((W - PAD.l - PAD.r) * (yr - years[0])) / (years[n - 1] - years[0]);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / yMax);

  const vals = raw.map((r, i) => r * (1 - p) + harmonized[i] * p);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${x(years[i])},${y(v)}`).join("");
  const band =
    high.map((v, i) => `${i ? "L" : "M"}${x(years[i])},${y(v)}`).join("") +
    [...low]
      .map((v, i) => `L${x(years[i])},${y(v)}`)
      .reverse()
      .join("") +
    "Z";

  const i11 = years.indexOf(FIRST_VIIRS_YEAR - 1);
  const i12 = i11 + 1;
  const jump = vals[i12] / vals[i11];
  const jumpRaw = raw[i12] / raw[i11];
  const jumpHarm = harmonized[i12] / harmonized[i11];

  const lineColor = `color-mix(in oklab, var(--navy) ${pct}%, var(--slate))`;
  const ai = years.indexOf(active);
  const stepNow = pct <= 15 ? 0 : pct >= 85 ? 2 : 1;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") setActive((a) => Math.max(years[0], a - 1));
    else if (e.key === "ArrowRight") setActive((a) => Math.min(years[n - 1], a + 1));
    else return;
    e.preventDefault();
  }
  function onPointer(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    setActive(years[Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))))]);
  }

  // anotación sobre el punto de 2012
  const ax = x(years[i12]);
  const ay = y(vals[i12]);
  const noteText =
    stepNow === 0 ? `Entra VIIRS: salto ×${fmt1(jump)}` : stepNow === 2 ? `Sin salto: ×${fmt1(jump)}` : "";
  const noteW = noteText.length * 7.2 + 20;
  const noteX = Math.min(Math.max(ax - noteW / 2, PAD.l), W - PAD.r - noteW);
  const noteY = Math.max(ay - 54, PAD.t + 18);

  return (
    <div className="rounded-3xl border border-slate/15 bg-snow p-6 shadow-sm backdrop-blur-md sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
        {/* Consola: controles */}
        <aside className="flex flex-col gap-6">
      <div role="group" aria-label="Qué datos ver" className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {[
            { pct: 0, label: "Como llegan", hint: "La suma de los dos satélites" },
            { pct: 100, label: "Corregidos", hint: "Todo en una sola escala" },
          ].map((s) => {
            const on = pct === s.pct;
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={on}
                onClick={() => setPct(s.pct)}
                className={`rounded-2xl border px-5 py-4 text-left backdrop-blur-md transition-colors duration-300 ${
                  on ? "border-navy/70 bg-navy/10" : "border-slate/25 hover:border-slate/60"
                }`}
              >
                <span className={`block text-lg font-semibold ${on ? "text-navy" : "text-navy/75"}`}>{s.label}</span>
                <span className="block text-sm text-slate">{s.hint}</span>
              </button>
            );
          })}
        </div>


          <div className="rounded-2xl bg-navy p-5 text-[#0C090A]">
          <p className="text-sm text-[#0C090A]/75">Salto de 2011 a 2012</p>
          <p className="font-heading text-5xl font-bold leading-none" aria-live="polite">
            ×{fmt1(jump)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#0C090A]/85" aria-live="polite">
            {stepNow === 0 && (
              <>Sumados tal cual, el conteo se multiplica por {fmt1(jumpRaw)}. Buena parte de ese salto no es fuego nuevo: entró un satélite que detecta más.</>
            )}
            {stepNow === 1 && <>Convirtiendo… {pct}%. Mira cómo baja el salto.</>}
            {stepNow === 2 && (
              <>Ya en una sola escala, el salto se reduce a ×{fmt1(jumpHarm)}.</>
            )}
          </p>
        </div>

      <div className="flex items-center gap-3">
        <label htmlFor={sliderId} className="text-sm font-medium text-slate">
          Transición
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(+e.target.value)}
          className="h-7 min-w-0 flex-1 accent-(--accent)"
        />
        <span className="w-12 text-right text-sm font-medium text-navy">{pct}%</span>
      </div>
        </aside>

        {/* Visor */}
        <div className="min-w-0">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0 w-6 border-t-2 border-dashed border-slate" />
          Satélites sumados
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-1 w-6 rounded bg-navy" />
          Serie armonizada
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full border-2 border-navy bg-snow" />
          Año estimado (con rango)
        </li>
      </ul>

      <div
        ref={box}
        tabIndex={0}
        onKeyDown={onKey}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        aria-label="Focos de calor por año en el Perú. Usa las flechas izquierda y derecha para recorrer los años."
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Gráfico de líneas: focos de calor por año en el Perú, de 2003 a 2025, con los satélites sumados o armonizados según el paso elegido."
          className="block max-w-full"
        >
          <g className="fill-slate" fontSize={narrow ? 11 : 13}>
            {Array.from({ length: ticks + 1 }, (_, k) => {
              const v = step * k;
              return (
                <g key={k}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-slate/20" />
                  <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
                    {v === 0 ? "0" : narrow ? `${Math.round(v / 1000)}k` : `${Math.round(v / 1000)} mil`}
                  </text>
                </g>
              );
            })}
            {years.map((yr, i) =>
              i % (narrow ? 4 : 2) === 0 ? (
                <text key={yr} x={x(yr)} y={H - 10} textAnchor="middle">
                  {yr}
                </text>
              ) : null,
            )}
          </g>

          {/* zona estimada */}
          <g opacity={p}>
            <rect
              x={x(years[0])}
              y={PAD.t - 6}
              width={x(FIRST_VIIRS_YEAR - 0.5) - x(years[0])}
              height={H - PAD.t - PAD.b + 6}
              className="fill-navy/5"
            />
            <text x={x(years[0]) + 6} y={PAD.t + 6} className="fill-slate" fontSize={narrow ? 10 : 12}>
              Años estimados desde MODIS
            </text>
          </g>

          {/* hitos de satélites */}
          {SATELLITE_MARKS.map((m) => (
            <g key={m.label}>
              <line x1={x(m.year)} x2={x(m.year)} y1={PAD.t} y2={H - PAD.b} className="stroke-slate" strokeDasharray="3 4" />
              <text x={x(m.year) + 5} y={H - PAD.b - 6} className="fill-slate" fontSize={narrow ? 10 : 12}>
                {m.label}
              </text>
            </g>
          ))}

          <path d={band} className="fill-navy" opacity={p * 0.14} />
          <path d={path(raw)} fill="none" className="stroke-slate" strokeWidth={1.5} strokeDasharray="5 5" opacity={p * 0.7} />
          <path d={path(vals)} fill="none" strokeWidth={3.5} strokeLinejoin="round" style={{ stroke: lineColor }} />
          {vals.map((v, i) => {
            const est = years[i] < FIRST_VIIRS_YEAR && p > 0.5;
            return (
              <circle
                key={years[i]}
                cx={x(years[i])}
                cy={y(v)}
                r={years[i] === active ? 6.5 : narrow ? 3.5 : 4.5}
                strokeWidth={2}
                style={{ stroke: lineColor, fill: est ? "var(--snow)" : lineColor }}
              />
            );
          })}

          {/* anotación del salto */}
          {noteText && (
            <g>
              <line x1={ax} x2={ax} y1={noteY + 26} y2={ay - 8} className="stroke-(--accent)" strokeWidth={1.5} />
              <rect x={noteX} y={noteY} width={noteW} height={26} rx={13} className="fill-(--accent)" />
              <text x={noteX + noteW / 2} y={noteY + 17.5} textAnchor="middle" className="fill-[#0C090A]" fontSize={narrow ? 11 : 13} fontWeight={600}>
                {noteText}
              </text>
            </g>
          )}

          <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={H - PAD.b} className="stroke-navy" opacity={0.3} />
          <rect
            x={PAD.l}
            y={PAD.t}
            width={W - PAD.l - PAD.r}
            height={H - PAD.t - PAD.b}
            fill="transparent"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
          />
        </svg>
      </div>


          <p className="mt-4 text-sm text-slate">
            Cada punto es un año. La línea punteada es lo que cuentan los satélites sumados; la sólida,
            la serie corregida, donde los años sí se pueden comparar.
          </p>
          <div className="mt-4">
            <div className="rounded-2xl bg-(--mist) p-5">
          <p className="text-sm text-slate">Pasa el cursor por el gráfico, o usa las flechas ← →</p>
          <p className="mt-1 font-heading text-2xl font-bold text-navy">{years[ai]}</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate">Sumados</dt>
              <dd className="text-lg font-semibold text-ink">{fmt(raw[ai])}</dd>
            </div>
            <div>
              <dt className="text-slate">Armonizados</dt>
              <dd className="text-lg font-semibold text-ink">{fmt(harmonized[ai])}</dd>
            </div>
          </dl>
          {years[ai] < FIRST_VIIRS_YEAR && (
            <p className="mt-2 text-sm text-slate">
              <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy">Estimado</span>{" "}
              Rango probable: {fmt(low[ai])} – {fmt(high[ai])}
            </p>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
