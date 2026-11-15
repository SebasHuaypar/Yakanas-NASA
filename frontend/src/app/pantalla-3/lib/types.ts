/**
 * Contrato de datos de la pantalla 3.
 *
 * El frontend NO armoniza nada: recibe series mensuales YA armonizadas
 * (equivalente VIIRS, 375 m) de la API del equipo de backend y solo las dibuja.
 * La conversión vive en `fire-data.ts` (API → `FireDataset`).
 */

export type Lang = "es" | "en";

export type ZoneGroup = "costa" | "sierra" | "selva";

/** Un departamento, un grupo (costa/sierra/selva) o todo el Perú. */
export type FireZone = {
  /** "PE" = todo el Perú, "PE-CUS" = Cusco, etc. */
  id: string;
  /** Nombre en la fuente (el de Lima Metropolitana se traduce en la UI). */
  name: string;
  group?: ZoneGroup;
  /** km², para calcular focos por 1 000 km². */
  area: number;
  /** Focos armonizados por mes, enero del año de inicio en adelante. */
  H: number[];
  /** true si ese mes es estimado desde MODIS (antes de VIIRS); false si es VIIRS observado. */
  EST: boolean[];
  /** Rango bajo (p10) de la estimación; igual a H cuando no es estimado. */
  LO: number[];
  /** Rango alto (p90) de la estimación; igual a H cuando no es estimado. */
  HI: number[];
};

/** Un cuadro del mapa de calor (coordenadas del mapa SVG). */
export type HeatCell = { x: number; y: number; count: number };

export type FireDataset = {
  startYear: number;
  yearCount: number;
  /** Hasta este año (incluido) los valores son estimados desde MODIS (cada mes trae además su propia marca `EST`). */
  lastEstimatedYear: number;
  /** Años usados como “lo típico” (los primeros N desde startYear). */
  baselineYears: number;
  heatYear: number;
  departments: FireZone[];
  country: FireZone;
  heat: HeatCell[];
};
