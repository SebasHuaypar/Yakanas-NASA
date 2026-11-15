import { DEPT_SHAPES, pointInRings, seeded, PERU_VIEWBOX } from "./geo";
import { MONTH_WEEKS, WEEKS } from "./calendar-weeks";
import type { FireDataset, FireZone, HeatCell, ZoneGroup } from "./types";

/**
 * DATOS SIMULADOS (solo para diseñar la interfaz).
 * Se reemplazan por la salida real del backend; ver `fire-data.ts`.
 */

const START_YEAR = 2003;
const YEAR_COUNT = 23; // 2003–2025
const N = YEAR_COUNT * 12;

const GROUP_OF: Record<string, ZoneGroup> = {};
for (const id of ["PE-TUM", "PE-PIU", "PE-LAM", "PE-LAL", "PE-LIM", "PE-CAL", "PE-LMA", "PE-ICA", "PE-ARE", "PE-MOQ", "PE-TAC"])
  GROUP_OF[id] = "costa";
for (const id of ["PE-LOR", "PE-UCA", "PE-SAM", "PE-MDD"]) GROUP_OF[id] = "selva";

/** Estacionalidad típica de cada grupo (enero → diciembre). */
const SEASON: Record<ZoneGroup, number[]> = {
  costa: [0.7, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.3, 1.5, 1.4, 0.9],
  sierra: [0.1, 0.05, 0.05, 0.1, 0.2, 0.5, 1.2, 2.2, 2.6, 2, 0.8, 0.2],
  selva: [0.15, 0.08, 0.05, 0.1, 0.2, 0.7, 1.6, 3.2, 3.6, 1.6, 0.4, 0.2],
};

/** Escala mensual media por departamento. */
const SCALE: Record<string, number> = {
  "PE-TUM": 6, "PE-PIU": 22, "PE-LAM": 16, "PE-LAL": 24, "PE-LIM": 10, "PE-CAL": 0.3, "PE-LMA": 0.4,
  "PE-ICA": 3, "PE-ARE": 8, "PE-MOQ": 2.5, "PE-TAC": 1.5,
  "PE-PUN": 18, "PE-CAJ": 16, "PE-AMA": 14, "PE-ANC": 10, "PE-HUC": 90, "PE-PAS": 45, "PE-JUN": 55,
  "PE-HUV": 7, "PE-CUS": 60, "PE-APU": 10, "PE-AYA": 14,
  "PE-SAM": 220, "PE-UCA": 230, "PE-MDD": 130, "PE-LOR": 120,
};

/** Años “malos” de fuego (efecto sobre todo el país). */
const BAD_YEARS: Record<number, number> = { 2005: 1.5, 2007: 1.3, 2010: 1.9, 2012: 1.4, 2016: 1.8, 2019: 1.6, 2024: 2.2 };

const ZERO = () => new Array<number>(N).fill(0);

const ZERO_W = () => new Array<number>(YEAR_COUNT * WEEKS).fill(0);

/** Reparte cada mes entre sus semanas (la suma de las semanas es el valor del mes). */
function weeklyFromMonthly(H: number[], rnd: () => number): number[] {
  const W = ZERO_W();
  for (let y = 0; y < YEAR_COUNT; y++)
    for (let m = 0; m < 12; m++) {
      const ks = MONTH_WEEKS[m];
      const w = ks.map(() => 0.45 + 1.1 * rnd());
      const tot = w.reduce((a, b) => a + b, 0);
      ks.forEach((k, i) => (W[y * WEEKS + k] = (H[y * 12 + m] * w[i]) / tot));
    }
  return W;
}

function sumZones(id: string, name: string, list: FireZone[], group?: ZoneGroup): FireZone {
  const z: FireZone = { id, name, group, area: 0, H: ZERO(), W: ZERO_W(), LO: ZERO(), HI: ZERO() };
  for (const d of list) {
    z.area += d.area;
    for (let t = 0; t < N; t++) {
      z.H[t] += d.H[t];
      z.LO[t] += d.LO[t];
      z.HI[t] += d.HI[t];
    }
    for (let i = 0; i < z.W.length; i++) z.W[i] += d.W[i];
  }
  return z;
}

export function buildMockDataset(): FireDataset {
  const departments: FireZone[] = DEPT_SHAPES.map((shape) => {
    const group = GROUP_OF[shape.id] ?? "sierra";
    const rnd = seeded(shape.id);
    const k = SCALE[shape.id] ?? 10;
    const H = ZERO(),
      LO = ZERO(),
      HI = ZERO();
    for (let y = 0; y < YEAR_COUNT; y++) {
      const year = START_YEAR + y;
      const yf = (1 + 0.012 * y) * (BAD_YEARS[year] ?? 1) * (0.8 + 0.4 * rnd());
      for (let m = 0; m < 12; m++) {
        const noise = 0.55 + 0.9 * rnd() * rnd() * 1.4;
        const v = Math.max(0, Math.round(k * SEASON[group][m] * yf * noise));
        const t = y * 12 + m;
        const est = year <= 2011;
        H[t] = v;
        LO[t] = est ? Math.round(v * 0.8) : v;
        HI[t] = est ? Math.round(v * 1.28) : v;
      }
    }
    return { id: shape.id, name: shape.name, group, area: shape.area, H, W: weeklyFromMonthly(H, rnd), LO, HI };
  });

  const country = sumZones("PE", "Perú", departments);
  const groups = {
    costa: sumZones("costa", "Costa", departments.filter((d) => d.group === "costa"), "costa"),
    sierra: sumZones("sierra", "Sierra", departments.filter((d) => d.group === "sierra"), "sierra"),
    selva: sumZones("selva", "Selva", departments.filter((d) => d.group === "selva"), "selva"),
  };

  return {
    startYear: START_YEAR,
    yearCount: YEAR_COUNT,
    lastEstimatedYear: 2011,
    baselineYears: 20,
    heatYear: 2024,
    departments,
    country,
    groups,
    heat: buildHeat(departments),
  };
}

/** Cuadros de ~0,25° repartidos dentro de cada departamento según su fuego de 2024. */
function buildHeat(departments: FireZone[]): HeatCell[] {
  const STEP = 5;
  const rnd = seeded("heat");
  const byDept = new Map<string, { x: number; y: number }[]>();
  for (const s of DEPT_SHAPES) {
    const cells: { x: number; y: number }[] = [];
    const { x0, y0, x1, y1 } = s.bbox;
    for (let x = Math.floor((x0 - PERU_VIEWBOX.x) / STEP) * STEP + PERU_VIEWBOX.x; x < x1; x += STEP)
      for (let y = Math.floor((y0 - PERU_VIEWBOX.y) / STEP) * STEP + PERU_VIEWBOX.y; y < y1; y += STEP)
        if (pointInRings(x + STEP / 2, y + STEP / 2, s.rings) && rnd() > 0.45) cells.push({ x, y });
    byDept.set(s.id, cells);
  }
  const out: HeatCell[] = [];
  for (const d of departments) {
    const cells = byDept.get(d.id) ?? [];
    if (!cells.length) continue;
    const year = (2024 - START_YEAR) * 12;
    let total = 0;
    for (let m = 0; m < 12; m++) total += d.H[year + m];
    const mean = total / cells.length;
    for (const c of cells) out.push({ ...c, count: Math.max(1, Math.round(mean * (0.15 + 2.2 * rnd() * rnd()))) });
  }
  return out;
}
