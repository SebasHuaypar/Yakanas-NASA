"use client";

import RegionCard from "@/components/hero/RegionCard";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import { REGIONS } from "@/lib/fire-data";
import { useLang } from "@/lib/lang";

/** Reparte los focos del país entre las regiones (porcentaje entero que suma ~100). */
function regionShares() {
  const totals = REGIONS.map((r) => r.data.reduce((s, v) => s + v, 0));
  const all = totals.reduce((s, v) => s + v, 0);
  return totals.map((t) => Math.round((t / all) * 100));
}

/** Sección normal de la landing: tres regiones, tres temporadas de fuego. */
export default function Regions() {
  const [lang] = useLang();
  const L = {
    en: {
      label: "Three fire seasons",
      title: "It burns, but not everywhere at once",
      sub: "The Coast, the Highlands and the Rainforest each have their own fire season. That is why we look at them one by one.",
    },
    es: {
      label: "Tres temporadas de fuego",
      title: "Arde, pero no en todas partes a la vez",
      sub: "La Costa, la Sierra y la Selva tienen cada una su propia temporada de fuego. Por eso las miramos una por una.",
    },
  }[lang];
  const shares = regionShares();

  return (
    <section
      id="regiones"
      className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="02" label={L.label} className="mb-10 sm:mb-14" />
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            {L.title}
          </h2>
          <p className="mt-4 text-sm text-snow/65 sm:text-base">{L.sub}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3 md:gap-6">
          {REGIONS.map((region, i) => (
            <Reveal key={region.id} delay={i * 140} className="h-full">
              <RegionCard region={region} share={shares[i]} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
