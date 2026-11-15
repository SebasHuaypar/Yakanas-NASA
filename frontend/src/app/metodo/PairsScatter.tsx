"use client";

import { hud } from "./fonts";
import { PAIRS, PAIR_FIT, PAIR_TOTAL } from "./pairs";
import { useLang } from "@/lib/lang";

const W = 380;
const H = 310;
const L = 52;
const R = 12;
const T = 12;
const B = 46;
const MAX = Math.log1p(10000);
const r2 = (n: number) => Math.round(n * 100) / 100; // evita diferencias de redondeo servidor/navegador

const x = (v: number) => r2(L + ((W - L - R) * Math.log1p(v)) / MAX);
const y = (v: number) => r2(T + (H - T - B) * (1 - Math.log1p(v) / MAX));
const TICKS = [0, 10, 100, 1000, 10000];

/**
 * Cada punto es un mes de una región: cuánto contó MODIS (horizontal) y cuánto
 * VIIRS (vertical). Casi todos quedan por encima de la diagonal: VIIRS cuenta
 * más. La línea sólida es la relación que aprendemos y usamos para traducir.
 */
const TXT = {
  en: {
    loc: "en",
    aria: "Scatter of monthly pairs: MODIS count against VIIRS count. Most points sit above the equality diagonal.",
    x: "Hotspots counted by MODIS (per month and region)",
    y: "Hotspots counted by VIIRS",
    same: "would count the same",
    learned: "learned relationship",
    cap1: "Each dot is one month of one region (",
    cap2: " in total; here, a sample). Almost all sit above the dotted line: ",
    capB: "VIIRS counts more",
    cap3: ". The solid line is the rule we use to translate.",
  },
  es: {
    loc: "es",
    aria: "Dispersión de pares mensuales: conteo de MODIS contra conteo de VIIRS. La mayoría de los puntos queda por encima de la diagonal de igualdad.",
    x: "Focos contados por MODIS (por mes y región)",
    y: "Focos contados por VIIRS",
    same: "contarían lo mismo",
    learned: "relación aprendida",
    cap1: "Cada punto es un mes de una región (",
    cap2: " en total; aquí, una muestra). Casi todos quedan por encima de la línea punteada: ",
    capB: "VIIRS cuenta más",
    cap3: ". La línea sólida es la regla con la que traducimos.",
  },
};

export default function PairsScatter() {
  const [lang] = useLang();
  const X = TXT[lang];
  const fitY = (lm: number) => Math.min(MAX, PAIR_FIT.a + PAIR_FIT.b * lm);
  const px = (lm: number) => r2(L + ((W - L - R) * lm) / MAX);
  const py = (lv: number) => r2(T + (H - T - B) * (1 - lv / MAX));
  return (
    <figure className="m-0">
      <p className={`text-[11px] text-slate ${hud}`}>
        Lo que aprendemos del solape
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={X.aria}
        className="mt-3 block h-auto w-full"
      >
        <g className="fill-slate" fontSize="11">
          {TICKS.map((t) => (
            <g key={t}>
              <line
                x1={L}
                x2={W - R}
                y1={y(t)}
                y2={y(t)}
                className="stroke-slate/15"
              />
              <line
                x1={x(t)}
                x2={x(t)}
                y1={T}
                y2={H - B}
                className="stroke-slate/15"
              />
              <text x={L - 8} y={y(t) + 4} textAnchor="end">
                {t === 0 ? "0" : t >= 1000 ? `${t / 1000}k` : t}
              </text>
              <text x={x(t)} y={H - B + 16} textAnchor="middle">
                {t === 0 ? "0" : t >= 1000 ? `${t / 1000}k` : t}
              </text>
            </g>
          ))}
          <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle">
            {X.x}
          </text>
          <text
            transform={`translate(12 ${(T + H - B) / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {X.y}
          </text>
        </g>

        {PAIRS.map(([m, v], i) => (
          <circle
            key={i}
            cx={x(m)}
            cy={y(v)}
            r={1.8}
            className="fill-navy/45"
          />
        ))}

        {/* diagonal: "contar lo mismo" */}
        <line
          x1={px(0)}
          y1={py(0)}
          x2={px(MAX)}
          y2={py(MAX)}
          strokeDasharray="4 4"
          strokeWidth={1.4}
          className="stroke-slate"
        />
        <text
          x={px(MAX) - 6}
          y={py(MAX) + 14}
          textAnchor="end"
          fontSize="11"
          className="fill-slate"
        >
          {X.same}
        </text>
        {/* relación aprendida */}
        <line
          x1={px(0)}
          y1={py(fitY(0))}
          x2={px(MAX)}
          y2={py(fitY(MAX))}
          strokeWidth={2.4}
          strokeLinecap="round"
          className="stroke-navy"
        />
        <text
          x={px(MAX * 0.5)}
          y={py(fitY(MAX * 0.5)) - 10}
          fontSize="12"
          fontWeight={600}
          className="fill-navy"
        >
          {X.learned}
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-slate">
        {X.cap1}
        {PAIR_TOTAL.toLocaleString(X.loc)}
        {X.cap2}
        <b className="text-ink">{X.capB}</b>
        {X.cap3}
      </figcaption>
    </figure>
  );
}
