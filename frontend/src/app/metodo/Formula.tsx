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

/** Un término: símbolo grande, debajo su valor con esta región y, al final, qué es. */
function Term({
  k,
  focus,
  onFocus,
  label,
  value,
  hot = false,
  children,
}: {
  k: TermKey;
  focus: TermKey | null;
  onFocus: (k: TermKey | null) => void;
  label: string;
  value: string;
  hot?: boolean;
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
      className={`flex min-w-[5.5rem] cursor-help flex-col items-center rounded-2xl border px-3 py-3 outline-none transition-colors ${
        on
          ? hot
            ? "border-(--hot)/70 bg-(--hot)/10"
            : "border-navy bg-navy/10"
          : "border-slate/20 hover:border-slate/50"
      }`}
    >
      <span
        className={`whitespace-nowrap font-heading text-xl font-bold sm:text-2xl ${hot ? "text-(--hot)" : "text-ink"}`}
      >
        {children}
      </span>
      <span
        className={`mt-2 rounded-full px-2.5 py-0.5 font-mono text-xs tabular-nums ${hot ? "bg-(--hot)/15 text-(--hot)" : "bg-white/[0.06] text-navy"}`}
      >
        {value}
      </span>
      <span className={`mt-2 text-[10px] text-slate ${hud}`}>{label}</span>
    </span>
  );
}

const Op = ({ children }: { children: React.ReactNode }) => (
  <span
    aria-hidden
    className="self-center pb-8 font-heading text-xl text-slate sm:text-2xl"
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
  const u = Math.log(modis + 1);
  const w = a + (high ? d : 0) + b * u;
  return (
    <Card as="figure" className="rounded-3xl p-5 sm:p-6">
      <figcaption className={`text-center text-[11px] text-slate ${hud}`}>
        {L.title}
      </figcaption>

      <div
        role="math"
        aria-label={L.aria}
        className="mt-5 flex flex-wrap items-stretch justify-center gap-x-1.5 gap-y-3"
      >
        <Term k="viirs" hot focus={focus} onFocus={onFocus} label={L.est} value={f(w)}>
          ln(VIIRS + 1)
        </Term>
        <Op>=</Op>
        <Term k="a" focus={focus} onFocus={onFocus} label={L.base} value={f(a)}>
          a
        </Term>
        <Op>+</Op>
        <Term k="d" focus={focus} onFocus={onFocus} label={L.high} value={`${f(d)} × ${high ? 1 : 0}`}>
          d · {L.alta}
        </Term>
        <Op>+</Op>
        <Term k="b" focus={focus} onFocus={onFocus} label={L.slope} value={f(b)}>
          b
        </Term>
        <Op>×</Op>
        <Term k="modis" focus={focus} onFocus={onFocus} label={L.obs} value={f(u)}>
          ln(MODIS + 1)
        </Term>
      </div>

      <div className="mt-5 border-t border-slate/20 pt-4">
        <dl className="grid gap-3 text-left sm:grid-cols-3">
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
