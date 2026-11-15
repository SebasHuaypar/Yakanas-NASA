"use client";

import { useEffect, useState } from "react";
import { MONTHS_ES, MONTHS_ES_SHORT, formatNumber } from "@/lib/fire-data";

type Props = {
  /** 12 valores: focos promedio por mes en un año típico. */
  data: readonly number[];
  /** Nombre del lugar para el texto de lectura. */
  place?: string;
  size?: number;
  /** Recorre los meses solo hasta que el usuario interactúa. */
  autoPlay?: boolean;
  /** Clases del SVG (por ejemplo para limitar su tamaño). */
  svgClassName?: string;
  /** Versión para tarjetas: sin párrafo de lectura; el centro muestra el mes activo. */
  compact?: boolean;
};

/**
 * Reloj del fuego: cada tajada es un mes; mientras más larga,
 * más focos de calor en un año típico.
 */
export default function FireClock({
  data,
  place = "el Perú",
  size = 420,
  autoPlay = false,
  svgClassName = "max-w-[340px]",
  compact = false,
}: Props) {
  const max = Math.max(...data);
  const total = data.reduce((s, v) => s + v, 0);
  const peak = data.indexOf(max);
  const [active, setActive] = useState(peak);
  const [auto, setAuto] = useState(autoPlay);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setActive((a) => (a + 1) % data.length), 1800);
    return () => clearInterval(id);
  }, [auto, data.length]);

  const pick = (k: number) => {
    setAuto(false);
    setActive(k);
  };

  const cx = size / 2;
  const cy = size / 2;
  const r0 = size * 0.17;
  const r1 = size / 2 - 26;
  // Redondeo: servidor y navegador calculan seno/coseno distinto en los últimos decimales
  const f = (n: number) => n.toFixed(2);

  const wedges = data.map((v, k) => {
    const a0 = (k / 12) * 2 * Math.PI - Math.PI / 2 + 0.02;
    const a1 = ((k + 1) / 12) * 2 * Math.PI - Math.PI / 2 - 0.02;
    const r = r0 + (r1 - r0) * Math.sqrt(v / max);
    const d = [
      `M${f(cx + r0 * Math.cos(a0))},${f(cy + r0 * Math.sin(a0))}`,
      `L${f(cx + r * Math.cos(a0))},${f(cy + r * Math.sin(a0))}`,
      `A${f(r)},${f(r)} 0 0 1 ${f(cx + r * Math.cos(a1))},${f(cy + r * Math.sin(a1))}`,
      `L${f(cx + r0 * Math.cos(a1))},${f(cy + r0 * Math.sin(a1))}`,
      `A${f(r0)},${f(r0)} 0 0 0 ${f(cx + r0 * Math.cos(a0))},${f(cy + r0 * Math.sin(a0))}Z`,
    ].join("");
    const am = ((k + 0.5) / 12) * 2 * Math.PI - Math.PI / 2;
    return {
      d,
      opacity: 0.35 + 0.65 * Math.sqrt(v / max),
      lx: Number(f(cx + (r1 + 14) * Math.cos(am))),
      ly: Number(f(cy + (r1 + 14) * Math.sin(am) + 4)),
    };
  });

  return (
    <div className="text-snow">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label={`Reloj del fuego de ${place}: focos de calor por mes en un año típico`}
        className={`mx-auto block h-auto w-full ${svgClassName}`}
        onMouseLeave={() => autoPlay && setAuto(true)}
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
              onMouseEnter={() => pick(k)}
              onFocus={() => pick(k)}
              onClick={() => pick(k)}
              fill="currentColor"
              fillOpacity={active === k ? 1 : w.opacity * 0.7}
              className={`wedge-grow cursor-pointer outline-none transition-[stroke,fill-opacity] duration-300 ${
                active === k ? "stroke-snow" : "stroke-transparent"
              }`}
              strokeWidth={1.5}
              style={{ ["--i" as string]: k }}
            />
            <text
              x={w.lx}
              y={w.ly}
              textAnchor="middle"
              fontSize={compact ? 19 : 12}
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
          {formatNumber(compact ? data[active] : total)}
        </text>
        <text
          x={cx}
          y={cy + size * 0.05}
          textAnchor="middle"
          fontSize={size * 0.032}
          fill="currentColor"
          fillOpacity={0.6}
        >
          {compact ? MONTHS_ES[active] : "focos al año"}
        </text>
      </svg>

      {!compact && (
        <p
          aria-live="polite"
          className="mt-3 min-h-[3.2em] text-center text-sm leading-relaxed text-snow/75"
        >
          En un <b className="font-medium text-snow">{MONTHS_ES[active]}</b>{" "}
          típico, los satélites detectan unos{" "}
          <b className="font-medium text-snow">{formatNumber(data[active])}</b>{" "}
          focos en {place}
          {active === peak ? " — el mes con más fuego." : "."}
        </p>
      )}
    </div>
  );
}
