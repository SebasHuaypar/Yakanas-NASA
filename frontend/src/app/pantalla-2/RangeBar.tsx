import { hud } from "./fonts";

const nf = new Intl.NumberFormat("es");

/** Barra de rango: valor estimado (marca) dentro de su intervalo probable (franja). */
export default function RangeBar({
  low,
  mid,
  high,
  year,
}: {
  low: number;
  mid: number;
  high: number;
  year: number;
}) {
  const max = high * 1.12;
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <figure className="m-0" aria-label={`Estimación de ${year}: ${nf.format(mid)} focos, con un rango probable de ${nf.format(low)} a ${nf.format(high)}.`}>
      <p className={`text-xs text-slate ${hud}`}>Estimación de {year}</p>
      <div className="relative mt-8 h-3 rounded-full bg-(--mist)">
        <div className="absolute inset-y-0 rounded-full bg-navy/25" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        <div className="absolute -top-3 h-9 w-0.5 bg-navy" style={{ left: pct(mid) }} />
        <span className="absolute -top-9 -translate-x-1/2 font-heading text-xl font-bold text-navy" style={{ left: pct(mid) }}>
          {nf.format(mid)}
        </span>
      </div>
      <div className="relative mt-3 h-5 text-xs text-slate">
        <span className="absolute -translate-x-1/2" style={{ left: pct(low) }}>{nf.format(low)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(high) }}>{nf.format(high)}</span>
      </div>
      <figcaption className="mt-4 text-sm text-slate">
        La marca es la mejor estimación; la franja es el rango probable (p10–p90 en el prototipo).
        Un año estimado no es un año medido.
      </figcaption>
    </figure>
  );
}
