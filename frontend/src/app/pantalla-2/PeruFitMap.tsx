"use client";

import { useState } from "react";
import { hud } from "./fonts";
import { MAP_VIEWBOX, PERU_REGIONS } from "./peru-map";
import { REGION_FITS } from "./regions";

const ZONES = [
  { id: "todas", label: "Todas" },
  { id: "costa", label: "Costa" },
  { id: "sierra", label: "Sierra" },
  { id: "selva", label: "Selva" },
] as const;
type Zone = (typeof ZONES)[number]["id"];

/* Recuadro de la escena del comparador, en las mismas unidades del mapa (grados × 20). */
const SCENE = { x: -75.9 * 20, y: 8.1 * 20, w: 2.4 * 20, h: 1.5 * 20 };

const fitOf = (name: string) => REGION_FITS.find((r) => r.name === name);

/**
 * Mapa del Perú por unidad territorial: naranja = ajuste propio, gris = usa el
 * ajuste nacional. Los chips filtran por zona; al pasar el cursor se ven los
 * parámetros. Marca también dónde está la escena del comparador MODIS vs VIIRS.
 */
export default function PeruFitMap({ compact = false }: { compact?: boolean }) {
  const [zone, setZone] = useState<Zone>("todas");
  const [hover, setHover] = useState<string | null>(null);

  const own = PERU_REGIONS.filter((r) => r.own).length;
  const shown = hover ? PERU_REGIONS.find((r) => r.id === hover) : null;
  const fit = shown ? fitOf(shown.name) : null;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* mapa */}
      <div
        className={`relative mx-auto w-full ${compact ? "max-w-[13rem]" : "max-w-md"}`}
      >
        <svg
          viewBox={MAP_VIEWBOX}
          role="img"
          aria-label="Mapa del Perú por unidad territorial: en naranja las que tienen ajuste propio y en gris las que usan el ajuste nacional."
          className="block h-auto w-full"
        >
          {PERU_REGIONS.map((r) => {
            const active = zone === "todas" || r.zone === zone;
            return (
              <path
                key={r.id}
                d={r.d}
                tabIndex={0}
                aria-label={`${r.name}: ${r.own ? "ajuste propio" : "ajuste nacional"}`}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.id)}
                onBlur={() => setHover(null)}
                className={`cursor-pointer stroke-(--base) transition-[opacity,fill] duration-200 outline-none ${
                  r.own ? "fill-(--accent)" : "fill-slate"
                } ${hover === r.id ? "opacity-100" : active ? (r.own ? "opacity-60" : "opacity-35") : "opacity-10"}`}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {/* escena del comparador */}
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
          Escena del comparador MODIS vs VIIRS
        </p>
      </div>

      {/* controles */}
      <div>
        <div
          role="group"
          aria-label="Filtrar por zona"
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
              {z.label}
            </button>
          ))}
        </div>

        <div
          className="mt-6 min-h-40 glass-dark rounded-3xl p-6"
          aria-live="polite"
        >
          {shown ? (
            <>
              <p className={`text-xs text-(--accent) ${hud}`}>{shown.zone}</p>
              <h3 className="mt-1 text-2xl">{shown.name}</h3>
              <p className="mt-2 text-slate">
                {shown.own ? (
                  <>
                    Tiene <b className="text-ink">ajuste propio</b> (datos
                    suficientes).
                  </>
                ) : (
                  <>
                    Usa el <b className="text-ink">ajuste nacional</b>: pocos
                    meses con fuego.
                  </>
                )}
              </p>
              {fit && (
                <dl className="mt-4 grid grid-cols-4 gap-3 text-sm">
                  {[
                    ["a", fit.a],
                    ["d", fit.d],
                    ["b", fit.b],
                    ["meses", fit.months],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt className={`text-[11px] text-slate ${hud}`}>{k}</dt>
                      <dd className="font-heading text-lg font-bold text-navy">
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          ) : (
            <>
              <p className={`text-xs text-(--accent) ${hud}`}>
                {own} de {PERU_REGIONS.length}
              </p>
              <h3 className="mt-1 text-2xl">
                {own} unidades con ajuste propio
              </h3>
              <p className="mt-2 text-slate">
                Pasa el cursor por el mapa para ver los parámetros de cada una.
                Las {PERU_REGIONS.length - own} restantes no tienen suficientes
                meses con fuego y usan el ajuste nacional.
              </p>
            </>
          )}
        </div>

        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-(--accent)/80" />
            Ajuste propio
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-slate/50" />
            Ajuste nacional
          </li>
        </ul>
      </div>
    </div>
  );
}
