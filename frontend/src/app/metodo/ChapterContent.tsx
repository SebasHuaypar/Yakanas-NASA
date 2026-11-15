"use client";

import DataNote from "./DataNote";
import { FIRST_VIIRS_YEAR, SERIES } from "./data";
import { hud } from "./fonts";
import OverlapTimeline from "./OverlapTimeline";
import PairsScatter from "./PairsScatter";
import PeruFitMap from "./PeruFitMap";
import { PAIR_TOTAL } from "./pairs";
import RangeBar from "./RangeBar";
import RangeYears from "./RangeYears";
import { REGION_FITS } from "./regions";
import Card from "@/components/Card";
import { useLang } from "@/lib/lang";

const TXT = {
  en: {
    loc: "en",
    thousands: ",",
    d_steps: [
      [
        "Download",
        "The hotspots NASA FIRMS publishes: MODIS (collection 6.1) and 375 m VIIRS.",
      ],
      ["Filter", "We keep vegetation fires with nominal or high confidence."],
      [
        "Count",
        "We count how many hotspots there were each month in each of the 26 territorial units.",
      ],
    ],
    d_stats: [
      ["satellites", "MODIS and VIIRS"],
      ["years", "2003 – 2025"],
      ["units", "of the territory"],
      ["months", "of record"],
    ],
    d_note:
      "Prototype description; the source and the final filters are confirmed by the data team.",
    s_years: ["years of overlap", "2012 – 2022"],
    s_pairs: ["month-region pairs", "to learn the rule"],
    s_note:
      "Prototype data (a sample of the pairs); replaced by the final algorithm's.",
    rule: "The rule",
    ruleTxt1:
      "In words: from MODIS's count we work out how many VIIRS would have counted. Each region has its own ",
    example: "An example",
    ex1: "A high-season month in ",
    ex2: ": MODIS counts ",
    ex3: " hotspots. The model estimates ",
    ex4: " on the VIIRS scale.",
    exNote: "Indicative calculation with the prototype's parameters.",
    m_note:
      "Prototype boundaries and parameters (26 units: departments, Callao and Metropolitan Lima).",
    r_marks: [
      ["The mark", "Is the best estimate of that year's count."],
      ["The band", "Is where the real value probably was."],
      [
        "From 2012",
        "There is no band: those years are measured directly by VIIRS.",
      ],
    ],
    r_note:
      "Prototype values (p10–p90 of the residuals); the final interval is set by the algorithm.",
  },
  es: {
    loc: "es",
    thousands: ".",
    d_steps: [
      [
        "Descargar",
        "Los focos de calor que publica NASA FIRMS: MODIS (colección 6.1) y VIIRS de 375 m.",
      ],
      [
        "Filtrar",
        "Nos quedamos con los fuegos de vegetación y con confianza nominal o alta.",
      ],
      [
        "Contar",
        "Se cuenta cuántos focos hubo cada mes en cada una de las 26 unidades territoriales.",
      ],
    ],
    d_stats: [
      ["satélites", "MODIS y VIIRS"],
      ["años", "2003 – 2025"],
      ["unidades", "del territorio"],
      ["meses", "de registro"],
    ],
    d_note:
      "Descripción del prototipo; la fuente y los filtros finales los confirma el equipo de datos.",
    s_years: ["años de solape", "2012 – 2022"],
    s_pairs: ["pares mes-región", "para aprender la regla"],
    s_note:
      "Datos del prototipo (muestra de los pares); se reemplazan por los del algoritmo final.",
    rule: "La regla",
    ruleTxt1:
      "En palabras: del conteo de MODIS se calcula cuánto habría contado VIIRS. Cada región tiene sus propios ",
    example: "Un ejemplo",
    ex1: "Un mes de temporada alta en ",
    ex2: ": MODIS cuenta ",
    ex3: " focos. El modelo estima ",
    ex4: " en escala VIIRS.",
    exNote: "Cálculo orientativo con los parámetros del prototipo.",
    m_note:
      "Límites y parámetros del prototipo (26 unidades: departamentos, Callao y Lima Metropolitana).",
    r_marks: [
      ["La marca", "Es la mejor estimación del conteo de ese año."],
      ["La franja", "Es donde probablemente estuvo el valor real."],
      ["Desde 2012", "No hay franja: esos años los mide VIIRS directamente."],
    ],
    r_note:
      "Valores del prototipo (p10–p90 de los residuos); el intervalo final lo define el algoritmo.",
  },
};

const tile = "glass rounded-3xl p-5";
const i11 = SERIES.years.indexOf(FIRST_VIIRS_YEAR - 1);

function Stat({ v, t, d }: { v: string; t: string; d?: string }) {
  return (
    <div className={tile}>
      <p className="font-heading text-3xl font-bold text-navy">{v}</p>
      <p className="mt-1 text-sm font-medium text-ink">{t}</p>
      {d && <p className="mt-0.5 text-xs text-slate">{d}</p>}
    </div>
  );
}

/** 01 · DATOS: qué entra al método y cómo se prepara. */
export function DatosContent() {
  const [lang] = useLang();
  const L = TXT[lang];
  const steps = L.d_steps;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v="2" t={L.d_stats[0][0]} d={L.d_stats[0][1]} />
        <Stat v="23" t={L.d_stats[1][0]} d={L.d_stats[1][1]} />
        <Stat v="26" t={L.d_stats[2][0]} d={L.d_stats[2][1]} />
        <Stat v="276" t={L.d_stats[3][0]} d={L.d_stats[3][1]} />
      </div>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li
            key={t}
            className="flex items-center gap-5 glass rounded-3xl px-5 py-4"
          >
            <span className="font-heading text-4xl font-semibold leading-none text-navy/40">
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold text-navy">{t}</span>
              <span className="block text-sm text-slate">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <DataNote>{L.d_note}</DataNote>
    </div>
  );
}

/** 02 · SOLAPE: dónde coinciden y qué se aprende. */
export function SolapeContent() {
  const [lang] = useLang();
  const L = TXT[lang];
  return (
    <div className="space-y-5">
      <Card className="rounded-3xl p-5">
        <OverlapTimeline />
      </Card>
      <div className="grid gap-5 md:grid-cols-[1.35fr_1fr]">
        <Card className="rounded-3xl p-5">
          <PairsScatter />
        </Card>
        <div className="grid content-start gap-3">
          <Stat v="11" t={L.s_years[0]} d={L.s_years[1]} />
          <Stat
            v={String(PAIR_TOTAL).replace(/\B(?=(\d{3})+(?!\d))/g, L.thousands)}
            t={L.s_pairs[0]}
            d={L.s_pairs[1]}
          />
        </div>
      </div>
      <DataNote>{L.s_note}</DataNote>
    </div>
  );
}

/** 03 · MODELO: la regla, un ejemplo y el mapa de ajustes. */
export function ModeloContent() {
  const [lang] = useLang();
  const L = TXT[lang];
  const uc = REGION_FITS.find((r) => r.name === "Ucayali");
  const modis = 300;
  const est = uc
    ? Math.round(Math.exp(uc.a + uc.d + uc.b * Math.log(modis + 1)) - 1)
    : null;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl p-5">
          <p className={`text-[11px] text-slate ${hud}`}>{L.rule}</p>
          <code className="mt-2 block break-words font-mono text-[13px] leading-relaxed text-ink">
            log(VIIRS+1) = a + d·alta + b·log(MODIS+1)
          </code>
          <p className="mt-3 text-xs text-slate">
            {L.ruleTxt1}
            <b className="text-ink">a</b>, <b className="text-ink">d</b>
            {lang === "en" ? " and " : " y "}
            <b className="text-ink">b</b>.
          </p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className={`text-[11px] text-slate ${hud}`}>{L.example}</p>
          {est !== null ? (
            <p className="mt-2 text-sm text-slate">
              {L.ex1}
              <b className="text-ink">Ucayali</b>
              {L.ex2}
              <b className="text-ink">{modis}</b>
              {L.ex3}
              <b className="font-heading text-2xl text-navy">
                ≈ {est.toLocaleString(L.loc)}
              </b>
              {L.ex4}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate">{L.exNote}</p>
        </Card>
      </div>
      <PeruFitMap compact />
      <DataNote>{L.m_note}</DataNote>
    </div>
  );
}

/** 04 · RANGO: cuánto dudamos y cómo leerlo. */
export function RangoContent() {
  const [lang] = useLang();
  const L = TXT[lang];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl p-5 pt-4">
          <RangeBar
            year={FIRST_VIIRS_YEAR - 1}
            low={SERIES.low[i11]}
            mid={SERIES.harmonized[i11]}
            high={SERIES.high[i11]}
          />
        </Card>
        <Card className="rounded-3xl p-5">
          <RangeYears
            years={SERIES.years.slice(0, i11 + 1)}
            mid={SERIES.harmonized.slice(0, i11 + 1)}
            low={SERIES.low.slice(0, i11 + 1)}
            high={SERIES.high.slice(0, i11 + 1)}
          />
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {L.r_marks.map(([t, d]) => (
          <div key={t} className={tile}>
            <p className="font-semibold text-navy">{t}</p>
            <p className="mt-1 text-sm text-slate">{d}</p>
          </div>
        ))}
      </div>
      <DataNote>{L.r_note}</DataNote>
    </div>
  );
}
