/**
 * Datos de la landing: el año típico del fuego en el Perú.
 * Son REALES: promedio de cada mes en los años con VIIRS observado (2012–2025), calculado con la API del
 * equipo de backend (ver scripts/snapshot-api.mjs, que regenera src/lib/api-snapshot.ts).
 */
import { SNAPSHOT_TYPICAL } from "./api-snapshot";

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

/** Focos de calor promedio por mes en un año típico (armonizado, equivalente VIIRS). */
export const PERU_MONTHLY_MEAN: readonly number[] = SNAPSHOT_TYPICAL.PE;

/** Formato de miles estable entre servidor y cliente (es-PE: 12,600). */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Promedio mensual de un año típico por región natural (costa, sierra y selva), de la API. */
type Bi = { en: string; es: string };
export type Region = {
  id: "costa" | "sierra" | "selva";
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
    data: SNAPSHOT_TYPICAL.costa,
  },
  {
    id: "sierra",
    name: { en: "Highlands", es: "Sierra" },
    sub: {
      en: "Highlands, from Cajamarca to Puno",
      es: "Sierra, de Cajamarca a Puno",
    },
    desc: {
      en: "It rises in the dry season, from July to October, when pastures and fields are burned before the rains.",
      es: "Sube en la época seca, de julio a octubre, cuando se queman pastos y chacras antes de las lluvias.",
    },
    data: SNAPSHOT_TYPICAL.sierra,
  },
  {
    id: "selva",
    name: { en: "Rainforest", es: "Selva" },
    sub: {
      en: "Rainforest: Loreto, Ucayali, San Martín and Madre de Dios",
      es: "Selva: Loreto, Ucayali, San Martín y Madre de Dios",
    },
    desc: {
      en: "It peaks in August and September, when fields and felled forest are burned.",
      es: "Se concentra en agosto y setiembre, cuando se queman chacras y bosque talado.",
    },
    data: SNAPSHOT_TYPICAL.selva,
  },
];
