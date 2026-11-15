"use client";

import Image from "next/image";
import { memo, useMemo } from "react";
import { DEPT_SHAPES, RELIEF_VIEWBOX, RELIEF_VIEWBOX_STR } from "@/app/explorador/lib/geo";
import { heatColor, periodValue } from "@/app/explorador/lib/stats";
import { BACKDROP, dec, fmt } from "@/app/explorador/lib/ui";
import relief from "@/app/explorador/assets/peru-relief.webp";
import type { FireDataset } from "@/app/explorador/lib/types";
import type { Texts } from "@/app/explorador/lib/i18n";
import type { TooltipApi } from "./Tooltip";

export type MapMode = "dep" | "heat";

/**
 * Mapa de relieve del Perú (imagen estática pregenerada) con los departamentos
 * divididos por líneas blancas. El fuego se ve como un velo navy por
 * departamento, o como cuadros de calor. Clic = elegir; clic otra vez = todo el Perú.
 */
function PeruMap({
  ds,
  t,
  deptName,
  selected,
  onSelect,
  year,
  month,
  mode,
  tooltip,
  onHover,
}: {
  ds: FireDataset;
  t: Texts;
  deptName: (id: string) => string;
  selected: string;
  onSelect: (id: string) => void;
  year: number;
  month: number;
  mode: MapMode;
  tooltip: TooltipApi;
  /** Se llama al pasar el cursor por un departamento (para precargar su relieve). */
  onHover?: (id: string | null) => void;
}) {
  const density = useMemo(() => {
    const m = new Map<string, { v: number; d: number }>();
    for (const z of ds.departments) {
      const v = periodValue(z, ds, year, month);
      m.set(z.id, { v, d: (v / z.area) * 1000 });
    }
    return m;
  }, [ds, year, month]);

  const maxDensity = useMemo(
    () => Math.max(1e-9, ...ds.departments.filter((z) => z.area > 300).map((z) => density.get(z.id)?.d ?? 0)),
    [ds, density],
  );
  const maxHeat = useMemo(() => Math.max(1, ...ds.heat.map((h) => h.count)), [ds]);
  const est = year <= ds.lastEstimatedYear ? ` (${t.est})` : "";

  // El departamento elegido se pinta al final para que su contorno quede encima.
  const ordered = useMemo(
    () => [...DEPT_SHAPES].sort((a, b) => Number(a.id === selected) - Number(b.id === selected)),
    [selected],
  );
  const { w, h } = RELIEF_VIEWBOX;

  return (
    <div>
      <div className={`${BACKDROP} mx-auto w-full max-w-140`} style={{ aspectRatio: `${w} / ${h}` }}>
        <Image
          src={relief}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="pointer-events-none select-none object-contain"
        />
        <svg viewBox={RELIEF_VIEWBOX_STR} role="img" aria-label={t.mapTitle} className="absolute inset-0 h-full w-full">
          {mode === "dep" ? (
            <g>
              {ordered.map((s) => {
                const dd = density.get(s.id)!;
                const sel = selected === s.id;
                const go = () => onSelect(sel ? "PE" : s.id);
                return (
                  <path
                    key={s.id}
                    d={s.d}
                    tabIndex={0}
                    aria-label={deptName(s.id)}
                    fill="#283a54"
                    fillOpacity={0.01 + 0.16 * Math.sqrt(Math.min(1, dd.d / maxDensity))}
                    stroke={sel ? "#f3f9fc" : "#ffffff"}
                    strokeOpacity={sel ? 1 : 0.7}
                    strokeWidth={sel ? 3 : 1}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer outline-none transition-[fill-opacity] duration-300 hover:fill-white/30 focus-visible:fill-white/30"
                    onMouseMove={(e) =>
                      tooltip.show(e, t.tipDep(deptName(s.id), fmt(dd.v, t.loc), t.hsWord, dec(dd.d, 1, t.loc), t.per1000, est))
                    }
                    onMouseEnter={() => onHover?.(s.id)}
                    onMouseLeave={() => {
                      tooltip.hide();
                      onHover?.(null);
                    }}
                    onClick={go}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        go();
                      }
                    }}
                  />
                );
              })}
            </g>
          ) : (
            <>
              {DEPT_SHAPES.map((s) => (
                <path key={s.id} d={s.d} fill="none" stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
              ))}
              <g>
                {ds.heat.map((c, i) => {
                  const f = Math.max(0.1, Math.log1p(c.count) / Math.log1p(maxHeat));
                  const side = 1.6 + 3 * f;
                  return (
                    <rect
                      key={i}
                      x={c.x + (5 - side) / 2}
                      y={c.y + (5 - side) / 2}
                      width={side}
                      height={side}
                      rx={0.9}
                      fill={heatColor(f)}
                      stroke="#ffffff"
                      strokeOpacity={0.55}
                      strokeWidth={0.35}
                      onMouseMove={(e) =>
                        tooltip.show(
                          e,
                          t.tipHeat(fmt(c.count, t.loc), t.hsWord, ds.heatYear, dec(-((c.y + 2.5) / 20), 2, t.loc), dec((c.x + 2.5) / 20, 2, t.loc)),
                        )
                      }
                      onMouseLeave={tooltip.hide}
                    />
                  );
                })}
              </g>
              {selected !== "PE" && (
                <path d={DEPT_SHAPES.find((s) => s.id === selected)?.d} fill="none" stroke="#f3f9fc" strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              )}
            </>
          )}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-snow/60">
        <span>{mode === "dep" ? t.per1000 : t.heatScale}</span>
        <span
          className="h-2.5 w-35 rounded-full border border-snow/20"
          style={{
            background:
              mode === "dep"
                ? "linear-gradient(90deg, rgba(40,58,84,.01), rgba(40,58,84,.2)), #6aa04f"
                : `linear-gradient(90deg, ${heatColor(0.1)}, ${heatColor(0.5)}, ${heatColor(1)})`,
          }}
        />
        <span className="tabular-nums">{mode === "dep" ? `0 – ${fmt(maxDensity, t.loc)}` : `1 – ${fmt(maxHeat, t.loc)}`}</span>
      </div>
    </div>
  );
}

export default memo(PeruMap);
