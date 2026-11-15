import { apiGet, type ApiCalendar, type ApiHeatmap, type ApiRegion } from "@/lib/api";
import { DEPT_SHAPES, PERU_VIEWBOX } from "./geo";
import type { FireDataset, FireZone, HeatCell } from "./types";

/**
 * ÚNICO punto de entrada de datos de la pantalla 3: la API del equipo de backend.
 *
 * - `/regions` + un `/calendar?region_id=` por región (serie mensual armonizada, equivalente VIIRS).
 * - `/heatmap` del año del mapa de calor, agrupado en cuadros de 0,25°.
 *
 * Se usan los años completos 2003–2025: el 2026 aún está en curso (lo reciente se ve en la página de alertas).
 */
const START_YEAR = 2003;
const END_YEAR = 2025;
const YEAR_COUNT = END_YEAR - START_YEAR + 1;
const N = YEAR_COUNT * 12;
const HEAT_YEAR = 2024;
const STEP = 5; // 0,25° en unidades del mapa (grados × 20)

function toZone(cal: ApiCalendar, area: number): FireZone {
  const H = new Array<number>(N).fill(0);
  const LO = new Array<number>(N).fill(0);
  const HI = new Array<number>(N).fill(0);
  const EST = new Array<boolean>(N).fill(false);
  for (const m of cal.months) {
    if (m.year < START_YEAR || m.year > END_YEAR) continue;
    const t = (m.year - START_YEAR) * 12 + (m.month - 1);
    H[t] = m.hs;
    LO[t] = m.hs_lo;
    HI[t] = m.hs_hi;
    EST[t] = m.source === "MODIS_ADJ";
  }
  return { id: cal.region_id, name: cal.name, area, H, LO, HI, EST };
}

/** Los puntos de 0,02° de la API se agrupan en los cuadros de 0,25° del mapa. */
function toHeat(h: ApiHeatmap): HeatCell[] {
  const bins = new Map<string, HeatCell>();
  for (const f of h.features) {
    const [lon, lat] = f.geometry.coordinates;
    const sx = lon * 20,
      sy = -lat * 20;
    const x = Math.floor((sx - PERU_VIEWBOX.x) / STEP) * STEP + PERU_VIEWBOX.x;
    const y = Math.floor((sy - PERU_VIEWBOX.y) / STEP) * STEP + PERU_VIEWBOX.y;
    const key = `${x}|${y}`;
    const c = bins.get(key);
    if (c) c.count += f.properties.hs;
    else bins.set(key, { x, y, count: f.properties.hs });
  }
  return [...bins.values()].map((c) => ({ ...c, count: Math.round(c.count) }));
}

export async function loadFireDataset(signal?: AbortSignal): Promise<FireDataset> {
  const [regions, heat] = await Promise.all([
    apiGet<ApiRegion[]>("/regions", undefined, signal),
    apiGet<ApiHeatmap>("/heatmap", { start: `${HEAT_YEAR}-01-01`, end: `${HEAT_YEAR}-12-31` }, signal),
  ]);
  const cals = await Promise.all(regions.map((r) => apiGet<ApiCalendar>("/calendar", { region_id: r.id }, signal)));
  const areaOf = new Map(DEPT_SHAPES.map((s) => [s.id, s.area]));
  const zones = cals.map((c) => toZone(c, areaOf.get(c.region_id) ?? 0));
  const country = zones.find((z) => z.id === "PE");
  if (!country) throw new Error("La API no devolvió el total del país (PE).");
  const departments = zones.filter((z) => z.id !== "PE");
  country.area = departments.reduce((s, d) => s + d.area, 0);
  return {
    startYear: START_YEAR,
    yearCount: YEAR_COUNT,
    lastEstimatedYear: 2011,
    baselineYears: 20, // 2003–2022: la misma base que usa la API para sus percentiles
    heatYear: HEAT_YEAR,
    departments,
    country,
    heat: toHeat(heat),
  };
}
