/**
 * Contrato de datos de la pantalla 3.
 *
 * El frontend NO armoniza nada: recibe series mensuales YA armonizadas
 * (equivalente VIIRS) y solo las dibuja. Hoy salen de `mock-data.ts`;
 * cuando el backend esté listo, basta con que `loadFireDataset()`
 * (ver `fire-data.ts`) devuelva un objeto con esta misma forma.
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
  /**
   * Focos armonizados por semana: `WEEKS` (53) celdas por año, año a año
   * (índice = año * 53 + semana). La suma de las semanas de un mes debe dar el valor mensual de `H`.
   */
  W: number[];
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
  /** Hasta este año (incluido) los valores son estimados desde MODIS. */
  lastEstimatedYear: number;
  /** Años usados como “lo típico” (los primeros N desde startYear). */
  baselineYears: number;
  heatYear: number;
  departments: FireZone[];
  country: FireZone;
  groups: Record<ZoneGroup, FireZone>;
  heat: HeatCell[];
};
