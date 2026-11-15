"use client";

import { useEffect, useState } from "react";
import {
  apiGet,
  type ApiCalendar,
  type ApiCalibration,
  type ApiValidation,
} from "./api";
import {
  SNAPSHOT_FITS,
  SNAPSHOT_SERIES,
  SNAPSHOT_VALIDATION,
} from "./api-snapshot";

/**
 * Datos del método (serie armonizada del país, calibración por departamento y validación).
 * Arranca con una instantánea REAL de la API (api-snapshot.ts, generada con scripts/snapshot-api.mjs)
 * y la reemplaza por la lectura en vivo en cuanto llega; si la API no responde, se queda la instantánea.
 */
export type Fit = (typeof SNAPSHOT_FITS)[number];
export type Series = {
  years: number[];
  harmonized: number[];
  low: number[];
  high: number[];
};
export type MethodData = {
  series: Series;
  fits: Fit[];
  validation: ApiValidation;
  live: boolean;
};

const COSTA = [
  "PE-TUM",
  "PE-PIU",
  "PE-LAM",
  "PE-LAL",
  "PE-LIM",
  "PE-CAL",
  "PE-LMA",
  "PE-ICA",
  "PE-ARE",
  "PE-MOQ",
  "PE-TAC",
];
const SELVA = ["PE-LOR", "PE-UCA", "PE-SAM", "PE-MDD"];
const zoneOf = (id: string): Fit["zone"] =>
  COSTA.includes(id) ? "costa" : SELVA.includes(id) ? "selva" : "sierra";

const initial: MethodData = {
  series: SNAPSHOT_SERIES,
  fits: SNAPSHOT_FITS,
  validation: SNAPSHOT_VALIDATION,
  live: false,
};

function toSeries(cal: ApiCalendar): Series {
  const years: number[] = [];
  for (let y = 2003; y <= 2025; y++) years.push(y);
  const sum = (y: number, k: "hs" | "hs_lo" | "hs_hi") =>
    Math.round(
      cal.months.filter((m) => m.year === y).reduce((s, m) => s + m[k], 0),
    );
  return {
    years,
    harmonized: years.map((y) => sum(y, "hs")),
    low: years.map((y) => sum(y, "hs_lo")),
    high: years.map((y) => sum(y, "hs_hi")),
  };
}

function toFits(rows: ApiCalibration[]): Fit[] {
  return rows
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
}

let pending: Promise<MethodData> | null = null;
function fetchLive(): Promise<MethodData> {
  pending ??= Promise.all([
    apiGet<ApiCalendar>("/calendar", { region_id: "PE" }),
    apiGet<ApiCalibration[]>("/calibration"),
    apiGet<ApiValidation>("/validation"),
  ])
    .then(([cal, calib, validation]) => ({
      series: toSeries(cal),
      fits: toFits(calib),
      validation,
      live: true,
    }))
    .catch((e) => {
      pending = null; // permite reintentar en la próxima visita
      throw e;
    });
  return pending;
}

export function useMethodData(): MethodData {
  const [data, setData] = useState<MethodData>(initial);
  useEffect(() => {
    let off = false;
    fetchLive()
      .then((d) => !off && setData(d))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return data;
}

/** Cifras de validación listas para mostrar. */
export function validationFigures(v: ApiValidation) {
  return {
    r2: v.con_temporada.r2_nacional,
    err: v.con_temporada.error_nacional,
    within: v.con_temporada.dentro_p10_p90,
    deptErr: v.con_temporada.error_departamento_mes,
    zones: v.con_temporada.por_zona,
    train: v.train,
    test: v.test,
    version: v.version,
  };
}

/** Nombre para mostrar: Lima Metropolitana llega de la API como "Municipalidad Metropolitana de Lima". */
export const displayName = (name: string, lang: "en" | "es") =>
  name.startsWith("Municipalidad")
    ? lang === "en"
      ? "Metropolitan Lima"
      : "Lima Metropolitana"
    : name;

export const MONTH_NAMES = {
  en: [
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
  ],
  es: [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "set",
    "oct",
    "nov",
    "dic",
  ],
};
