/**
 * DATOS DE PRUEBA (falsos).
 * Cuando el backend tenga lista la API, estos valores se reemplazan por la
 * respuesta real. Mantener las mismas formas (tipos) para que el cambio sea
 * solo cambiar el origen de los datos.
 */

export const MONTHS_EN_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

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

/**
 * DATOS DE EJEMPLO por región natural (promedio mensual en un año típico).
 * Las tres series suman exactamente PERU_MONTHLY_MEAN. Reemplazar por la API del backend.
 */
type Bi = { en: string; es: string };
export type Region = {
  id: "costa" | "andes" | "amazonia";
  name: Bi;
  sub: Bi;
  desc: Bi;
  data: readonly number[];
};

export const REGIONS: readonly Region[] = [
  {
    id: "costa",
    name: { en: "Coast", es: "Costa" },
    sub: {
      en: "Coastal desert, from Tumbes to Tacna",
      es: "Desierto costero, de Tumbes a Tacna",
    },
    desc: {
      en: "Few hotspots spread across the year: stubble burning in the valleys.",
      es: "Pocos focos y repartidos todo el año: quema de rastrojos en los valles.",
    },
    data: [180, 160, 190, 210, 230, 220, 210, 200, 220, 260, 250, 190],
  },
  {
    id: "andes",
    name: { en: "Andes", es: "Andes" },
    sub: {
      en: "Highlands, from Cajamarca to Puno",
      es: "Sierra, de Cajamarca a Puno",
    },
    desc: {
      en: "It rises in the dry season, from July to October, when pastures and fields are burned before the rains.",
      es: "Sube en la época seca, de julio a octubre, cuando se queman pastos y chacras antes de las lluvias.",
    },
    data: [120, 110, 160, 200, 350, 820, 1650, 2900, 3500, 2200, 700, 280],
  },
  {
    id: "amazonia",
    name: { en: "Amazon", es: "Amazonía" },
    sub: {
      en: "Rainforest: Loreto, Ucayali, San Martín and Madre de Dios",
      es: "Selva: Loreto, Ucayali, San Martín y Madre de Dios",
    },
    desc: {
      en: "It peaks in August and September, when fields and felled forest are burned.",
      es: "Se concentra en agosto y setiembre, cuando se queman chacras y bosque talado.",
    },
    data: [120, 110, 100, 110, 320, 660, 1940, 6700, 8880, 3940, 1150, 330],
  },
];
