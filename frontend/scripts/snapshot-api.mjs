// Genera src/lib/api-snapshot.ts con datos REALES de la API del equipo de backend.
// Sirve de valor inicial (la página carga al instante) y la pantalla lo refresca en vivo.
// Uso:  node scripts/snapshot-api.mjs   (opcional: API=https://... para otra direccion)
import { writeFileSync } from "node:fs";

const API = (process.env.API || "https://calendario-fuego-1022991169828.southamerica-west1.run.app").replace(/\/+$/, "");
const get = async (p) => {
  const r = await fetch(API + p);
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
};

const COSTA = ["PE-TUM", "PE-PIU", "PE-LAM", "PE-LAL", "PE-LIM", "PE-CAL", "PE-LMA", "PE-ICA", "PE-ARE", "PE-MOQ", "PE-TAC"];
const SELVA = ["PE-LOR", "PE-UCA", "PE-SAM", "PE-MDD"];
const zoneOf = (id) => (COSTA.includes(id) ? "costa" : SELVA.includes(id) ? "selva" : "sierra");

const regions = await get("/regions");
const cals = await Promise.all(regions.map((r) => get(`/calendar?region_id=${r.id}`)));
const calib = await get("/calibration");
const validation = await get("/validation");

// Serie anual del país (2003–2025): armonizada y su rango
const pe = cals.find((c) => c.region_id === "PE");
const years = [];
for (let y = 2003; y <= 2025; y++) years.push(y);
const sum = (c, y, k) => c.months.filter((m) => m.year === y).reduce((s, m) => s + m[k], 0);
const series = {
  years,
  harmonized: years.map((y) => Math.round(sum(pe, y, "hs"))),
  low: years.map((y) => Math.round(sum(pe, y, "hs_lo"))),
  high: years.map((y) => Math.round(sum(pe, y, "hs_hi"))),
};

// Serie mensual del país (2003-01 … 2025-12): armonizada y su rango
const monthly = { harmonized: [], low: [], high: [] };
for (const m of pe.months) {
  if (m.year > 2025) continue;
  monthly.harmonized.push(Math.round(m.hs));
  monthly.low.push(Math.round(m.hs_lo));
  monthly.high.push(Math.round(m.hs_hi));
}

// Año típico por zona: media de cada mes en los años con VIIRS observado (2012–2025)
const typical = { PE: Array(12).fill(0), costa: Array(12).fill(0), sierra: Array(12).fill(0), selva: Array(12).fill(0) };
for (const c of cals) {
  if (c.region_id === "PE") continue;
  const z = zoneOf(c.region_id);
  for (let m = 1; m <= 12; m++) {
    const v = c.months.filter((x) => x.month === m && x.year >= 2012 && x.year <= 2025).map((x) => x.hs);
    const mean = v.reduce((s, x) => s + x, 0) / v.length;
    typical[z][m - 1] += mean;
    typical.PE[m - 1] += mean;
  }
}
for (const k of Object.keys(typical)) typical[k] = typical[k].map((x) => Math.round(x));

// Calibración por departamento (métrica de focos)
const fits = calib
  .filter((r) => r.metric === "hs")
  .map((r) => ({
    id: r.region_id,
    name: r.name,
    zone: zoneOf(r.region_id),
    own: r.method === "departamento",
    a: Number(r.a),
    d: Number(r.d),
    b: Number(r.b),
    smear: Number(r.smear),
    months: Number(r.n),
    high: r.high_months ? r.high_months.split(",").map(Number) : [],
    version: r.version,
  }));

const out = `/* GENERADO por scripts/snapshot-api.mjs el ${new Date().toISOString().slice(0, 10)} desde ${API}.
   Datos reales de la API del equipo de backend, usados como valor inicial antes de la lectura en vivo. No editar a mano. */
import type { ApiValidation } from "./api";

export const SNAPSHOT_DATE = ${JSON.stringify(new Date().toISOString().slice(0, 10))};

export const SNAPSHOT_SERIES = ${JSON.stringify(series)};

export const SNAPSHOT_MONTHLY = ${JSON.stringify(monthly)};

export const SNAPSHOT_TYPICAL = ${JSON.stringify(typical)} as Record<"PE" | "costa" | "sierra" | "selva", number[]>;

export const SNAPSHOT_FITS = ${JSON.stringify(fits)} as {
  id: string;
  name: string;
  zone: "costa" | "sierra" | "selva";
  own: boolean;
  a: number;
  d: number;
  b: number;
  smear: number;
  months: number;
  high: number[];
  version: string;
}[];

export const SNAPSHOT_VALIDATION = ${JSON.stringify(validation)} as ApiValidation;
`;
writeFileSync(new URL("../src/lib/api-snapshot.ts", import.meta.url), out);
console.log("ok", series.harmonized.slice(-3), typical.PE);
