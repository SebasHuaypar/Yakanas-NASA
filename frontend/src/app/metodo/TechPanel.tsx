"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import Formula, { type TermKey } from "./Formula";
import { hud } from "./fonts";
import Select from "@/components/Select";
import { useLang } from "@/lib/lang";
import {
  displayName,
  MONTH_NAMES,
  useMethodData,
  validationFigures,
} from "@/lib/method-data";

const SECTIONS = [
  { id: "modelo", n: "01" },
  { id: "validacion", n: "02" },
  { id: "supuestos", n: "03" },
  { id: "parametros", n: "04" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const ZONE_IDS = ["todas", "costa", "sierra", "selva"] as const;

const TX = {
  en: {
    loc: "en",
    dec: ".",
    t_aria: "Technical detail",
    sections: [
      {
        label: "Try the model",
        hint: "Move the controls and see what it estimates",
      },
      { label: "Validation", hint: "How it did on years it had not seen" },
      {
        label: "Assumptions and limits",
        hint: "What we assume and what we do not promise",
      },
      { label: "Parameters by region", hint: "The values of each unit" },
    ],
    zones: {
      todas: "All",
      costa: "Coast",
      sierra: "Highlands",
      selva: "Rainforest",
    },
    c_intro:
      "Pick a region and how many hotspots MODIS counted in a month. The model works out how many VIIRS would have counted: the same calculation we use to translate the years before 2012.",
    c_s1: "We take MODIS to a logarithmic scale",
    c_s2: "We multiply it by the slope b",
    c_s3: (high: boolean) =>
      `We add the base level a${high ? " and the high-season adjustment d" : ""}`,
    c_s4: "We undo the logarithm (with the Duan correction)",
    c_you: "You choose",
    c_region: "Region",
    c_own: "This region has its own fit.",
    c_nat: "This region uses the national fit (few months with fire).",
    c_modisIn: "Hotspots counted by MODIS in the month",
    c_modisAria: "Hotspots counted by MODIS",
    c_high: "High-season month",
    c_highHint: "That region's months with the most fire",
    c_est: "The model estimates",
    c_estA: "hotspots on the VIIRS scale for that month in",
    c_estB: " — about ",
    c_times: "times",
    c_estC: "what MODIS counted.",
    c_viirsEst: "VIIRS (estimated)",
    c_foot:
      "Same formula the pipeline applies to each department-month before 2012, with the official calibration v1 and the Duan smearing correction.",
    c_how: "How it got to that number",
    c_means: "What each value means for",
    c_aT: "Base level",
    c_aD: "How much more VIIRS sees than MODIS even with few hotspots: the effect of its finer resolution.",
    c_bT: "Slope",
    c_bD1: "If MODIS counts 10 % more, VIIRS goes up ≈",
    c_bD2: "Close to 1 is an almost proportional relationship.",
    c_dT: "High season",
    c_dD: "Extra correction in the months with the most fire",
    v_intro:
      "To know whether the translation is reliable, we hid some years. We trained on some, tested on others the model had never seen, and compared what it predicted with what VIIRS actually counted.",
    v_split: "How we split the years",
    v_train: "Train",
    v_test: "Test",
    v_splitNote:
      "The model only saw the years on the left. The final grade comes from the ones on the right.",
    v_r2T: "How much it explains",
    v_perfect: "1 = perfect",
    v_r2D:
      "R² of Peru's monthly total on the test years: most of the month-to-month variation is explained.",
    v_errT: "How wrong it is",
    v_real: "100 real",
    v_errD: (lo: number, hi: number) =>
      `If a real month was 100, the national estimate usually lands between ${lo} and ${hi}.`,
    v_zones: "Error by zone (monthly, per department)",
    v_zonesNote: (e: number) =>
      `The average error per department and month is ${e} %. The Coast has very little fire, so small absolute differences look big in percent.`,
    v_covT: (w: number) => `Months within the range (${w} of 100)`,
    v_covAria: (w: number) =>
      `${w} of 100 months fell inside the announced range`,
    v_covD: (w: number) =>
      `${w} of every 100 real months fell inside the range we announced.`,
    a_yes: {
      title: "What we assume",
      sub: "What we take as true for the method to work",
      items: [
        [
          "Source",
          "NASA FIRMS: MODIS collection 6.1 and 375 m VIIRS from the country archive, plus the near-real-time product for the latest days.",
        ],
        [
          "Type of fire",
          "Vegetation only (type 0) with nominal or high confidence. The NRT product has no type, so cells that were ever a volcano, a fixed source or sea are dropped.",
        ],
        [
          "One VIIRS per day",
          "NOAA-20 from April 2018, Suomi-NPP before, and NOAA-21 only as a backup. Adding satellites would inflate the series.",
        ],
        [
          "Stable relationship",
          "What was learned in 2012–2022 also holds before 2012. Peru's local date (UTC−5) is used, on a 0.02° grid (about 5 km²).",
        ],
      ] as [string, string][],
    },
    a_no: {
      title: "What we do not promise",
      sub: "The limits worth keeping in mind",
      items: [
        [
          "Before 20 Jan 2012 is estimated",
          "They are not observations: that is why every month carries a 10th–90th percentile range.",
        ],
        [
          "Regions with little fire",
          "With fewer than 24 months with fire, fewer than 1,500 VIIRS hotspots in 2012–2022, or a slope outside 0.5–1.3, a department uses the national fit and has more uncertainty.",
        ],
        [
          "The Coast",
          "It has the largest relative error because it has very little fire. Do not read its percentages without that context.",
        ],
        [
          "Hotspots are not area",
          "Counting hotspots does not measure burned hectares or intensity, and it cannot tell an agricultural burn from a wildfire.",
        ],
      ] as [string, string][],
    },
    p_csvHead: "region,zone,fit,a,d,b,smear,months,high_season\n",
    p_ownCsv: "own",
    p_natCsv: "national",
    p_csvName: "parameters_by_region.csv",
    p_intro1: "Each unit has its three values. The bar shows the slope",
    p_intro2: ": the longer it is, the more closely VIIRS follows MODIS.",
    p_filter: "Filter by zone",
    p_csv: "Download CSV",
    p_cols: ["Region", "Fit", "a", "d", "b · slope", "Months", "High season"],
    p_own: "own",
    p_nat: "national",
    p_units:
      "units. “National” means it does not have enough months with fire for its own fit.",
  },
  es: {
    loc: "es",
    dec: ",",
    t_aria: "Detalle técnico",
    sections: [
      {
        label: "Probar el modelo",
        hint: "Mueve los controles y mira qué estima",
      },
      { label: "Validación", hint: "Cómo le fue con años que no vio" },
      {
        label: "Supuestos y límites",
        hint: "Qué asumimos y qué no prometemos",
      },
      { label: "Parámetros por región", hint: "Los valores de cada unidad" },
    ],
    zones: { todas: "Todas", costa: "Costa", sierra: "Sierra", selva: "Selva" },
    c_intro:
      "Elige una región y cuántos focos contó MODIS en un mes. El modelo calcula cuántos habría contado VIIRS: la misma cuenta que hacemos para traducir los años anteriores a 2012.",
    c_s1: "Pasamos MODIS a escala logarítmica",
    c_s2: "Lo multiplicamos por la pendiente b",
    c_s3: (high: boolean) =>
      `Sumamos el nivel base a${high ? " y el ajuste de temporada alta d" : ""}`,
    c_s4: "Deshacemos el logaritmo (con la corrección de Duan)",
    c_you: "Tú eliges",
    c_region: "Región",
    c_own: "Esta región tiene su propio ajuste.",
    c_nat: "Esta región usa el ajuste nacional (pocos meses con fuego).",
    c_modisIn: "Focos contados por MODIS en el mes",
    c_modisAria: "Focos contados por MODIS",
    c_high: "Mes de temporada alta",
    c_highHint: "Los meses con más fuego de esa región",
    c_est: "El modelo estima",
    c_estA: "focos en escala VIIRS para ese mes en",
    c_estB: " — unas ",
    c_times: "veces",
    c_estC: "lo que contó MODIS.",
    c_viirsEst: "VIIRS (estimado)",
    c_foot:
      "La misma fórmula que aplica el pipeline a cada departamento-mes antes de 2012, con la calibración oficial v1 y la corrección de Duan.",
    c_how: "Así llegó a ese número",
    c_means: "Qué significa cada valor de",
    c_aT: "Nivel base",
    c_aD: "Cuánto más ve VIIRS que MODIS aunque haya pocos focos: el efecto de su resolución más fina.",
    c_bT: "Pendiente",
    c_bD1: "Si MODIS cuenta 10 % más, VIIRS sube ≈",
    c_bD2: "Cerca de 1 es una relación casi proporcional.",
    c_dT: "Temporada alta",
    c_dD: "Corrección extra en los meses de más fuego",
    v_intro:
      "Para saber si la traducción es confiable, escondimos algunos años. Entrenamos con unos, probamos con otros que el modelo nunca vio y comparamos lo que predijo con lo que VIIRS contó de verdad.",
    v_split: "Cómo repartimos los años",
    v_train: "Entrenar",
    v_test: "Probar",
    v_splitNote:
      "El modelo solo vio los años de la izquierda. La nota final sale de los de la derecha.",
    v_r2T: "Qué tanto lo explica",
    v_perfect: "1 = perfecto",
    v_r2D:
      "R² del total mensual del Perú en los años de prueba: gran parte de la variación de un mes a otro queda explicada.",
    v_errT: "Cuánto se equivoca",
    v_real: "100 real",
    v_errD: (lo: number, hi: number) =>
      `Si un mes real fue 100, la estimación nacional suele caer entre ${lo} y ${hi}.`,
    v_zones: "Error por zona (mensual, por departamento)",
    v_zonesNote: (e: number) =>
      `El error promedio por departamento y mes es ${e} %. La Costa tiene muy poco fuego, así que diferencias pequeñas se ven grandes en porcentaje.`,
    v_covT: (w: number) => `Meses dentro del rango (${w} de 100)`,
    v_covAria: (w: number) =>
      `${w} de 100 meses cayeron dentro del rango anunciado`,
    v_covD: (w: number) =>
      `${w} de cada 100 meses reales cayeron dentro del rango que anunciamos.`,
    a_yes: {
      title: "Qué asumimos",
      sub: "Lo que damos por cierto para que el método funcione",
      items: [
        [
          "Fuente",
          "NASA FIRMS: MODIS colección 6.1 y VIIRS de 375 m del archivo por país, más el producto casi en tiempo real para los últimos días.",
        ],
        [
          "Tipo de fuego",
          "Solo vegetación (tipo 0) con confianza nominal o alta. El NRT no trae tipo, así que se descartan las celdas que alguna vez fueron volcán, fuente fija o mar.",
        ],
        [
          "Un VIIRS por día",
          "NOAA-20 desde abril de 2018, Suomi-NPP antes y NOAA-21 solo de respaldo. Sumar satélites inflaría la serie.",
        ],
        [
          "Relación estable",
          "Lo aprendido en 2012–2022 también vale antes de 2012. Se usa la fecha local del Perú (UTC−5), en una grilla de 0,02° (unos 5 km²).",
        ],
      ] as [string, string][],
    },
    a_no: {
      title: "Qué no prometemos",
      sub: "Los límites que conviene tener presentes",
      items: [
        [
          "Antes del 20 de enero de 2012 es estimado",
          "No son observaciones: por eso cada mes lleva un rango del percentil 10 al 90.",
        ],
        [
          "Regiones con poco fuego",
          "Con menos de 24 meses con fuego, menos de 1.500 hotspots VIIRS en 2012–2022 o una pendiente fuera de 0,5–1,3, un departamento usa el ajuste nacional y tiene más incertidumbre.",
        ],
        [
          "La Costa",
          "Tiene el mayor error relativo porque tiene muy poco fuego. No leas sus porcentajes sin ese contexto.",
        ],
        [
          "Focos no son superficie",
          "Contar focos no mide hectáreas quemadas ni intensidad, y no distingue una quema agrícola de un incendio forestal.",
        ],
      ] as [string, string][],
    },
    p_csvHead: "region,zona,ajuste,a,d,b,smear,meses,temporada_alta\n",
    p_ownCsv: "propio",
    p_natCsv: "nacional",
    p_csvName: "parametros_por_region.csv",
    p_intro1:
      "Cada unidad tiene sus tres valores. La barra muestra la pendiente",
    p_intro2: ": cuanto más larga, más acompaña VIIRS a MODIS.",
    p_filter: "Filtrar por zona",
    p_csv: "Descargar CSV",
    p_cols: [
      "Región",
      "Ajuste",
      "a",
      "d",
      "b · pendiente",
      "Meses",
      "Temporada alta",
    ],
    p_own: "propio",
    p_nat: "nacional",
    p_units:
      "unidades. “Nacional” significa que no tiene suficientes meses con fuego para un ajuste propio.",
  },
};

const box = "glass rounded-3xl p-5";
const boxF = (on: boolean) =>
  `glass rounded-3xl p-5 transition-colors ${on ? "border-navy/70! bg-navy/10!" : ""}`;

/* ------------------------------------------------------------------ */
/* 01 · PROBAR EL MODELO                                              */
/* ------------------------------------------------------------------ */
function Calculator() {
  const [lang] = useLang();
  const L = TX[lang];
  const nf = new Intl.NumberFormat(L.loc);
  const idSel = useId();
  const idNum = useId();
  const { fits } = useMethodData();
  const [regionId, setRegionId] = useState("PE-UCA");
  const [modis, setModis] = useState(300);
  const [high, setHigh] = useState(true);
  const [focus, setFocus] = useState<TermKey | null>(null);

  const fit = fits.find((r) => r.id === regionId) ?? fits[0];
  const fitName = displayName(fit.name, lang);
  const u = Math.log(modis + 1);
  const bu = fit.b * u;
  const d = high ? fit.d : 0;
  const w = fit.a + d + bu;
  const est = Math.max(0, fit.smear * Math.exp(w) - 1);
  const ratio = modis > 0 ? est / modis : 0;

  const steps: [string, string, string, TermKey][] = [
    ["1", L.c_s1, `ln(${nf.format(modis)} + 1) = ${u.toFixed(2)}`, "modis"],
    [
      "2",
      L.c_s2,
      `${fit.b.toFixed(2)} × ${u.toFixed(2)} = ${bu.toFixed(2)}`,
      "b",
    ],
    [
      "3",
      L.c_s3(high),
      `${bu.toFixed(2)} + ${fit.a.toFixed(2)}${high ? ` + ${fit.d.toFixed(2)}` : ""} = ${w.toFixed(2)}`,
      "a",
    ],
    [
      "4",
      L.c_s4,
      `${fit.smear.toFixed(2)} × e^${w.toFixed(2)} − 1 ≈ ${nf.format(Math.round(est))}`,
      "viirs",
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-slate">{L.c_intro}</p>

      <Formula
        a={fit.a}
        b={fit.b}
        d={fit.d}
        modis={modis}
        high={high}
        focus={focus}
        onFocus={setFocus}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Entradas */}
        <div className={`${box} space-y-6`}>
          <p className={`text-[11px] text-slate ${hud}`}>{L.c_you}</p>

          <div>
            <label htmlFor={idSel} className="text-sm font-medium text-ink">
              {L.c_region}
            </label>
            <div className="mt-2">
              <Select
                id={idSel}
                value={regionId}
                onChange={setRegionId}
                options={fits.map((r) => ({
                  value: r.id,
                  label: displayName(r.name, lang),
                }))}
              />
            </div>
            <p className="mt-2 text-xs text-slate">
              {fit.own ? L.c_own : L.c_nat}
            </p>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <label htmlFor={idNum} className="text-sm font-medium text-ink">
                {L.c_modisIn}
              </label>
              <input
                id={idNum}
                type="number"
                min={0}
                max={5000}
                value={modis}
                onChange={(e) =>
                  setModis(
                    Math.max(0, Math.min(5000, Number(e.target.value) || 0)),
                  )
                }
                className="w-24 rounded-xl border border-slate/40 bg-black/40 px-3 py-2 text-right font-heading text-lg font-bold text-navy outline-none focus-visible:ring-2 focus-visible:ring-navy"
              />
            </div>
            <input
              type="range"
              min={0}
              max={2000}
              step={10}
              value={Math.min(modis, 2000)}
              onChange={(e) => setModis(Number(e.target.value))}
              aria-label={L.c_modisAria}
              className="mt-4 h-7 w-full accent-(--accent)"
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={high}
            onClick={() => setHigh((v) => !v)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate/30 px-4 py-3 text-left transition-colors hover:border-slate/60"
          >
            <span>
              <span className="block text-sm font-medium text-ink">
                {L.c_high}
              </span>
              <span className="block text-xs text-slate">{L.c_highHint}</span>
            </span>
            <span
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${high ? "bg-navy" : "bg-slate/40"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-[#0C090A] transition-all ${high ? "left-6" : "left-1"}`}
              />
            </span>
          </button>
        </div>

        {/* Resultado */}
        <div className="glass flex flex-col rounded-3xl p-6" aria-live="polite">
          <p className={`text-[11px] text-slate ${hud}`}>{L.c_est}</p>
          <p className="mt-2 font-heading text-6xl font-bold leading-none text-navy sm:text-7xl">
            ≈ {nf.format(Math.round(est))}
          </p>
          <p className="mt-3 text-slate">
            {L.c_estA} <b className="text-ink">{fitName}</b>
            {modis > 0 && (
              <>
                {L.c_estB}
                <b className="text-ink">
                  {ratio.toLocaleString(L.loc, { maximumFractionDigits: 1 })}{" "}
                  {L.c_times}
                </b>{" "}
                {L.c_estC}
              </>
            )}
          </p>

          <div className="mt-6 grid gap-2 text-xs text-slate sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div>
              <div className="mb-1 flex justify-between">
                <span>MODIS</span>
                <span className="text-ink">{nf.format(modis)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-(--mist)">
                <div
                  className="h-full rounded-full bg-slate"
                  style={{
                    width: `${Math.round(Math.min(100, (modis / Math.max(est, modis, 1)) * 100) * 10) / 10}%`,
                  }}
                />
              </div>
            </div>
            <span aria-hidden className="hidden text-lg text-navy sm:block">
              →
            </span>
            <div>
              <div className="mb-1 flex justify-between">
                <span>{L.c_viirsEst}</span>
                <span className="text-ink">{nf.format(Math.round(est))}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-(--mist)">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{
                    width: `${Math.round(Math.min(100, (est / Math.max(est, modis, 1)) * 100) * 10) / 10}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="mt-auto pt-6 text-xs text-slate">{L.c_foot}</p>
        </div>
      </div>

      {/* Paso a paso */}
      <div>
        <p className={`text-[11px] text-slate ${hud}`}>{L.c_how}</p>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {steps.map(([n, t, calc, k]) => (
            <li
              key={n}
              className={boxF(focus === k || (k === "a" && focus === "d"))}
              onMouseEnter={() => setFocus(k)}
              onMouseLeave={() => setFocus(null)}
            >
              <span className="font-heading text-3xl font-semibold leading-none text-navy/40">
                {n}
              </span>
              <p className="mt-3 text-sm text-ink">{t}</p>
              <p className="mt-2 break-words font-mono text-xs text-navy">
                {calc}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Qué significa cada valor */}
      <div>
        <p className={`text-[11px] text-slate ${hud}`}>
          {L.c_means} {fitName}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div
            className={boxF(focus === "a")}
            onMouseEnter={() => setFocus("a")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">a = </span>
              {fit.a.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{L.c_aT}</p>
            <p className="mt-1 text-xs text-slate">{L.c_aD}</p>
          </div>
          <div
            className={boxF(focus === "b")}
            onMouseEnter={() => setFocus("b")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">b = </span>
              {fit.b.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{L.c_bT}</p>
            <p className="mt-1 text-xs text-slate">
              {L.c_bD1} {(fit.b * 10).toFixed(1).replace(".", L.dec)} %.{" "}
              {L.c_bD2}
            </p>
          </div>
          <div
            className={boxF(focus === "d")}
            onMouseEnter={() => setFocus("d")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">d = </span>
              {fit.d.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{L.c_dT}</p>
            <p className="mt-1 text-xs text-slate">
              {L.c_dD}
              {fit.high.length
                ? `: ${fit.high.map((m) => MONTH_NAMES[lang][m - 1]).join(", ")}`
                : ""}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · VALIDACIÓN                                                    */
/* ------------------------------------------------------------------ */
function Validation() {
  const [lang] = useLang();
  const L = TX[lang];
  const V = validationFigures(useMethodData().validation);
  const pc = (x: number) => Math.round(x * 100);
  const dec = (x: number, d = 2) =>
    x.toFixed(d).replace(".", lang === "en" ? "." : ",");
  const errLo = 100 - pc(V.err);
  const errHi = 100 + pc(V.err);
  const within = pc(V.within);
  const zoneNames = {
    en: { Selva: "Rainforest", Sierra: "Highlands", Costa: "Coast" },
    es: { Selva: "Selva", Sierra: "Sierra", Costa: "Costa" },
  }[lang] as Record<string, string>;
  const zoneMax = Math.max(...Object.values(V.zones));
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-slate">{L.v_intro}</p>

      <div className={box}>
        <p className={`text-[11px] text-slate ${hud}`}>{L.v_split}</p>
        <div className="mt-4 flex h-12 overflow-hidden rounded-xl text-sm font-medium">
          <div
            className="flex items-center justify-center bg-navy/25 text-navy"
            style={{ flex: 8 }}
          >
            {L.v_train} · {V.train}
          </div>
          <div
            className="flex items-center justify-center bg-navy text-[#0C090A]"
            style={{ flex: 3 }}
          >
            {L.v_test} · {V.test}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate">{L.v_splitNote}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* R2 */}
        <div className={box}>
          <p className="font-heading whitespace-nowrap text-4xl font-bold text-navy sm:text-5xl">
            {dec(V.r2)}
          </p>
          <p className="mt-2 font-medium text-ink">{L.v_r2T}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-(--mist)">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${V.r2 * 100}%` }}
            />
          </div>
          <p className="mt-1 flex justify-between text-[11px] text-slate">
            <span>0</span>
            <span>{L.v_perfect}</span>
          </p>
          <p className="mt-3 text-sm text-slate">{L.v_r2D}</p>
        </div>

        {/* error */}
        <div className={box}>
          <p className="font-heading whitespace-nowrap text-4xl font-bold text-navy sm:text-5xl">
            ±{pc(V.err)} %
          </p>
          <p className="mt-2 font-medium text-ink">{L.v_errT}</p>
          <div className="relative mt-5 h-3 rounded-full bg-(--mist)">
            <div
              className="absolute inset-y-0 rounded-full bg-navy/40"
              style={{ left: `${50 - pc(V.err) / 2}%`, width: `${pc(V.err)}%` }}
            />
            <div
              className="absolute -top-1.5 h-6 w-0.5 bg-navy"
              style={{ left: "50%" }}
            />
          </div>
          <p className="mt-2 flex justify-between text-[11px] text-slate">
            <span>{errLo}</span>
            <span className="text-navy">{L.v_real}</span>
            <span>{errHi}</span>
          </p>
          <p className="mt-3 text-sm text-slate">{L.v_errD(errLo, errHi)}</p>
        </div>

        {/* cobertura */}
        <div className={box}>
          <p className="font-heading whitespace-nowrap text-4xl font-bold text-navy sm:text-5xl">
            {within} %
          </p>
          <p className="mt-2 font-medium text-ink">{L.v_covT(within)}</p>
          <div
            role="img"
            aria-label={L.v_covAria(within)}
            className="mt-4 grid grid-cols-20 gap-1"
          >
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className={`aspect-square rounded-full ${i < within ? "bg-navy" : "bg-slate/30"}`}
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate">{L.v_covD(within)}</p>
        </div>
      </div>

      <div className={box}>
        <p className={`text-[11px] text-slate ${hud}`}>{L.v_zones}</p>
        <ul className="mt-4 space-y-3">
          {Object.entries(V.zones)
            .sort((a, b) => a[1] - b[1])
            .map(([z, e]) => (
              <li
                key={z}
                className="grid grid-cols-[6rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
              >
                <span className="text-ink">{zoneNames[z] ?? z}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-(--mist)">
                  <span
                    className="block h-full rounded-full bg-navy"
                    style={{ width: `${(e / zoneMax) * 100}%` }}
                  />
                </span>
                <span className="text-right font-mono text-ink">{pc(e)} %</span>
              </li>
            ))}
        </ul>
        <p className="mt-4 text-xs text-slate">
          {L.v_zonesNote(pc(V.deptErr))}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · SUPUESTOS Y LÍMITES                                           */
/* ------------------------------------------------------------------ */
const Check = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9.5" />
    <path d="m7.8 12.3 2.8 2.8 5.6-5.8" />
  </svg>
);
const Warn = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
    <path d="M12 10v4.2M12 17h.01" />
  </svg>
);

function Assumptions() {
  const [lang] = useLang();
  const V = validationFigures(useMethodData().validation);
  const cols = [
    { ...TX[lang].a_yes, icon: <Check /> },
    { ...TX[lang].a_no, icon: <Warn /> },
  ];
  void V;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {cols.map((c) => (
        <div key={c.title} className={box}>
          <div className="flex items-center gap-3 text-navy">
            {c.icon}
            <h3 className="text-xl">{c.title}</h3>
          </div>
          <p className="mt-1 text-sm text-slate">{c.sub}</p>
          <ul className="mt-5 space-y-3">
            {c.items.map(([t, d], i) => (
              <li
                key={t}
                className="flex gap-4 rounded-xl border border-slate/20 bg-black/25 px-4 py-3"
              >
                <span className="font-heading text-xl font-semibold text-navy/40">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium text-ink">{t}</span>
                  <span className="block text-sm text-slate">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · PARÁMETROS POR REGIÓN                                         */
/* ------------------------------------------------------------------ */
function Params() {
  const [lang] = useLang();
  const L = TX[lang];
  const { fits } = useMethodData();
  const [zone, setZone] = useState<(typeof ZONE_IDS)[number]>("todas");
  const rows = fits.filter((r) => zone === "todas" || r.zone === zone);
  const bmin = 0.4;
  const bmax = 1.3;

  function downloadCsv() {
    const head = L.p_csvHead;
    const body = fits
      .map(
        (r) =>
          `${r.name},${r.zone},${r.own ? L.p_ownCsv : L.p_natCsv},${r.a},${r.d},${r.b},${r.smear},${r.months},${r.high.join(" ")}`,
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([head + body], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = L.p_csvName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-slate">
        {L.p_intro1} <b className="text-ink">b</b>
        {L.p_intro2}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={L.p_filter}
          className="flex flex-wrap gap-2"
        >
          {ZONE_IDS.map((z) => (
            <button
              key={z}
              type="button"
              aria-pressed={zone === z}
              onClick={() => setZone(z)}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                zone === z
                  ? "border-navy bg-navy text-[#0C090A]"
                  : "border-slate/40 text-navy hover:border-navy"
              }`}
            >
              {L.zones[z]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-full border border-navy/60 px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-[#0C090A]"
        >
          {L.p_csv}
        </button>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-2xl border border-slate/20 [color-scheme:dark] [scrollbar-color:rgb(76_102_121)_transparent] [scrollbar-width:thin]">
        <table className="w-full min-w-170 border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#0C090A] text-slate">
            <tr>
              {L.p_cols.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate/15">
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-medium text-ink"
                >
                  {displayName(r.name, lang)}
                  <span className="ml-2 text-xs font-normal capitalize text-slate">
                    {L.zones[r.zone]}
                  </span>
                </th>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.own ? "bg-navy/15 text-navy" : "bg-slate/20 text-slate"}`}
                  >
                    {r.own ? L.p_own : L.p_nat}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-ink">
                  {r.a.toFixed(2)}
                </td>
                <td className="px-4 py-3 font-mono text-ink">
                  {r.d.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-slate/25">
                      <span
                        className="block h-full rounded-full bg-navy"
                        style={{
                          width: `${Math.round(Math.max(4, Math.min(100, ((r.b - bmin) / (bmax - bmin)) * 100)) * 10) / 10}%`,
                        }}
                      />
                    </span>
                    <span className="font-mono text-ink">{r.b.toFixed(2)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate">{r.months}</td>
                <td className="px-4 py-3 text-slate">
                  {r.high.map((m) => MONTH_NAMES[lang][m - 1]).join(" ") || "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate">
        {rows.length} {L.p_units}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function TechPanel() {
  const [lang] = useLang();
  const L = TX[lang];
  const [sel, setSel] = useState<SectionId>("modelo");

  function onKey(e: React.KeyboardEvent, i: number) {
    const d =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const next = SECTIONS[(i + d + SECTIONS.length) % SECTIONS.length].id;
    setSel(next);
    document.getElementById(`tech-${next}`)?.focus();
  }

  const body: Record<SectionId, ReactNode> = {
    modelo: <Calculator />,
    validacion: <Validation />,
    supuestos: <Assumptions />,
    parametros: <Params />,
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label={L.t_aria}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s, i) => {
          const on = sel === s.id;
          return (
            <button
              key={s.id}
              id={`tech-${s.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="tech-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setSel(s.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`glass flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-300 sm:shrink ${
                on ? "border-navy/70! bg-navy/10!" : "hover:border-navy/40!"
              }`}
            >
              <span
                className={`font-heading text-2xl font-semibold leading-none ${on ? "text-navy" : "text-navy/35"}`}
              >
                {s.n}
              </span>
              <span className="min-w-0">
                <span
                  className={`block whitespace-nowrap font-semibold sm:whitespace-normal ${on ? "text-navy" : "text-navy/80"}`}
                >
                  {L.sections[i].label}
                </span>
                <span className="mt-0.5 hidden text-xs text-slate lg:block">
                  {L.sections[i].hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="tech-panel"
        role="tabpanel"
        aria-labelledby={`tech-${sel}`}
        className="glass min-w-0 rounded-3xl p-6 sm:p-10"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {body[sel]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
