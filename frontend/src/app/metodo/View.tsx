"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import ChapterCards, { type Chapter } from "./ChapterCards";
import {
  DatosContent,
  ModeloContent,
  RangoContent,
  SolapeContent,
} from "./ChapterContent";
import CountUp from "./CountUp";
import DataNote from "./DataNote";
import DotRing from "./DotRing";
import HarmonizeChart from "./HarmonizeChart";
import Reveal from "./Reveal";
import ScrollLine from "./ScrollLine";
import Image from "next/image";
import Footer from "@/components/sections/Footer";
import SectionHead from "./SectionHead";
import TechPanel from "./TechPanel";
import WhatHappened from "./WhatHappened";
import { FIRST_VIIRS_YEAR, SERIES } from "./data";
import { useMethodData, validationFigures } from "@/lib/method-data";
import { hud, mono, montserrat } from "./fonts";
import Card from "@/components/Card";
import { useLang, type Lang } from "@/lib/lang";

const i11 = SERIES.years.indexOf(FIRST_VIIRS_YEAR - 1);
const jumpRaw = SERIES.raw[i11 + 1] / SERIES.raw[i11];

/**
 * Tema oscuro (mismo lenguaje que la Pantalla 1), SOLO con la paleta del equipo:
 * fondo = `ink`, texto = `snow`, secundario = `slate`, profundidad = `navy`.
 * Dentro de esta página se REMAPEAN las variables de la paleta, así
 * `text-navy`/`bg-navy` significan "claro sobre oscuro" aquí y los estilos
 * globales del resto de pantallas no se tocan.
 *   --snow  → superficie de tarjetas (ink levantado)
 *   --ink   → texto principal (snow)     --navy → títulos y píldoras (snow)
 *   --slate → texto secundario = snow al 66 % (sin inventar tonos fuera de la paleta)
 *   --accent → énfasis = snow (blanco), igual que la píldora activa del navbar
 * El navy de la marca aparece como profundidad en las bandas (--fog, --deep), que son
 * translúcidas para dejar ver el fondo global (estrellas + nebulosa) de layout.tsx.
 */
const tones = {
  "--base": "#0C090A",
  "--snow": "rgb(16 14 17 / 0.62)",
  "--ink": "#F3F9FC",
  "--navy": "#F3F9FC",
  "--slate": "rgb(243 249 252 / 0.66)",
  "--mist": "rgb(243 249 252 / 0.08)",
  "--fog": "rgb(40 58 84 / 0.30)",
  "--deep": "rgb(40 58 84 / 0.55)",
  "--accent": "#F3F9FC",
} as CSSProperties;

/** Capítulos del método: cuatro tarjetas verticales + detalle. */
const imgArt = (src: string, alt: string) => (
  <Image
    src={src}
    alt={alt}
    fill
    sizes="(min-width: 1024px) 280px, 100vw"
    className="object-cover"
  />
);

const CH = {
  en: [
    {
      word: "Data",
      title: "What goes into the method",
      blurb: "NASA's fire hotspots, sorted by month and by region.",
      alt: "Overview of Peru from the Terra satellite, in palette tones.",
      summary:
        "Everything starts from the fire hotspots NASA publishes. Before comparing them, they have to be prepared.",
    },
    {
      word: "Overlap",
      title: "Where both looked at once",
      blurb: "Between 2012 and 2022 the two satellites overlap in time.",
      alt: "Cut-out of an Amazon scene with overlaid hotspot marks.",
      summary:
        "That overlap is our Rosetta stone: it teaches us how many one counts for each hotspot of the other.",
    },
    {
      word: "Model",
      title: "One translation per region",
      blurb: "We fit each territorial unit when there is enough data.",
      alt: "Coast and Andes mountains of southern Peru seen from the satellite, in palette tones.",
      summary:
        "Peru's climates are very different, so each region has its own relationship between MODIS and VIIRS.",
    },
    {
      word: "Range",
      title: "We say how unsure we are",
      blurb: "Every estimated year carries an interval, not an exact number.",
      alt: "Rivers of the Peruvian Amazon among clouds and haze, in palette tones.",
      summary:
        "An estimated year is not a measured year: that is why every estimate carries its likely range.",
    },
  ],
  es: [
    {
      word: "Datos",
      title: "Qué entra al método",
      blurb: "Los focos de calor de NASA, ordenados por mes y por región.",
      alt: "Vista general del Perú desde el satélite Terra, en tonos de la paleta.",
      summary:
        "Todo parte de los focos de calor que NASA publica. Antes de comparar, hay que prepararlos.",
    },
    {
      word: "Solape",
      title: "Dónde ambos miraron a la vez",
      blurb: "Entre 2012 y 2022 los dos satélites coinciden en el tiempo.",
      alt: "Recorte de una escena amazónica con marcas de focos superpuestas.",
      summary:
        "Ese solape es nuestra piedra de Rosetta: nos enseña cuánto cuenta uno por cada foco del otro.",
    },
    {
      word: "Modelo",
      title: "Una traducción por región",
      blurb: "Ajustamos por unidad territorial cuando hay datos suficientes.",
      alt: "Costa y cordillera de los Andes del sur del Perú vistas desde el satélite, en tonos de la paleta.",
      summary:
        "Los climas del Perú son muy distintos, así que cada región tiene su propia relación entre MODIS y VIIRS.",
    },
    {
      word: "Rango",
      title: "Decimos cuánto dudamos",
      blurb: "Cada año estimado lleva un intervalo, no un número exacto.",
      alt: "Ríos de la Amazonía peruana entre nubes y bruma, en tonos de la paleta.",
      summary:
        "Un año estimado no es un año medido: por eso cada estimación lleva su rango probable.",
    },
  ],
};

const CHAPTER_META = [
  {
    id: "datos",
    n: "01",
    img: "/metodo/card-datos.jpg",
    Content: DatosContent,
  },
  {
    id: "solape",
    n: "02",
    img: "/metodo/card-solape.jpg",
    Content: SolapeContent,
  },
  {
    id: "modelo",
    n: "03",
    img: "/metodo/card-modelo.jpg",
    Content: ModeloContent,
  },
  {
    id: "rango",
    n: "04",
    img: "/metodo/card-rango.jpg",
    Content: RangoContent,
  },
] as const;

const getChapters = (lang: Lang): Chapter[] =>
  CHAPTER_META.map((m, i) => ({
    id: m.id,
    n: m.n,
    ...CH[lang][i],
    art: imgArt(m.img, CH[lang][i].alt),
    content: <m.Content />,
  }));

const TXT = {
  en: {
    kicker: "Method · MODIS + VIIRS harmonization",
    h1a: "The camera changed,",
    h1b: "not the fire.",
    lead: "VIIRS counts almost nine times more hotspots than MODIS. We correct it so twenty years of data speak the same language.",
    ctaA: "See the before and after →",
    ctaB: "See the technical detail",
    navAria: "On this page",
    stat1: "Apparent jump 2011 → 2012",
    stat1s: "adding without adjusting",
    stat2: "After harmonizing",
    stat2s: "same VIIRS scale",
    stat3: "Comparable record",
    stat3s: "2003 – 2025",
    years: " years",
    note0:
      "Figures computed with NASA FIRMS data for Peru (vegetation fires, nominal and high confidence). The harmonized series comes live from the backend API.",
    k1: "01 · How it is built",
    t1: "Four steps, one record",
    d1: "Pick a step: from raw data to the final number with its range.",
    k2: "02 · The result",
    t2: "Before and after correcting",
    d2: "With the data as it arrives, fire seems to explode in 2012 and again in 2018. Switch between the two views and compare: once corrected, the series can be read year by year.",
    note2:
      "Annual series of Peru's hotspots from the backend API (calibration v1, frozen). Years before 2012 are estimates with their range, not observations. The “as they arrive” line adds the raw MODIS and VIIRS counts.",
    k3: "03 · Validation",
    t3: "We tested it blind",
    d3: "We trained on 2012–2019 and hid 2020–2022. Then we compared what the model predicted with what VIIRS actually counted.",
    m1: "Accuracy of the monthly total (R²)",
    m1d: "Most of the month-to-month variation in Peru is explained.",
    m2: "Typical error per month",
    m2d: (e: number) =>
      `In a normal month, the national estimate is off by about ${e} % from the real value. The ring shows that ${e} %.`,
    m3: "Months within the range",
    m3d: (w: number) =>
      `${w} of every 100 real months fell inside the range we announced.`,
    note3:
      "Metrics from the backend's validation: the model was fit on the training years and measured on years it never saw.",
    k4: "04 · Under the hood",
    t4: "Try it yourself",
    d4: "For anyone who wants to audit: play with the model, see how we validated it, which assumptions we made and each region's parameters, downloadable.",
    note4:
      "Everything here is the official calibration v1 of the backend, read live from its API. If the team publishes a new version, this section updates itself.",
    next: "Next step",
    endA: "With a consistent record,",
    endB: "we can finally compare.",
    explore: "Explore the data →",
    back: "Back to the story",
  },
  es: {
    kicker: "Método · Armonización MODIS + VIIRS",
    h1a: "Cambió la cámara,",
    h1b: "no el fuego.",
    lead: "VIIRS cuenta casi nueve veces más focos que MODIS. Lo corregimos para que veinte años de datos hablen el mismo idioma.",
    ctaA: "Ver el antes y después →",
    ctaB: "Ver el detalle técnico",
    navAria: "En esta página",
    stat1: "Salto aparente 2011 → 2012",
    stat1s: "sumando sin ajustar",
    stat2: "Tras armonizar",
    stat2s: "misma escala VIIRS",
    stat3: "Registro comparable",
    stat3s: "2003 – 2025",
    years: " años",
    note0:
      "Cifras calculadas con datos NASA FIRMS del Perú (fuegos de vegetación, confianza nominal y alta). La serie armonizada llega en vivo desde la API del backend.",
    k1: "01 · Cómo está hecho",
    t1: "Cuatro pasos, un solo registro",
    d1: "Elige un paso: de los datos crudos al número final con su rango.",
    k2: "02 · El resultado",
    t2: "Antes y después de corregir",
    d2: "Con los datos tal como llegan, el fuego parece explotar en 2012 y otra vez en 2018. Cambia entre las dos vistas y compara: corregida, la serie se puede leer año a año.",
    note2:
      "Serie anual de focos del Perú desde la API del backend (calibración v1, congelada). Los años anteriores a 2012 son estimaciones con su rango, no observaciones. La línea “como llegan” suma los conteos crudos de MODIS y VIIRS.",
    k3: "03 · Validación",
    t3: "Lo pusimos a prueba a ciegas",
    d3: "Entrenamos con 2012–2019 y escondimos 2020–2022. Luego comparamos lo que el modelo predijo con lo que VIIRS contó de verdad.",
    m1: "Acierto del total mensual (R²)",
    m1d: "Gran parte de la variación de un mes a otro en el Perú queda explicada.",
    m2: "Error típico por mes",
    m2d: (e: number) =>
      `En un mes normal, la estimación nacional se aleja cerca de ${e} % del valor real. El anillo muestra ese ${e} %.`,
    m3: "Meses dentro del rango",
    m3d: (w: number) =>
      `${w} de cada 100 meses reales cayeron dentro del rango que anunciamos.`,
    note3:
      "Métricas de la validación del backend: el modelo se ajustó con los años de entrenamiento y se midió en años que nunca vio.",
    k4: "04 · Bajo el capó",
    t4: "Pruébalo tú mismo",
    d4: "Para quien quiera auditar: juega con el modelo, mira cómo lo validamos, qué supuestos hicimos y los parámetros de cada región, descargables.",
    note4:
      "Todo es la calibración oficial v1 del backend, leída en vivo desde su API. Si el equipo publica una versión nueva, esta sección se actualiza sola.",
    next: "Siguiente paso",
    endA: "Con un registro consistente,",
    endB: "ya se puede comparar.",
    explore: "Explorar los datos →",
    back: "Volver a la historia",
  },
};

export default function MetodoView() {
  const [lang] = useLang();
  const m = useMethodData();
  const V = validationFigures(m.validation);
  const jumpHarm = m.series.harmonized[i11 + 1] / m.series.harmonized[i11];
  const pctOf = (x: number) => Math.round(x * 100);
  const L = TXT[lang];
  const chapters = getChapters(lang);
  return (
    <>
      <div
        id="metodo"
        style={tones}
        className={`${mono.variable} ${montserrat.variable} relative text-ink leading-relaxed [&_h1]:text-navy [&_h2]:text-navy [&_h3]:text-navy [&_h4]:text-navy`}
      >
        <ScrollLine />
        <div className="relative z-10">
          {/* HERO: centrado, mucho aire; el fondo lo pone el layout global */}
          <section className="relative flex min-h-[92vh] flex-col justify-center">
            {/* Imagen satelital de Perú: se desvanece hacia la primera sección */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_16%,black_48%,transparent_100%)]"
            >
              <Image
                src="/metodo/hero-peru.webp"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[68%_42%] opacity-75"
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgb(12_9_10/0.6),transparent_78%)]" />
            </div>
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-36 text-center sm:px-6 sm:pt-44">
              <Reveal>
                <p className="text-xs uppercase tracking-[0.22em] text-slate">
                  {L.kicker}
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mx-auto mt-8 max-w-5xl text-5xl leading-[1.04] tracking-tight sm:text-7xl lg:text-8xl">
                  {L.h1a}
                  <span className="block text-navy/50">{L.h1b}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mx-auto mt-8 max-w-xl text-lg text-slate sm:text-xl">
                  {L.lead}
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <nav
                  aria-label={L.navAria}
                  className="mt-12 flex flex-wrap justify-center gap-4 text-sm font-medium"
                >
                  <a
                    href="#resultado"
                    className="rounded-full bg-(--accent) px-7 py-3.5 text-[#0C090A] transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    {L.ctaA}
                  </a>
                  <a
                    href="#detalle"
                    className="rounded-full border border-slate/50 px-7 py-3.5 text-navy transition-colors hover:border-navy"
                  >
                    {L.ctaB}
                  </a>
                </nav>
              </Reveal>
            </div>

            {/* Franja de cifras con divisores */}
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
              <Reveal delay={0.3}>
                <Card
                  as="dl"
                  className="grid overflow-hidden rounded-[2rem] sm:grid-cols-3"
                >
                  {[
                    [
                      L.stat1,
                      <span
                        key="a"
                        className="text-navy/45 line-through decoration-2"
                      >
                        <CountUp value={jumpRaw} decimals={1} prefix="×" />
                      </span>,
                      L.stat1s,
                    ],
                    [
                      L.stat2,
                      <CountUp
                        key="b"
                        value={jumpHarm}
                        decimals={1}
                        prefix="×"
                      />,
                      L.stat2s,
                    ],
                    [
                      L.stat3,
                      <CountUp key="c" value={23} suffix={L.years} />,
                      L.stat3s,
                    ],
                  ].map(([label, value, sub], i) => (
                    <div
                      key={String(label)}
                      className={`relative px-8 py-10 sm:py-12 ${i ? "border-t border-navy/10 sm:border-l sm:border-t-0" : ""}`}
                    >
                      {i === 1 && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 z-10 hidden size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-navy/20 bg-[#0C090A] text-sm text-navy sm:grid"
                        >
                          →
                        </span>
                      )}
                      <dt className={`text-[11px] text-slate ${hud}`}>
                        {label}
                      </dt>
                      <dd className="mt-4 font-heading text-5xl font-bold tracking-tight text-navy sm:text-6xl">
                        {value}
                      </dd>
                      <p className="mt-2 text-sm text-slate">{sub}</p>
                    </div>
                  ))}
                </Card>
                <div className="mt-8 max-w-3xl">
                  <DataNote>{L.note0}</DataNote>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 03 · CÓMO ESTÁ HECHO — cuatro tarjetas verticales + detalle */}
          <section className="relative">
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead kicker={L.k1} title={L.t1}>
                  {L.d1}
                </SectionHead>
              </Reveal>
              <Reveal delay={0.1} className="mt-16">
                <ChapterCards items={chapters} />
              </Reveal>
            </div>
          </section>

          {/* 01 · PRUEBA — consola: controles a la izquierda, visor a la derecha */}
          <section id="resultado" className="relative scroll-mt-24">
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead kicker={L.k2} title={L.t2}>
                  {L.d2}
                </SectionHead>
              </Reveal>
              <Reveal delay={0.1} className="mt-16">
                <HarmonizeChart />
              </Reveal>
              <Reveal delay={0.12} className="mt-16">
                <WhatHappened />
              </Reveal>
              <Reveal delay={0.15} className="mt-8 max-w-3xl">
                <DataNote>{L.note2}</DataNote>
              </Reveal>
            </div>
          </section>

          {/* 03 · VALIDACIÓN */}
          <section className="relative">
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead kicker={L.k3} title={L.t3}>
                  {L.d3}
                </SectionHead>
              </Reveal>
              <div className="mt-20 grid gap-16 sm:grid-cols-3">
                {[
                  [
                    V.r2,
                    <CountUp key="a" value={V.r2} decimals={2} />,
                    L.m1,
                    L.m1d,
                  ],
                  [
                    V.err,
                    <CountUp
                      key="b"
                      value={pctOf(V.err)}
                      prefix="±"
                      suffix=" %"
                    />,
                    L.m2,
                    L.m2d(pctOf(V.err)),
                  ],
                  [
                    V.within,
                    <CountUp key="c" value={pctOf(V.within)} suffix=" %" />,
                    L.m3,
                    L.m3d(pctOf(V.within)),
                  ],
                ].map(([v, big, label, d], i) => (
                  <Reveal key={String(label)} delay={i * 0.1}>
                    <Card className="h-full rounded-3xl px-6 py-12">
                      <DotRing value={Number(v)} label={String(label)}>
                        {big}
                      </DotRing>
                      <p className="mx-auto mt-8 max-w-64 text-center text-sm text-slate">
                        {d}
                      </p>
                    </Card>
                  </Reveal>
                ))}
              </div>
              <div className="mt-14 max-w-3xl">
                <DataNote>{L.note3}</DataNote>
              </div>
            </div>
          </section>

          {/* 05 · DETALLE TÉCNICO */}
          <section id="detalle" className="scroll-mt-24">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead kicker={L.k4} title={L.t4}>
                  {L.d4}
                </SectionHead>
              </Reveal>
              <Reveal delay={0.1} className="mt-16">
                <TechPanel />
              </Reveal>
              <Reveal delay={0.15} className="mt-8 max-w-3xl">
                <DataNote>{L.note4}</DataNote>
              </Reveal>
            </div>
          </section>

          {/* CIERRE */}
          <section className="relative overflow-hidden border-t border-slate/25">
            <div className="relative mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
              <Reveal>
                <p className={`text-xs text-slate ${hud}`}>{L.next}</p>
                <h2 className="mx-auto mt-4 max-w-4xl text-4xl tracking-tight sm:text-6xl">
                  {L.endA}
                  <span className="block text-navy/50">{L.endB}</span>
                </h2>
                <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm font-medium">
                  <Link
                    href="/explorador"
                    className="rounded-full bg-(--accent) px-7 py-3.5 text-[#0C090A] transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    {L.explore}
                  </Link>
                  <Link
                    href="/historia"
                    className="rounded-full border border-slate/50 px-7 py-3.5 text-navy transition-colors hover:border-navy"
                  >
                    {L.back}
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
