"use client";

import { hud } from "./fonts";
import Card from "@/components/Card";

export type TermKey = "viirs" | "a" | "d" | "b" | "modis";

type Props = {
  a: number;
  b: number;
  d: number;
  modis: number;
  high: boolean;
  focus: TermKey | null;
  onFocus: (k: TermKey | null) => void;
};

/** Un término de la ecuación: el símbolo grande y, debajo, qué significa. */
function Term({
  k,
  focus,
  onFocus,
  label,
  children,
}: {
  k: TermKey;
  focus: TermKey | null;
  onFocus: (k: TermKey | null) => void;
  label: string;
  children: React.ReactNode;
}) {
  const on = focus === k;
  return (
    <span
      tabIndex={0}
      onMouseEnter={() => onFocus(k)}
      onMouseLeave={() => onFocus(null)}
      onFocus={() => onFocus(k)}
      onBlur={() => onFocus(null)}
      className={`inline-flex cursor-help flex-col items-center rounded-xl border px-1.5 py-2 outline-none transition-colors ${
        on
          ? "border-navy bg-navy/10"
          : "border-transparent hover:border-slate/40"
      }`}
    >
      <span className="whitespace-nowrap font-heading text-xl font-semibold italic text-navy sm:text-[1.65rem]">
        {children}
      </span>
      <span className={`mt-1 text-[9px] text-slate ${hud}`}>{label}</span>
    </span>
  );
}

const Op = ({ children }: { children: React.ReactNode }) => (
  <span
    aria-hidden
    className="self-start pt-1.5 font-heading text-xl text-slate sm:text-2xl"
  >
    {children}
  </span>
);

/**
 * La ecuación del modelo, tipografiada, con cada término identificado. Pasar el
 * cursor por un término lo resalta aquí y en los pasos y significados de abajo.
 * Debajo, la misma ecuación con los valores reales de la región elegida.
 */
export default function Formula({
  a,
  b,
  d,
  modis,
  high,
  focus,
  onFocus,
}: Props) {
  const f = (n: number) => n.toFixed(2);
  return (
    <Card as="figure" className="m-0 rounded-3xl p-5 sm:p-6">
      <figcaption className={`text-[11px] text-slate ${hud}`}>
        La ecuación del modelo
      </figcaption>

      <div
        role="math"
        aria-label="logaritmo natural de VIIRS más uno es igual a a más d por temporada alta más b por logaritmo natural de MODIS más uno"
        className="mt-4 flex flex-wrap items-start gap-x-0.5 gap-y-3"
      >
        <Term k="viirs" focus={focus} onFocus={onFocus} label="estimado">
          ln(VIIRS + 1)
        </Term>
        <Op>=</Op>
        <Term k="a" focus={focus} onFocus={onFocus} label="base">
          a
        </Term>
        <Op>+</Op>
        <Term k="d" focus={focus} onFocus={onFocus} label="alta">
          d · alta
        </Term>
        <Op>+</Op>
        <Term k="b" focus={focus} onFocus={onFocus} label="pendiente">
          b
        </Term>
        <Op>×</Op>
        <Term k="modis" focus={focus} onFocus={onFocus} label="observado">
          ln(MODIS + 1)
        </Term>
      </div>

      <div className="mt-5 border-t border-slate/20 pt-4">
        <p className={`text-[11px] text-slate ${hud}`}>
          Con los valores de esta región
        </p>
        <p
          aria-hidden
          className="mt-2 break-words font-mono text-sm leading-loose text-ink sm:text-base"
        >
          ln(VIIRS + 1) = <span className="text-navy">{f(a)}</span> +{" "}
          <span className="text-navy">{f(d)}</span> × {high ? 1 : 0} +{" "}
          <span className="text-navy">{f(b)}</span> × ln(
          {modis.toLocaleString("es")} + 1)
        </p>
        <p className="mt-2 text-xs text-slate">
          <b className="text-ink">ln</b> es el logaritmo natural.{" "}
          <b className="text-ink">alta</b> vale 1 en un mes de temporada alta y
          0 si no. Para volver a focos se aplica la operación inversa: VIIRS = e
          <sup>…</sup> − 1.
        </p>
      </div>
    </Card>
  );
}
