"use client";

import { useState } from "react";
import { hud } from "./fonts";
import { MAP_VIEWBOX, PERU_REGIONS } from "./peru-map";
import Card from "@/components/Card";
import { useLang } from "@/lib/lang";
import { useMethodData } from "@/lib/method-data";

const ZONES = [
  { id: "todas", en: "All", es: "Todas" },
  { id: "costa", en: "Coast", es: "Costa" },
  { id: "sierra", en: "Highlands", es: "Sierra" },
  { id: "selva", en: "Rainforest", es: "Selva" },
] as const;

const TXT = {
  en: {
    mapAria:
      "Map of Peru by territorial unit: highlighted the ones with their own fit and in gray the ones that use the national fit.",
    own: "own fit",
    nat: "national fit",
    scene: "MODIS vs VIIRS comparator scene",
    filter: "Filter by zone",
    hasOwn: "Has its",
    ownB: "own fit",
    ownEnd: "(enough data).",
    uses: "Uses the",
    natB: "national fit",
    natEnd: ": few months with fire.",
    months: "months",
    pa: "base",
    pd: "high season",
    pb: "slope",
    of: "of",
    unitsOwn: "units with their own fit",
    hover1: "Hover over the map to see each unit's parameters. The remaining ",
    hover2: " do not have enough months with fire and use the national fit.",
    legOwn: "Own fit",
    legNat: "National fit",
  },
  es: {
    mapAria:
      "Mapa del Perú por unidad territorial: resaltadas las que tienen ajuste propio y en gris las que usan el ajuste nacional.",
    own: "ajuste propio",
    nat: "ajuste nacional",
    scene: "Escena del comparador MODIS vs VIIRS",
    filter: "Filtrar por zona",
    hasOwn: "Tiene",
    ownB: "ajuste propio",
    ownEnd: "(datos suficientes).",
    uses: "Usa el",
    natB: "ajuste nacional",
    natEnd: ": pocos meses con fuego.",
    months: "meses",
    pa: "base",
    pd: "temporada alta",
    pb: "pendiente",
    of: "de",
    unitsOwn: "unidades con ajuste propio",
    hover1:
      "Pasa el cursor por el mapa para ver los parámetros de cada una. Las ",
    hover2:
      " restantes no tienen suficientes meses con fuego y usan el ajuste nacional.",
    legOwn: "Ajuste propio",
    legNat: "Ajuste nacional",
  },
};
type Zone = (typeof ZONES)[number]["id"];

/* Recuadro de la escena del comparador, en las mismas unidades del mapa (grados × 20). */
const SCENE = { x: -75.9 * 20, y: 8.1 * 20, w: 2.4 * 20, h: 1.5 * 20 };

/**
 * Mapa del Perú por unidad territorial: naranja = ajuste propio, gris = usa el
 * ajuste nacional. Los chips filtran por zona; al pasar el cursor se ven los
 * parámetros. Marca también dónde está la escena del comparador MODIS vs VIIRS.
 */
export default function PeruFitMap({ compact = false }: { compact?: boolean }) {
  const [lang] = useLang();
  const L = TXT[lang];
  const [zone, setZone] = useState<Zone>("todas");
  const [hover, setHover] = useState<string | null>(null);

  const { fits } = useMethodData();
  const fitById = (id: string) => fits.find((f) => f.id === id);
  const isOwn = (id: string) => fitById(id)?.own ?? false;
  const own = PERU_REGIONS.filter((r) => isOwn(r.id)).length;
  const shown = hover ? PERU_REGIONS.find((r) => r.id === hover) : null;
  const fit = shown ? fitById(shown.id) : null;

  return (
    <div>
      {/* filtro de zona, arriba y a todo el ancho */}
      <div
        role="group"
        aria-label={L.filter}
        className="flex flex-wrap gap-2"
      >
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={zone === z.id}
            onClick={() => setZone(z.id)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              zone === z.id
                ? "border-(--accent) bg-(--accent) text-[#0C090A]"
                : "border-slate/40 text-navy hover:border-navy"
            }`}
          >
            {z[lang]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* mapa: no se mueve ni cambia de tamaño */}
        <div
          className={`relative mx-auto w-full ${compact ? "max-w-[17rem]" : "max-w-md"}`}
        >
          <svg
            viewBox={MAP_VIEWBOX}
            role="img"
            aria-label={L.mapAria}
            className="block h-auto w-full"
          >
            {PERU_REGIONS.map((r) => {
              const active = zone === "todas" || r.zone === zone;
              return (
                <path
                  key={r.id}
                  d={r.d}
                  tabIndex={0}
                  aria-label={`${r.name}: ${isOwn(r.id) ? L.own : L.nat}`}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(r.id)}
                  onBlur={() => setHover(null)}
                  className={`cursor-pointer stroke-(--base) transition-[opacity,fill] duration-200 outline-none ${
                    isOwn(r.id) ? "fill-(--accent)" : "fill-slate"
                  } ${hover === r.id ? "opacity-100" : active ? (isOwn(r.id) ? "opacity-60" : "opacity-35") : "opacity-10"}`}
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <rect
              x={SCENE.x}
              y={SCENE.y}
              width={SCENE.w}
              height={SCENE.h}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className="stroke-navy"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p
            className={`mt-3 flex items-center gap-2 text-[11px] text-slate ${hud}`}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 border border-dashed border-navy"
            />
            {L.scene}
          </p>
        </div>

        {/* tarjeta de datos: altura fija para que nada se desplace */}
        <Card
          aria-live="polite"
          className="flex h-[22rem] flex-col rounded-3xl p-6"
        >
          {shown ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs text-(--accent) ${hud}`}>
                  {ZONES.find((z) => z.id === shown.zone)?.[lang] ?? shown.zone}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] ${hud} ${
                    fit?.own
                      ? "border-(--accent)/60 text-(--accent)"
                      : "border-slate/50 text-slate"
                  }`}
                >
                  {fit?.own ? L.own : L.nat}
                </span>
              </div>
              <h3 className="mt-3 text-3xl leading-tight">{shown.name}</h3>
              <p className="mt-2 text-sm text-slate">
                {fit?.own ? (
                  <>
                    {L.hasOwn} <b className="text-ink">{L.ownB}</b> {L.ownEnd}
                  </>
                ) : (
                  <>
                    {L.uses} <b className="text-ink">{L.natB}</b>
                    {L.natEnd}
                  </>
                )}
              </p>
              {fit && (
                <dl className="mt-auto divide-y divide-slate/20 border-t border-slate/20">
                  {(
                    [
                      ["a", L.pa, fit.a.toFixed(2)],
                      ["d", L.pd, fit.d.toFixed(2)],
                      ["b", L.pb, fit.b.toFixed(2)],
                      ["n", L.months, String(fit.months)],
                    ] as [string, string, string][]
                  ).map(([k, label, v]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-4 py-2"
                    >
                      <dt className="flex min-w-0 items-baseline gap-2">
                        <span className="w-4 font-mono text-sm font-semibold text-navy">
                          {k}
                        </span>
                        <span className={`truncate text-[11px] text-slate ${hud}`}>
                          {label}
                        </span>
                      </dt>
                      <dd className="font-heading text-lg font-bold tabular-nums text-navy">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          ) : (
            <>
              <p className={`text-xs text-(--accent) ${hud}`}>
                {own} {L.of} {PERU_REGIONS.length}
              </p>
              <h3 className="mt-3 text-3xl leading-tight">
                {own} {L.unitsOwn}
              </h3>
              <p className="mt-2 text-sm text-slate">
                {L.hover1}
                {PERU_REGIONS.length - own}
                {L.hover2}
              </p>
              <ul className="mt-auto flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-3 w-3 rounded-sm bg-(--accent)/80" />
                  {L.legOwn}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-3 w-3 rounded-sm bg-slate/50" />
                  {L.legNat}
                </li>
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
