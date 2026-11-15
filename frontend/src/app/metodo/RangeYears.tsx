import { hud } from "./fonts";

type Props = { years: number[]; mid: number[]; low: number[]; high: number[] };

const nf = new Intl.NumberFormat("es");

/** Rango probable de cada año estimado (sin VIIRS): barra = rango, punto = estimación. */
export default function RangeYears({ years, mid, low, high }: Props) {
  const W = 640;
  const H = 230;
  const L = 52;
  const B = 28;
  const T = 14;
  const max = Math.ceil((Math.max(...high) * 1.05) / 20000) * 20000;
  const step = (W - L - 10) / years.length;
  const x = (i: number) => L + step * i + step / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return (
    <figure className="m-0">
      <p className={`text-xs text-slate ${hud}`}>
        Años estimados · {years[0]}–{years[years.length - 1]}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Rango probable de focos para cada año estimado, de ${years[0]} a ${years[years.length - 1]}.`}
        className="mt-3 block h-auto w-full"
      >
        <g className="fill-slate" fontSize="12">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={L}
                x2={W - 6}
                y1={y(t)}
                y2={y(t)}
                className="stroke-slate/20"
              />
              <text x={L - 8} y={y(t) + 4} textAnchor="end">
                {t === 0 ? "0" : `${Math.round(t / 1000)} mil`}
              </text>
            </g>
          ))}
          {years.map((yr, i) => (
            <text key={yr} x={x(i)} y={H - 8} textAnchor="middle">
              {yr}
            </text>
          ))}
        </g>
        {years.map((yr, i) => (
          <g key={yr}>
            <rect
              x={x(i) - 9}
              y={y(high[i])}
              width={18}
              height={Math.max(2, y(low[i]) - y(high[i]))}
              rx={9}
              className="fill-navy/25"
            >
              <title>{`${yr}: ${nf.format(low[i])} – ${nf.format(high[i])}`}</title>
            </rect>
            <circle cx={x(i)} cy={y(mid[i])} r={5} className="fill-navy" />
          </g>
        ))}
      </svg>
      <figcaption className="mt-3 text-sm text-slate">
        Desde 2012 no hay barra: esos años se miden directo con VIIRS, sin
        necesidad de estimar.
      </figcaption>
    </figure>
  );
}
