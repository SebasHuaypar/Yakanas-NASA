"use client";

import { BY_SENSOR } from "./data";
import { hud } from "./fonts";
import Card from "@/components/Card";
import { useLang } from "@/lib/lang";

const TXT = {
  en: {
    loc: "en",
    t1: "With a single satellite",
    d1: (a: number, b: number) =>
      `With MODIS data alone, from ${a} to ${b} the count barely changes.`,
    t2: "Adding both",
    d2: "The same year, adding both records looks like a huge increase.",
    t3: "Comes from the new sensor",
    d3: (y: number) =>
      `Of the ${y} total, that share comes from VIIRS, which is just starting.`,
    head: (y: number) => `What happened in ${y}`,
  },
  es: {
    loc: "es",
    t1: "Con un solo satélite",
    d1: (a: number, b: number) =>
      `Con solo los datos de MODIS, de ${a} a ${b} el conteo apenas cambia.`,
    t2: "Sumando los dos",
    d2: "El mismo año, al sumar ambos registros, parece un aumento enorme.",
    t3: "Lo aporta el sensor nuevo",
    d3: (y: number) =>
      `De la suma de ${y}, ese porcentaje viene de VIIRS, que recién empieza.`,
    head: (y: number) => `Qué pasó en ${y}`,
  },
};

/** Tres cifras que resumen el salto de 2012 (conteos crudos reales separados por satélite). */
export default function WhatHappened() {
  const [lang] = useLang();
  const L = TXT[lang];
  const fmt1 = (n: number) =>
    n.toLocaleString(L.loc, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  const { years, modis, viirs } = BY_SENSOR;
  const iV = viirs.findIndex((v) => v > 0);
  const total = (i: number) => modis[i] + viirs[i];
  const tiles = [
    [
      `×${fmt1(modis[iV] / modis[iV - 1])}`,
      L.t1,
      L.d1(years[iV - 1], years[iV]),
    ],
    [`×${fmt1(total(iV) / total(iV - 1))}`, L.t2, L.d2],
    [`${Math.round((viirs[iV] / total(iV)) * 100)} %`, L.t3, L.d3(years[iV])],
  ];
  return (
    <div>
      <p className={`text-[11px] text-slate ${hud}`}>{L.head(years[iV])}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {tiles.map(([v, t, d]) => (
          <Card key={t} className="rounded-3xl p-7">
            <p className="font-heading text-5xl font-bold text-navy">{v}</p>
            <p className="mt-3 font-medium text-ink">{t}</p>
            <p className="mt-1 text-sm text-slate">{d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
