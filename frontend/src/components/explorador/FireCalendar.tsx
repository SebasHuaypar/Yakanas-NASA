"use client";

import { memo, useMemo, useState } from "react";
import {
  annualTotals,
  anomColor,
  CAL_ANOM_BINS,
  CAL_GRADIENT,
  calColor,
  monthPercentile,
  quant,
} from "@/app/explorador/lib/stats";
import { fmt } from "@/app/explorador/lib/ui";
import type { FireDataset, FireZone } from "@/app/explorador/lib/types";
import type { Texts } from "@/app/explorador/lib/i18n";
import type { TooltipApi } from "./Tooltip";

export type CalMode = "n" | "a";

/* Calendario: un renglón por año y una celda por MES (12 por fila), con el valor dentro de la celda,
   bandas de mes alternas, cruz de lectura al pasar el cursor, año elegido resaltado y total anual a la
   derecha. Los meses estimados desde MODIS llevan borde claro. Los datos son los de la API (mensuales). */
const COLS = 12;
const LEFT = 46,
  RIGHT = 132,
  TOP = 24,
  ROW_H = 20,
  GAP = 1.5,
  W = 860;

/** Misma tipografía del resto de la pantalla (Inter del proyecto). */
const FONT = {
  fontFamily: "var(--font-inter), system-ui, sans-serif",
} as const;

type Hover = { yi: number; k: number } | null;

const compact = (v: number) =>
  v >= 10000
    ? `${Math.round(v / 1000)}k`
    : v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : String(Math.round(v));

function FireCalendar({
  zone,
  ds,
  t,
  year,
  month,
  mode,
  onPick,
  tooltip,
}: {
  zone: FireZone;
  ds: FireDataset;
  t: Texts;
  year: number;
  month: number;
  mode: CalMode;
  onPick: (year: number, month: number) => void;
  tooltip: TooltipApi;
}) {
  const [hover, setHover] = useState<Hover>(null);
  const rows = ds.yearCount;
  const cw = (W - LEFT - RIGHT) / COLS;
  const H = TOP + rows * ROW_H + 8;
  const selYi = year - ds.startYear;
  const yearly = useMemo(() => annualTotals(zone, ds), [zone, ds]);
  const yMax = Math.max(1, ...yearly);

  // Color de cada mes: calculado una vez por región.
  const fills = useMemo(() => {
    const pos = zone.H.filter((v) => v > 0);
    const vmax = pos.length ? quant(pos, 0.97) || 1 : 1; // percentil 97 como tope de la escala
    return zone.H.map((v, i) =>
      mode === "n"
        ? calColor(v, vmax)
        : anomColor(monthPercentile(zone, ds, i % 12, v)),
    );
  }, [zone, ds, mode]);

  // Celdas, barras y totales: se calculan una vez (no dependen del cursor ni del año elegido).
  const grid = useMemo(
    () => (
      <>
        {Array.from({ length: rows }, (_, yi) => {
          const yr = ds.startYear + yi,
            y0 = TOP + yi * ROW_H;
          return (
            <g key={yr} style={FONT}>
              {Array.from({ length: COLS }, (_, k) => {
                const v = zone.H[yi * 12 + k];
                const light =
                  fills[yi * 12 + k] === "#fff0a8" ||
                  fills[yi * 12 + k] === "#ffe08a" ||
                  fills[yi * 12 + k] === "#ffb347" ||
                  fills[yi * 12 + k] === "#ff9d2e";
                return (
                  <g key={k}>
                    <rect
                      x={LEFT + k * cw + GAP / 2}
                      y={y0 + 1}
                      width={cw - GAP}
                      height={ROW_H - 3}
                      rx={3}
                      fill={fills[yi * 12 + k]}
                      stroke={zone.EST[yi * 12 + k] ? "#fff" : "none"}
                      strokeOpacity={0.35}
                      strokeDasharray={
                        zone.EST[yi * 12 + k] ? "3 2" : undefined
                      }
                      strokeWidth={0.8}
                    />
                    {cw > 40 && (
                      <text
                        x={LEFT + k * cw + cw / 2}
                        y={y0 + ROW_H / 2 + 3}
                        textAnchor="middle"
                        fontSize={9}
                        fill={light ? "#0c090a" : "rgb(243 249 252 / 0.85)"}
                        pointerEvents="none"
                      >
                        {compact(v)}
                      </text>
                    )}
                  </g>
                );
              })}
              <rect
                x={W - RIGHT + 14}
                y={y0 + 4}
                width={Math.max(
                  yearly[yi] > 0 ? 2 : 0,
                  (36 * yearly[yi]) / yMax,
                )}
                height={ROW_H - 8}
                rx={3}
                fill="rgb(243 249 252 / 0.5)"
              />
              <text
                x={W - 4}
                y={y0 + ROW_H / 2 + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="rgb(243 249 252 / 0.6)"
              >
                {fmt(yearly[yi], t.loc)}
              </text>
            </g>
          );
        })}
      </>
    ),
    [rows, ds, cw, fills, yearly, yMax, t.loc, zone],
  );

  const cellAt = (e: React.MouseEvent<SVGElement>): Hover => {
    const b = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const x = ((e.clientX - b.left) * W) / b.width - LEFT,
      y = ((e.clientY - b.top) * H) / b.height - TOP;
    const yi = Math.floor(y / ROW_H),
      k = Math.floor(x / cw);
    return yi < 0 || yi >= rows || k < 0 || k >= COLS ? null : { yi, k };
  };

  const tipFor = (h: NonNullable<Hover>) => {
    const yr = ds.startYear + h.yi,
      i = h.yi * 12 + h.k,
      est = zone.EST[i],
      v = zone.H[i],
      p = monthPercentile(zone, ds, h.k, v);
    const clim = Array.from(
      { length: ds.baselineYears },
      (_, y) => zone.H[y * 12 + h.k],
    );
    return t.tipCal({
      m: t.months[h.k],
      y: yr,
      est,
      v: fmt(v, t.loc),
      r: est
        ? ` (${t.range} ${fmt(zone.LO[i], t.loc)}–${fmt(zone.HI[i], t.loc)})`
        : "",
      med: fmt(quant(clim, 0.5), t.loc),
      st: t.stShort[p > 0.75 ? "high" : p < 0.25 ? "low" : "normal"],
      hs: t.hsWord,
      typical: t.median,
    });
  };

  // Teclado: ← → cambian de mes, ↑ ↓ de año.
  const onKey = (e: React.KeyboardEvent) => {
    let y = year,
      m = month < 0 ? 0 : month;
    if (e.key === "ArrowRight") m++;
    else if (e.key === "ArrowLeft") m--;
    else if (e.key === "ArrowDown") y++;
    else if (e.key === "ArrowUp") y--;
    else return;
    e.preventDefault();
    if (m > 11) {
      m = 0;
      y++;
    }
    if (m < 0) {
      m = 11;
      y--;
    }
    if (y < ds.startYear || y > ds.startYear + rows - 1) return;
    onPick(y, m);
  };

  const MUTED = "rgb(243 249 252 / 0.6)",
    ACCENT = "#f3f9fc";

  return (
    <div className="rounded-2xl border border-snow/10 bg-ink/60 p-3 sm:p-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          tabIndex={0}
          aria-label={`${t.calTitle}. ${t.calHow}`}
          onKeyDown={onKey}
          className="block h-auto w-full min-w-190 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <g
            fontSize={10.5}
            fill={MUTED}
            style={{
              ...FONT,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            {/* bandas de mes alternas + etiquetas */}
            {t.mshort.map((label, m) => {
              const x0 = LEFT + m * cw,
                x1 = x0 + cw;
              return (
                <g key={m}>
                  {m % 2 === 1 && (
                    <rect
                      x={x0}
                      y={TOP - 4}
                      width={x1 - x0}
                      height={rows * ROW_H + 6}
                      fill="#fff"
                      fillOpacity={0.03}
                    />
                  )}
                  <text x={(x0 + x1) / 2} y={12} textAnchor="middle">
                    {label}
                  </text>
                </g>
              );
            })}
            <text x={W - 4} y={12} textAnchor="end">
              {t.annual}
            </text>
          </g>

          {/* año elegido */}
          <rect
            x={0}
            y={TOP + selYi * ROW_H - 1}
            width={W}
            height={ROW_H}
            fill="#fff"
            fillOpacity={0.04}
          />

          {grid}
          {/* etiquetas de año (dependen del año elegido) */}
          <g fontSize={11} style={FONT}>
            {Array.from({ length: rows }, (_, yi) => (
              <text
                key={yi}
                x={4}
                y={TOP + yi * ROW_H + ROW_H / 2 + 4}
                fontWeight={yi === selYi ? 700 : 400}
                fill={yi === selYi ? ACCENT : MUTED}
              >
                {ds.startYear + yi}
                {ds.startYear + yi <= ds.lastEstimatedYear ? "*" : ""}
              </text>
            ))}
          </g>

          {/* cruz de lectura + semana bajo el cursor */}
          {hover && (
            <g pointerEvents="none">
              <rect
                x={LEFT + hover.k * cw}
                y={TOP - 4}
                width={cw}
                height={rows * ROW_H + 6}
                fill="#fff"
                fillOpacity={0.05}
              />
              <rect
                x={LEFT}
                y={TOP + hover.yi * ROW_H}
                width={COLS * cw}
                height={ROW_H}
                fill="#fff"
                fillOpacity={0.05}
              />
              <rect
                x={LEFT + hover.k * cw + GAP / 2}
                y={TOP + hover.yi * ROW_H + 1}
                width={cw - GAP}
                height={ROW_H - 3}
                rx={3}
                fill="#fff"
                fillOpacity={0.3}
              />
            </g>
          )}
          {/* mes elegido: su celda en el renglón del año */}
          {month >= 0 && (
            <rect
              x={LEFT + month * cw + GAP / 2}
              y={TOP + selYi * ROW_H + 1}
              width={cw - GAP}
              height={ROW_H - 3}
              rx={4}
              fill="none"
              stroke="#fff"
              strokeWidth={1.6}
              pointerEvents="none"
            />
          )}

          {/* una sola capa de captura de ratón (en vez de un manejador por celda) */}
          <rect
            x={LEFT}
            y={TOP}
            width={COLS * cw}
            height={rows * ROW_H}
            fill="transparent"
            className="cursor-pointer"
            onMouseMove={(e) => {
              const h = cellAt(e);
              setHover((prev) =>
                prev?.yi === h?.yi && prev?.k === h?.k ? prev : h,
              ); // solo repinta al cambiar de celda
              if (h) tooltip.show(e, tipFor(h));
              else tooltip.hide();
            }}
            onMouseLeave={() => {
              setHover(null);
              tooltip.hide();
            }}
            onClick={(e) => {
              const h = cellAt(e);
              if (h) onPick(ds.startYear + h.yi, h.k);
            }}
          />
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-snow/60">
        {mode === "n" ? (
          <>
            <span>{t.calScaleN}</span>
            <span>0</span>
            <span
              className="inline-block h-2.5 w-30 rounded-md"
              style={{ background: CAL_GRADIENT }}
            />
            <span>{t.calHigh}</span>
          </>
        ) : (
          <>
            <span>{t.calPercentile}</span>
            {CAL_ANOM_BINS.map(([, col], i) => (
              <span key={col} className="inline-flex items-center gap-1">
                <i
                  className="inline-block h-2.5 w-2.5 rounded"
                  style={{ background: col }}
                />
                {["<50", "50–80", "80–90", "90–95", "95–99", "≥99"][i]}
              </span>
            ))}
          </>
        )}
      </div>
      <p className="mt-1.5 text-xs text-snow/50">{t.calNote}</p>
    </div>
  );
}

export default memo(FireCalendar);
