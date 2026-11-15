"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import {
  HARMONIZED_MONTHLY,
  MODIS_MONTHLY,
  OVERLAP_END,
  SENSOR_FIRST_YEAR,
  SENSOR_RATIO,
  VIIRS_MONTHLY,
  VIIRS_START,
} from "@/lib/sensor-series";

/* ---------- Geometría del gráfico (viewBox 1000 x 380) ---------- */
const W = 1000;
const H = 380;
const PAD = { l: 52, r: 16, t: 18, b: 36 };
const N = MODIS_MONTHLY.length;
const YMAX = Math.max(...HARMONIZED_MONTHLY, ...VIIRS_MONTHLY) * 1.06;
const BASE = H - PAD.b;

const x = (t: number) => PAD.l + (t / (N - 1)) * (W - PAD.l - PAD.r);
const y = (v: number) => BASE - (v / YMAX) * (BASE - PAD.t);
const f = (n: number) => n.toFixed(1);

const line = (series: readonly number[], from = 0) =>
  series
    .map((v, i) => `${i === 0 ? "M" : "L"}${f(x(from + i))},${f(y(v))}`)
    .join("");

const STEPS = [
  {
    title: "Mismo mes, dos miradas",
    text: "Entre 2012 y 2022 los dos satélites miraron el mismo país, pero contaron distinto: VIIRS suma casi cinco veces más focos.",
  },
  {
    title: "Aprendemos la conversión",
    text: "Con esos años aprendemos cuánto vale un foco de MODIS en la escala de VIIRS, región por región (Costa, Andes y Amazonía) y según la temporada.",
  },
  {
    title: "Un solo registro",
    text: "Así llevamos la mirada nítida de VIIRS hasta 2003, con el rango de incertidumbre de los años en que solo había MODIS.",
  },
] as const;

const CHIPS = [
  { v: "0,98", l: "R² en meses que el modelo nunca vio" },
  { v: "2012–19", l: "años para aprender; 2020–22 para comprobar" },
  { v: "25", l: "departamentos con registro 2003–2025" },
] as const;

/**
 * La solución: armonizar MODIS y VIIRS en un solo registro.
 * Sección normal: al llegar, los tres pasos se reproducen solos (uno cada pocos segundos) y el
 * usuario puede tocar cualquier paso para verlo. Cierra con las métricas y el botón.
 */
export default function Harmonization() {
  const chart = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [step, setStep] = useState(-1); // -1: aún no empieza

  const paths = useMemo(() => {
    // Rango de incertidumbre (~ ±20 %) solo donde el registro se estima desde MODIS
    const est = HARMONIZED_MONTHLY.slice(0, VIIRS_START + 1);
    const up = est
      .map((v, i) => `${i === 0 ? "M" : "L"}${f(x(i))},${f(y(v * 1.2))}`)
      .join("");
    const down = est
      .map(
        (_, i) =>
          `L${f(x(est.length - 1 - i))},${f(y(est[est.length - 1 - i] * 0.8))}`,
      )
      .join("");
    return {
      modis: line(MODIS_MONTHLY),
      viirs: line(VIIRS_MONTHLY, VIIRS_START),
      harm: line(HARMONIZED_MONTHLY),
      band: `${up}${down}Z`,
    };
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Reproducción automática al llegar a la sección (una sola vez)
  useEffect(() => {
    const el = chart.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setStep(0);
        timers.current = [
          window.setTimeout(() => setStep(1), 4200),
          window.setTimeout(() => setStep(2), 8600),
        ];
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const choose = (i: number) => {
    clearTimers();
    setStep(i);
  };

  const years = [2003, 2007, 2011, 2015, 2019, 2023];
  const draw = (on: boolean, delay = 0) =>
    ({
      strokeDasharray: 1,
      strokeDashoffset: on ? 0 : 1,
      transition: `stroke-dashoffset 1.8s ease-in-out ${delay}ms`,
    }) as const;

  return (
    <section
      id="solucion"
      className="relative px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-44"
    >
      <SectionDivider
        index="04"
        label="La solución"
        className="mb-12 sm:mb-16"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        {/* Texto: título y los tres pasos del método */}
        <Reveal className="lg:w-[34%] lg:pt-6">
          <h2 className="text-[1.75rem] leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
            Los unimos en un solo registro justo
          </h2>
          <ol className="mt-6 space-y-2 sm:mt-8">
            {STEPS.map((s, i) => {
              const active = step === i;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-pressed={active}
                    className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition duration-300 sm:p-4 ${
                      active
                        ? "border-snow/25 bg-snow/[0.07] opacity-100"
                        : "border-transparent opacity-55 hover:opacity-90"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-heading text-xs font-bold ${
                        active
                          ? "border-snow bg-snow text-ink"
                          : "border-snow/30 text-snow"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-snow sm:text-base">
                        {s.title}
                      </span>
                      <span
                        className={`block overflow-hidden text-xs leading-relaxed text-snow/70 transition-all duration-500 sm:text-sm ${
                          active
                            ? "mt-1 max-h-40 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        {s.text}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Reveal>

        {/* Gráfico */}
        <div className="min-w-0 flex-1">
          <Reveal delay={150}>
            <div
              ref={chart}
              className="rounded-[1.75rem] border border-snow/15 bg-ink/50 p-3 shadow-[0_12px_60px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(243_249_252/0.14)] backdrop-blur-xl sm:p-5"
            >
              <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label="Focos de calor por mes en Perú, 2003–2025: MODIS, VIIRS y el registro armonizado"
                className="block h-auto w-full text-snow"
              >
                {/* Años en que ambos satélites estaban activos */}
                <rect
                  x={x(VIIRS_START)}
                  y={PAD.t}
                  width={x(OVERLAP_END) - x(VIIRS_START)}
                  height={BASE - PAD.t}
                  fill="currentColor"
                  fillOpacity={0.07}
                  style={{
                    opacity: step >= 0 && step < 2 ? 1 : 0,
                    transition: "opacity 0.8s ease",
                  }}
                />
                <text
                  x={(x(VIIRS_START) + x(OVERLAP_END)) / 2}
                  y={PAD.t + 14}
                  textAnchor="middle"
                  fontSize={13}
                  fill="currentColor"
                  style={{
                    opacity: step >= 0 && step < 2 ? 0.6 : 0,
                    transition: "opacity 0.8s ease",
                  }}
                >
                  Ambos satélites activos
                </text>

                {/* Ejes */}
                <line
                  x1={PAD.l}
                  y1={BASE}
                  x2={W - PAD.r}
                  y2={BASE}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                />
                {years.map((yr) => (
                  <g key={yr}>
                    <line
                      x1={x((yr - SENSOR_FIRST_YEAR) * 12)}
                      y1={BASE}
                      x2={x((yr - SENSOR_FIRST_YEAR) * 12)}
                      y2={BASE + 5}
                      stroke="currentColor"
                      strokeOpacity={0.35}
                    />
                    <text
                      x={x((yr - SENSOR_FIRST_YEAR) * 12)}
                      y={BASE + 22}
                      textAnchor="middle"
                      fontSize={13}
                      fill="currentColor"
                      fillOpacity={0.55}
                    >
                      {yr}
                    </text>
                  </g>
                ))}

                {/* Rango de incertidumbre (antes de 2012) */}
                <path
                  d={paths.band}
                  fill="currentColor"
                  fillOpacity={0.14}
                  style={{
                    opacity: step >= 2 ? 1 : 0,
                    transition: "opacity 1.2s ease 0.8s",
                  }}
                />

                {/* Series crudas */}
                <g
                  style={{
                    opacity: step >= 2 ? 0.25 : 1,
                    transition: "opacity 1s ease",
                  }}
                >
                  <g
                    style={{
                      transform: `scaleY(${step >= 1 ? SENSOR_RATIO : 1})`,
                      transformBox: "view-box",
                      transformOrigin: `0px ${BASE}px`,
                      transition:
                        "transform 1.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                  >
                    <path
                      d={paths.modis}
                      pathLength={1}
                      fill="none"
                      stroke="#4C6679"
                      strokeWidth={2.4}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={draw(step >= 0)}
                    />
                  </g>
                  <path
                    d={paths.viirs}
                    pathLength={1}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.9}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    style={draw(step >= 0, 500)}
                  />
                </g>

                {/* Registro armonizado */}
                <path
                  d={paths.harm}
                  pathLength={1}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  style={draw(step >= 2, 400)}
                />

                {/* Leyenda */}
                <g fontSize={13} fill="currentColor">
                  <circle cx={PAD.l + 8} cy={PAD.t + 6} r={4} fill="#4C6679" />
                  <text x={PAD.l + 20} y={PAD.t + 10} fillOpacity={0.75}>
                    MODIS
                  </text>
                  <circle
                    cx={PAD.l + 84}
                    cy={PAD.t + 6}
                    r={4}
                    fill="currentColor"
                    fillOpacity={0.9}
                  />
                  <text x={PAD.l + 96} y={PAD.t + 10} fillOpacity={0.75}>
                    VIIRS · armonizado
                  </text>
                </g>
              </svg>
            </div>
          </Reveal>

          {/* Métricas y botón */}
          <Reveal delay={250} className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            {CHIPS.map((c) => (
              <div
                key={c.v}
                className="rounded-2xl border border-snow/15 bg-snow/[0.05] px-3 py-3 text-center backdrop-blur-md sm:px-4"
              >
                <p className="font-heading text-xl font-bold text-snow sm:text-3xl">
                  {c.v}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-snow/60 sm:text-xs">
                  {c.l}
                </p>
              </div>
            ))}
          </Reveal>
          <Reveal
            delay={350}
            className="mt-6 flex justify-center lg:justify-start"
          >
            <Link
              href="/pantalla-2"
              className="group inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition duration-300 hover:shadow-[0_0_32px_rgb(243_249_252/0.4)]"
            >
              Explorar los datos
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
