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
import { hud, mono, montserrat } from "./fonts";
import Card from "@/components/Card";

export const metadata = {
  title: "Método · Yakana's Team",
  description:
    "Cómo armonizamos los focos de calor de MODIS y VIIRS en un solo registro continuo.",
};

const i11 = SERIES.years.indexOf(FIRST_VIIRS_YEAR - 1);
const jumpRaw = SERIES.raw[i11 + 1] / SERIES.raw[i11];
const jumpHarm = SERIES.harmonized[i11 + 1] / SERIES.harmonized[i11];

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

const chapters: Chapter[] = [
  {
    id: "datos",
    n: "01",
    word: "Datos",
    title: "Qué entra al método",
    blurb: "Los focos de calor de NASA, ordenados por mes y por región.",
    art: imgArt(
      "/metodo/card-datos.jpg",
      "Vista general del Perú desde el satélite Terra, en tonos de la paleta.",
    ),
    summary:
      "Todo parte de los focos de calor que NASA publica. Antes de comparar, hay que prepararlos.",
    content: <DatosContent />,
  },
  {
    id: "solape",
    n: "02",
    word: "Solape",
    title: "Dónde ambos miraron a la vez",
    blurb: "Entre 2012 y 2022 los dos satélites coinciden en el tiempo.",
    art: imgArt(
      "/metodo/card-solape.jpg",
      "Recorte de una escena amazónica con marcas de focos superpuestas.",
    ),
    summary:
      "Ese solape es nuestra piedra de Rosetta: nos enseña cuánto cuenta uno por cada foco del otro.",
    content: <SolapeContent />,
  },
  {
    id: "modelo",
    n: "03",
    word: "Modelo",
    title: "Una traducción por región",
    blurb: "Ajustamos por unidad territorial cuando hay datos suficientes.",
    art: imgArt(
      "/metodo/card-modelo.jpg",
      "Costa y cordillera de los Andes del sur del Perú vistas desde el satélite, en tonos de la paleta.",
    ),
    summary:
      "Los climas del Perú son muy distintos, así que cada región tiene su propia relación entre MODIS y VIIRS.",
    content: <ModeloContent />,
  },
  {
    id: "rango",
    n: "04",
    word: "Rango",
    title: "Decimos cuánto dudamos",
    blurb: "Cada año estimado lleva un intervalo, no un número exacto.",
    art: imgArt(
      "/metodo/card-rango.jpg",
      "Ríos de la Amazonía peruana entre nubes y bruma, en tonos de la paleta.",
    ),
    summary:
      "Un año estimado no es un año medido: por eso cada estimación lleva su rango probable.",
    content: <RangoContent />,
  },
];

export default function Pantalla2() {
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
                  Método · Armonización MODIS + VIIRS
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mx-auto mt-8 max-w-5xl text-5xl leading-[1.04] tracking-tight sm:text-7xl lg:text-8xl">
                  Cambió la cámara,
                  <span className="block text-navy/50">no el fuego.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mx-auto mt-8 max-w-xl text-lg text-slate sm:text-xl">
                  VIIRS cuenta casi nueve veces más focos que MODIS. Lo
                  corregimos para que veinte años de datos hablen el mismo
                  idioma.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <nav
                  aria-label="En esta página"
                  className="mt-12 flex flex-wrap justify-center gap-4 text-sm font-medium"
                >
                  <a
                    href="#resultado"
                    className="rounded-full bg-(--accent) px-7 py-3.5 text-[#0C090A] transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    Ver el antes y después →
                  </a>
                  <a
                    href="#detalle"
                    className="rounded-full border border-slate/50 px-7 py-3.5 text-navy transition-colors hover:border-navy"
                  >
                    Ver el detalle técnico
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
                      "Salto aparente 2011 → 2012",
                      <span
                        key="a"
                        className="text-navy/45 line-through decoration-2"
                      >
                        <CountUp value={jumpRaw} decimals={1} prefix="×" />
                      </span>,
                      "sumando sin ajustar",
                    ],
                    [
                      "Tras armonizar",
                      <CountUp
                        key="b"
                        value={jumpHarm}
                        decimals={1}
                        prefix="×"
                      />,
                      "misma escala VIIRS",
                    ],
                    [
                      "Registro comparable",
                      <CountUp key="c" value={23} suffix=" años" />,
                      "2003 – 2025",
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
                  <DataNote>
                    Cifras calculadas con los datos NASA FIRMS del prototipo
                    (Perú, fuegos de vegetación, confianza nominal y alta). Se
                    actualizan cuando el algoritmo final entregue la serie
                    armonizada.
                  </DataNote>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 03 · CÓMO ESTÁ HECHO — cuatro tarjetas verticales + detalle */}
          <section className="relative">
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead
                  kicker="01 · Cómo está hecho"
                  title="Cuatro pasos, un solo registro"
                >
                  Elige un paso: de los datos crudos al número final con su
                  rango.
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
                <SectionHead
                  kicker="02 · El resultado"
                  title="Antes y después de corregir"
                >
                  Con los datos tal como llegan, el fuego parece explotar en
                  2012 y otra vez en 2018. Cambia entre las dos vistas y
                  compara: corregida, la serie se puede leer año a año.
                </SectionHead>
              </Reveal>
              <Reveal delay={0.1} className="mt-16">
                <HarmonizeChart />
              </Reveal>
              <Reveal delay={0.12} className="mt-16">
                <WhatHappened />
              </Reveal>
              <Reveal delay={0.15} className="mt-8 max-w-3xl">
                <DataNote>
                  Serie anual de focos del Perú calculada con el modelo del
                  prototipo (placeholder). Los años anteriores a 2012 son
                  estimaciones con su rango, no observaciones.
                </DataNote>
              </Reveal>
            </div>
          </section>

          {/* 03 · VALIDACIÓN */}
          <section className="relative">
            <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead
                  kicker="03 · Validación"
                  title="Lo pusimos a prueba a ciegas"
                >
                  Entrenamos con 2012–2019 y escondimos 2020–2022. Luego
                  comparamos lo que el modelo predijo con lo que VIIRS contó de
                  verdad.
                </SectionHead>
              </Reveal>
              <div className="mt-20 grid gap-16 sm:grid-cols-3">
                {[
                  [
                    0.98,
                    <CountUp key="a" value={0.98} decimals={2} />,
                    "Acierto del total mensual (R²)",
                    "Casi toda la variación de un mes a otro en el Perú queda explicada.",
                  ],
                  [
                    0.11,
                    <CountUp key="b" value={11} prefix="±" suffix=" %" />,
                    "Error típico por mes",
                    "En un mes normal, la estimación se aleja poco más de una décima del valor real. El anillo muestra ese 11 %.",
                  ],
                  [
                    0.78,
                    <CountUp key="c" value={78} suffix=" %" />,
                    "Meses dentro del rango",
                    "Casi ocho de cada diez meses reales cayeron dentro del rango que anunciamos.",
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
                <DataNote>
                  Métricas del prototipo, aún sin validar con el pipeline final.
                  Se reemplazan por las del algoritmo de armonización cuando
                  estén disponibles.
                </DataNote>
              </div>
            </div>
          </section>

          {/* 05 · DETALLE TÉCNICO */}
          <section id="detalle" className="scroll-mt-24">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
              <Reveal>
                <SectionHead
                  kicker="04 · Bajo el capó"
                  title="Pruébalo tú mismo"
                >
                  Para quien quiera auditar: juega con el modelo, mira cómo lo
                  validamos, qué supuestos hicimos y los parámetros de cada
                  región, descargables.
                </SectionHead>
              </Reveal>
              <Reveal delay={0.1} className="mt-16">
                <TechPanel />
              </Reveal>
              <Reveal delay={0.15} className="mt-8 max-w-3xl">
                <DataNote>
                  Todo corresponde al modelo del prototipo. Si el algoritmo
                  final cambia (variables, ventana de entrenamiento, filtros),
                  esta sección se actualiza.
                </DataNote>
              </Reveal>
            </div>
          </section>

          {/* CIERRE */}
          <section className="relative overflow-hidden border-t border-slate/25">
            <div className="relative mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
              <Reveal>
                <p className={`text-xs text-slate ${hud}`}>Siguiente paso</p>
                <h2 className="mx-auto mt-4 max-w-4xl text-4xl tracking-tight sm:text-6xl">
                  Con un registro consistente,
                  <span className="block text-navy/50">
                    ya se puede comparar.
                  </span>
                </h2>
                <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm font-medium">
                  <Link
                    href="/pantalla-3"
                    className="rounded-full bg-(--accent) px-7 py-3.5 text-[#0C090A] transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    Explorar los datos →
                  </Link>
                  <Link
                    href="/historia"
                    className="rounded-full border border-slate/50 px-7 py-3.5 text-navy transition-colors hover:border-navy"
                  >
                    Volver a la historia
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
