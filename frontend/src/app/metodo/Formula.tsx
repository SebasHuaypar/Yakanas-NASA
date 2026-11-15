"use client";

import { hud } from "./fonts";
import Card from "@/components/Card";
import { useLang } from "@/lib/lang";

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

const TXT = {
  en: {
    loc: "en",
    title: "The model equation",
    aria: "natural log of VIIRS plus one equals a plus d times high season plus b times natural log of MODIS plus one",
    est: "estimated",
    base: "base",
    high: "high",
    slope: "slope",
    obs: "observed",
    withVals: "With this region's values",
    alta: "high",
    lnT: "Natural logarithm",
    lnD: "Compresses counts so a few huge months don't dominate the fit.",
    highT: "High season",
    highD: "1 in a high-season month, 0 if not.",
    invT: "Back to hotspots",
    invD: "We undo the logarithm and apply the Duan correction:",
    inv: "VIIRS = smear × e^(…) − 1",
  },
  es: {
    loc: "es",
    title: "La ecuación del modelo",
    aria: "logaritmo natural de VIIRS más uno es igual a a más d por temporada alta más b por logaritmo natural de MODIS más uno",
    est: "estimado",
    base: "base",
    high: "alta",
    slope: "pendiente",
    obs: "observado",
    withVals: "Con los valores de esta región",
    alta: "alta",
    lnT: "Logaritmo natural",
    lnD: "Comprime los conteos para que unos pocos meses enormes no dominen el ajuste.",
    highT: "Temporada alta",
    highD: "Vale 1 en un mes de temporada alta y 0 si no.",
    invT: "De vuelta a focos",
    invD: "Se deshace el logaritmo y se aplica la corrección de Duan:",
    inv: "VIIRS = smear × e^(…) − 1",
  },
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
  const [lang] = useLang();
  const L = TXT[lang];
  const f = (n: number) => n.toFixed(2);
  return (
    <Card as="figure" className="rounded-3xl p-5 sm:p-6">
      <figcaption className={`text-center text-[11px] text-slate ${hud}`}>
        {L.title}
      </figcaption>

      <div
        role="math"
        aria-label={L.aria}
        className="mt-4 flex flex-wrap items-start justify-center gap-x-0.5 gap-y-3"
      >
        <Term k="viirs" focus={focus} onFocus={onFocus} label={L.est}>
          ln(VIIRS + 1)
        </Term>
        <Op>=</Op>
        <Term k="a" focus={focus} onFocus={onFocus} label={L.base}>
          a
        </Term>
        <Op>+</Op>
        <Term k="d" focus={focus} onFocus={onFocus} label={L.high}>
          d · {L.alta}
        </Term>
        <Op>+</Op>
        <Term k="b" focus={focus} onFocus={onFocus} label={L.slope}>
          b
        </Term>
        <Op>×</Op>
        <Term k="modis" focus={focus} onFocus={onFocus} label={L.obs}>
          ln(MODIS + 1)
        </Term>
      </div>

      <div className="mt-5 border-t border-slate/20 pt-4">
        <p className={`text-center text-[11px] text-slate ${hud}`}>{L.withVals}</p>
        <p
          aria-hidden
          className="mt-2 break-words text-center font-mono text-sm leading-loose text-ink sm:text-base"
        >
          ln(VIIRS + 1) = <span className="text-navy">{f(a)}</span> +{" "}
          <span className="text-navy">{f(d)}</span> × {high ? 1 : 0} +{" "}
          <span className="text-navy">{f(b)}</span> × ln(
          {modis.toLocaleString(L.loc)} + 1)
        </p>
        <dl className="mt-5 grid gap-3 text-left sm:grid-cols-3">
          {(
            [
              ["ln", L.lnT, L.lnD],
              [L.alta, L.highT, L.highD],
              ["e^(…)", L.invT, `${L.invD} ${L.inv}`],
            ] as [string, string, string][]
          ).map(([sym, t, d]) => (
            <div
              key={t}
              className="rounded-2xl border border-slate/20 bg-white/[0.03] p-4"
            >
              <dt className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold text-navy">
                  {sym}
                </span>
                <span className={`text-[11px] text-slate ${hud}`}>{t}</span>
              </dt>
              <dd className="mt-1.5 text-xs leading-relaxed text-slate">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
