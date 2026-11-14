/**
 * DATOS DE PRUEBA (falsos).
 * Cuando el backend tenga lista la API, estos valores se reemplazan por la
 * respuesta real. Mantener las mismas formas (tipos) para que el cambio sea
 * solo cambiar el origen de los datos.
 */

export const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export const MONTHS_ES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Oct",
  "Nov",
  "Dic",
] as const;

/** Focos de calor promedio por mes en un año típico (armonizado MODIS+VIIRS). */
export const PERU_MONTHLY_MEAN: readonly number[] = [
  420, 380, 450, 520, 900, 1700, 3800, 9800, 12600, 6400, 2100, 800,
];

/** Formato de miles estable entre servidor y cliente (es-PE: 12,600). */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
