import { type Region } from "@/lib/fire-data";
import FireClock from "./FireClock";

/** Tarjeta de una región: porcentaje de los focos del país, reloj con los meses y una línea de contexto. */
export default function RegionCard({
  region,
  share,
}: {
  region: Region;
  share: number;
}) {
  return (
    <article className="flex h-full w-full flex-col gap-3 rounded-3xl border border-snow/15 bg-snow/[0.06] p-5 text-center shadow-[0_12px_50px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(243_249_252/0.14)] backdrop-blur-xl md:p-6">
      <FireClock
        data={region.data}
        place={region.name}
        compact
        svgClassName="max-w-[260px]"
      />
      <div>
        <h3 className="text-xl text-snow">{region.name}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-snow/50">
          {region.sub}
        </p>
        <p className="mt-3 text-sm text-snow">
          <span className="font-heading text-3xl font-bold tabular-nums">
            {share}%
          </span>{" "}
          <span className="text-xs text-snow/60">de los focos del Perú</span>
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-snow/70">
          {region.desc}
        </p>
      </div>
    </article>
  );
}
