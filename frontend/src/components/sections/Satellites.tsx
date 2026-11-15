"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Card from "@/components/Card";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import type { ApiFires } from "@/lib/api";
import { useLang } from "@/lib/lang";
import {
  HARMONIZED_HIGH,
  HARMONIZED_LOW,
  HARMONIZED_MONTHLY,
  SENSOR_RATIO,
  VIIRS_START,
} from "@/lib/sensor-series";
import { useApi } from "@/lib/use-api";
import { Lens, pickScene } from "./PixelLens";

const TXT = {
  en: {
    label: "The problem",
    title: "Two satellites, two different pictures",
    lead: "NASA has watched Peru's fire with two cameras. They do not see or count the same way.",
    cards: [
      {
        n: "1",
        t: "They see differently",
        d: "MODIS sees the ground in 1 km squares. VIIRS, in 375 m squares. A small fire fits better in the second.",
      },
      {
        n: "2",
        t: "They count differently",
        d: "Over the same land and years, VIIRS reports about {r} times more hotspots than MODIS.",
      },
      {
        n: "3",
        t: "We put them on one scale",
        d: "We convert MODIS into VIIRS-equivalent hotspots, so twenty years can finally be compared.",
      },
    ],
    drag: "Drag to compare",
    loading: "Loading…",
    error: "Not available right now.",
    retry: "Retry",
    same: "Same land, same years",
    range: "Estimated range",
    cta: "See how we harmonize it",
    ctaNote: "The method step by step, and how we checked it.",
    scale: "1 km",
  },
  es: {
    label: "El problema",
    title: "Dos satélites, dos imágenes distintas",
    lead: "NASA ha vigilado el fuego del Perú con dos cámaras. No ven ni cuentan igual.",
    cards: [
      {
        n: "1",
        t: "Ven distinto",
        d: "MODIS ve el suelo en cuadros de 1 km. VIIRS, en cuadros de 375 m. Un fuego pequeño cabe mejor en el segundo.",
      },
      {
        n: "2",
        t: "Cuentan distinto",
        d: "Sobre la misma tierra y los mismos años, VIIRS reporta unas {r} veces más focos que MODIS.",
      },
      {
        n: "3",
        t: "Los llevamos a una sola escala",
        d: "Convertimos MODIS en focos equivalentes a VIIRS, para poder comparar por fin veinte años.",
      },
    ],
    drag: "Arrastra para comparar",
    loading: "Cargando…",
    error: "No disponible por ahora.",
    retry: "Reintentar",
    same: "Misma tierra, mismos años",
    range: "Rango estimado",
    cta: "Ver cómo lo armonizamos",
    ctaNote: "El método paso a paso y cómo lo comprobamos.",
    scale: "1 km",
  },
};

/* ---------- Tarjeta 3: el registro armonizado en miniatura ---------- */
const MW = 240;
const MH = 84;
const N = HARMONIZED_MONTHLY.length;
const YM = Math.max(...HARMONIZED_HIGH) * 1.05;
const mx = (i: number) => (i / (N - 1)) * MW;
const my = (v: number) => MH - 4 - (v / YM) * (MH - 10);
const f = (n: number) => n.toFixed(1);

function Mini({ rangeLabel }: { rangeLabel: string }) {
  const d = useMemo(() => {
    const line = HARMONIZED_MONTHLY.map(
      (v, i) => `${i ? "L" : "M"}${f(mx(i))},${f(my(v))}`,
    ).join("");
    const up = HARMONIZED_HIGH.slice(0, VIIRS_START + 1)
      .map((v, i) => `${i ? "L" : "M"}${f(mx(i))},${f(my(v))}`)
      .join("");
    const lo = HARMONIZED_LOW.slice(0, VIIRS_START + 1);
    const down = lo
      .map(
        (_, i) =>
          `L${f(mx(lo.length - 1 - i))},${f(my(lo[lo.length - 1 - i]))}`,
      )
      .join("");
    return { line, band: `${up}${down}Z` };
  }, []);
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${MW} ${MH}`}
        role="img"
        aria-label={rangeLabel}
        className="block h-auto w-full"
      >
        <path d={d.band} fill="#F3F9FC" fillOpacity={0.16} />
        <path
          d={d.line}
          fill="none"
          stroke="#F3F9FC"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
      <figcaption className="mt-1.5 flex justify-between text-[10px] text-snow/50">
        <span>2003</span>
        <span>{rangeLabel}</span>
        <span>2025</span>
      </figcaption>
    </figure>
  );
}

/** Sección 3 de la landing: el problema de los dos satélites en tres ideas, con salida al Método. */
export default function Satellites() {
  const [lang] = useLang();
  const t = TXT[lang];
  const [split, setSplit] = useState(0.5);
  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const scene = useMemo(
    () => (fires.data ? pickScene(fires.data) : null),
    [fires.data],
  );
  const ratio = SENSOR_RATIO.toFixed(1).replace(".", lang === "en" ? "." : ",");
  const pct = (1 / SENSOR_RATIO) * 100;

  return (
    <section
      id="problema"
      className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="03" label={t.label} className="mb-10 sm:mb-14" />
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            {t.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-snow/75 sm:text-base">
            {t.lead}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:gap-6">
          {t.cards.map((c, i) => (
            <Reveal
              key={c.n}
              delay={i * 130}
              className={`h-full ${i === 0 ? "md:row-span-2" : ""}`}
            >
              <Card className="flex h-full flex-col rounded-3xl p-5 sm:p-6">
                <span className="grid size-8 place-items-center rounded-full border border-snow/35 text-sm font-bold text-snow/85">
                  {c.n}
                </span>
                <h3 className="mt-4 text-xl text-snow">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-snow/70">
                  {c.d.replace("{r}", ratio)}
                </p>

                {/* visual pequeño de cada idea */}
                <div
                  className={
                    i === 0
                      ? "mx-auto mt-6 flex w-full max-w-[26rem] flex-1 flex-col justify-center"
                      : "mt-4"
                  }
                >
                  {i === 0 &&
                    (scene && fires.data ? (
                      <div>
                        <Lens
                          dets={scene.dets}
                          fx={scene.fx}
                          fy={scene.fy}
                          zoom={2.6}
                          split={split}
                          onSplit={setSplit}
                          aria={t.drag}
                          scaleLabel={t.scale}
                        />
                        <p className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-snow/50">
                          <span>MODIS</span>
                          <span>{t.drag}</span>
                          <span>VIIRS</span>
                        </p>
                      </div>
                    ) : (
                      <div
                        role="status"
                        className="grid aspect-square w-full place-items-center rounded-full text-xs text-snow/55 ring-1 ring-snow/15"
                      >
                        {fires.error ? (
                          <button
                            type="button"
                            onClick={fires.reload}
                            className="cursor-pointer rounded-full border border-snow/30 px-3 py-1.5 text-snow hover:border-snow"
                          >
                            {t.error} {t.retry}
                          </button>
                        ) : (
                          <span className="animate-pulse">{t.loading}</span>
                        )}
                      </div>
                    ))}

                  {i === 1 && (
                    <div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="mb-1 flex justify-between text-snow/70">
                            <span>MODIS</span>
                            <span className="tabular-nums">×1</span>
                          </div>
                          <div className="h-3 rounded-full bg-snow/[0.08]">
                            <div
                              className="h-full rounded-full bg-snow/45"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-snow/70">
                            <span>VIIRS</span>
                            <span className="tabular-nums">×{ratio}</span>
                          </div>
                          <div className="h-3 rounded-full bg-snow/[0.08]">
                            <div
                              className="h-full rounded-full bg-snow"
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-snow/50">
                        {t.same} · 2012–2022
                      </p>
                    </div>
                  )}

                  {i === 2 && <Mini rangeLabel={t.range} />}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="mt-10 text-center">
          <Link
            href="/metodo"
            className="group inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition duration-300 hover:shadow-[0_0_32px_rgb(243_249_252/0.4)]"
          >
            {t.cta}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
          <p className="mt-3 text-xs text-snow/55">{t.ctaNote}</p>
        </Reveal>
      </div>
    </section>
  );
}
