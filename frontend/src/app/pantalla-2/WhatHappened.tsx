import { BY_SENSOR } from "./data";
import { hud } from "./fonts";
import Card from "@/components/Card";

const fmt1 = (n: number) =>
  n.toLocaleString("es", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/** Tres cifras que resumen el salto de 2012 (conteos del prototipo separados por satélite). */
export default function WhatHappened() {
  const { years, modis, viirs } = BY_SENSOR;
  const iV = viirs.findIndex((v) => v > 0);
  const total = (i: number) => modis[i] + viirs[i];
  const tiles = [
    [
      `×${fmt1(modis[iV] / modis[iV - 1])}`,
      "Con un solo satélite",
      `Con solo los datos de MODIS, de ${years[iV - 1]} a ${years[iV]} el conteo apenas cambia.`,
    ],
    [
      `×${fmt1(total(iV) / total(iV - 1))}`,
      "Sumando los dos",
      "El mismo año, al sumar ambos registros, parece un aumento enorme.",
    ],
    [
      `${Math.round((viirs[iV] / total(iV)) * 100)} %`,
      "Lo aporta el sensor nuevo",
      `De la suma de ${years[iV]}, ese porcentaje viene de VIIRS, que recién empieza.`,
    ],
  ];
  return (
    <div>
      <p className={`text-[11px] text-slate ${hud}`}>Qué pasó en {years[iV]}</p>
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
