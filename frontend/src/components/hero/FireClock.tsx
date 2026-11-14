"use client";

import { useState } from "react";
import { MONTHS_ES, MONTHS_ES_SHORT, formatNumber } from "@/lib/fire-data";

type Props = {
  /** 12 valores: focos promedio por mes en un año típico. */
  data: readonly number[];
  /** Nombre del lugar para el texto de lectura. */
  place?: string;
  size?: number;
};

/**
 * Reloj del fuego: cada tajada es un mes; mientras más larga,
 * más focos de calor en un año típico.
 */
export default function FireClock({ data, place = "el Perú", size = 420 }: Props) {
  const max = Math.max(...data);
  const total = data.reduce((s, v) => s + v, 0);
  const peak = data.indexOf(max);
  const [active, setActive] = useState(peak);

  const cx = size / 2;
  const cy = size / 2;
  const r0 = size * 0.17;
  const r1 = size / 2 - 26;

  const wedges = data.map((v, k) => {
    const a0 = (k / 12) * 2 * Math.PI - Math.PI / 2 + 0.02;
    const a1 = ((k + 1) / 12) * 2 * Math.PI - Math.PI / 2 - 0.02;
    const r = r0 + (r1 - r0) * Math.sqrt(v / max);
    const d = [
      `M${cx + r0 * Math.cos(a0)},${cy + r0 * Math.sin(a0)}`,
      `L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}`,
      `A${r},${r} 0 0 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`,
      `L${cx + r0 * Math.cos(a1)},${cy + r0 * Math.sin(a1)}`,
      `A${r0},${r0} 0 0 0 ${cx + r0 * Math.cos(a0)},${cy + r0 * Math.sin(a0)}Z`,
    ].join("");
    const am = ((k + 0.5) / 12) * 2 * Math.PI - Math.PI / 2;
    return {
      d,
      opacity: 0.35 + 0.65 * Math.sqrt(v / max),
      lx: cx + (r1 + 14) * Math.cos(am),
      ly: cy + (r1 + 14) * Math.sin(am) + 4,
    };
  });

  return (
    <div className="text-snow">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label={`Reloj del fuego de ${place}: focos de calor por mes en un año típico`}
        className="mx-auto block h-auto w-full max-w-[340px]"
      >
        {[0.5, 1].map((f) => (
          <circle
            key={f}
            cx={cx}
            cy={cy}
            r={r0 + (r1 - r0) * f}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeDasharray={f < 1 ? "3 4" : undefined}
          />
        ))}

        {wedges.map((w, k) => (
          <g key={k}>
            <path
              d={w.d}
              role="button"
              tabIndex={0}
              aria-label={`${MONTHS_ES[k]}: ${formatNumber(data[k])} focos`}
              aria-pressed={active === k}
              onMouseEnter={() => setActive(k)}
              onFocus={() => setActive(k)}
              onClick={() => setActive(k)}
              fill="currentColor"
              fillOpacity={w.opacity}
              className={`cursor-pointer outline-none transition-[stroke] duration-200 ${
                active === k ? "stroke-snow" : "stroke-transparent"
              }`}
              strokeWidth={1.5}
            />
            <text
              x={w.lx}
              y={w.ly}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
              fillOpacity={active === k ? 1 : 0.55}
              className="pointer-events-none select-none font-medium"
            >
              {MONTHS_ES_SHORT[k]}
            </text>
          </g>
        ))}

        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize={size * 0.065}
          fill="currentColor"
          className="font-heading font-bold"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          {formatNumber(total)}
        </text>
        <text
          x={cx}
          y={cy + size * 0.05}
          textAnchor="middle"
          fontSize={size * 0.032}
          fill="currentColor"
          fillOpacity={0.6}
        >
          focos al año
        </text>
      </svg>

      <p aria-live="polite" className="mt-3 min-h-[3.2em] text-center text-sm leading-relaxed text-snow/75">
        En un <b className="font-medium text-snow">{MONTHS_ES[active]}</b> típico, los satélites
        detectan unos <b className="font-medium text-snow">{formatNumber(data[active])}</b> focos en{" "}
        {place}
        {active === peak ? " — el mes con más fuego." : "."}
      </p>
    </div>
  );
}
