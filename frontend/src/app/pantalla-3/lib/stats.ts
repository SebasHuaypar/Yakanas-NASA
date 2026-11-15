import { WEEKS } from "./calendar-weeks";
import type { FireDataset, FireZone } from "./types";

/** Cálculos de PRESENTACIÓN (percentiles, totales, colores). No armoniza datos. */

export type Status = "high" | "low" | "normal";
export type Clim = { med: number; p25: number; p75: number; mean: number };

export function quant(arr: number[], q: number) {
  const a = [...arr].sort((x, y) => x - y);
  if (!a.length) return 0;
  const p = (a.length - 1) * q,
    i = Math.floor(p);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i);
}

export function annualTotals(z: FireZone, ds: FireDataset) {
  return Array.from({ length: ds.yearCount }, (_, y) => {
    let s = 0;
    for (let m = 0; m < 12; m++) s += z.H[y * 12 + m];
    return s;
  });
}

/** Lo típico de cada mes (años de referencia). */
export function climatology(z: FireZone, ds: FireDataset): Clim[] {
  return Array.from({ length: 12 }, (_, m) => {
    const v: number[] = [];
    for (let y = 0; y < ds.baselineYears; y++) v.push(z.H[y * 12 + m]);
    return {
      med: quant(v, 0.5),
      p25: quant(v, 0.25),
      p75: quant(v, 0.75),
      mean: v.reduce((s, x) => s + x, 0) / v.length,
    };
  });
}

export function statusOf(v: number, c: Clim): Status {
  return v > c.p75 && v > 0 ? "high" : v < c.p25 ? "low" : "normal";
}

/** Focos de un mes (month 0-11) o de todo el año (month -1). */
export function periodValue(z: FireZone, ds: FireDataset, year: number, month: number) {
  const y = year - ds.startYear;
  if (month >= 0) return z.H[y * 12 + month];
  let s = 0;
  for (let m = 0; m < 12; m++) s += z.H[y * 12 + m];
  return s;
}

/* ---------- colores del CALENDARIO (copiados de hotspots-cusco; no se usan fuera del calendario) ---------- */

export const CAL_RAMP = ["#2d3132", "#5a2a1c", "#a3321c", "#ec5b2b", "#ffb347", "#fff0a8"];
export const CAL_ANOM_BINS: [number, string][] = [
  [0.5, "#323737"],
  [0.8, "#5e3a2f"],
  [0.9, "#a5502e"],
  [0.95, "#e0702a"],
  [0.99, "#ff9d2e"],
  [1.01, "#ffe08a"],
];
export const CAL_GRADIENT = "linear-gradient(90deg,#5a2a1c,#a3321c,#ec5b2b,#ffb347,#fff0a8)";

/** Modo "cuántos": 5 tramos de la rampa según la raíz de v / vmax. */
export function calColor(v: number, vmax: number) {
  if (v <= 0 || vmax <= 0) return CAL_RAMP[0];
  return CAL_RAMP[Math.min(CAL_RAMP.length - 1, 1 + Math.floor(Math.sqrt(Math.min(1, v / vmax)) * (CAL_RAMP.length - 1.0001)))];
}

/** Modo "¿inusual?": color según el percentil (0..1) del mes frente al mismo mes de los años de referencia. */
export function anomColor(p: number) {
  if (Number.isNaN(p)) return CAL_RAMP[0];
  for (const [lim, col] of CAL_ANOM_BINS) if (p < lim) return col;
  return CAL_ANOM_BINS[CAL_ANOM_BINS.length - 1][1];
}

/** Cuadros del mapa de calor sobre el relieve: de slate claro a navy e ink. */
export function heatColor(f: number) {
  const x = Math.min(1, Math.max(0, f));
  const a: [number, number, number] = x < 0.5 ? [127, 154, 173] : [40, 58, 84];
  const b: [number, number, number] = x < 0.5 ? [40, 58, 84] : [12, 9, 10];
  const t = x < 0.5 ? x / 0.5 : (x - 0.5) / 0.5;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

/** Valores de la semana `k` en los años de referencia (para el valor típico y el percentil). */
function baselineWeek(z: FireZone, ds: FireDataset, k: number) {
  const v: number[] = [];
  for (let y = 0; y < ds.baselineYears; y++) v.push(z.W[y * WEEKS + k]);
  return v;
}

export function weekMedian(z: FireZone, ds: FireDataset, k: number) {
  return quant(baselineWeek(z, ds, k), 0.5);
}

/** Percentil (0..1) de `v` frente a la misma semana de los años de referencia. */
export function weekPercentile(z: FireZone, ds: FireDataset, k: number, v: number) {
  const b = baselineWeek(z, ds, k);
  let below = 0,
    equal = 0;
  for (const x of b) {
    if (x < v) below++;
    else if (x === v) equal++;
  }
  return (below + equal / 2) / b.length;
}
