"use client";

import { type Region } from "@/lib/fire-data";
import { useLang } from "@/lib/lang";
import FireClock from "./FireClock";
import Card from "@/components/Card";

/** Tarjeta de una región: porcentaje de los focos del país, reloj con los meses y una línea de contexto. */
export default function RegionCard({
  region,
  share,
}: {
  region: Region;
  share: number;
}) {
  const [lang] = useLang();
  return (
    <Card
      as="article"
      className="flex h-full w-full flex-col gap-3 p-5 text-center md:p-6"
    >
      <FireClock
        data={region.data}
        place={region.name[lang]}
        compact
        svgClassName="max-w-[260px]"
      />
      <div>
        <h3 className="text-xl text-snow">{region.name[lang]}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-snow/50">
          {region.sub[lang]}
        </p>
        <p className="mt-3 text-sm text-snow">
          <span className="font-heading text-3xl font-bold tabular-nums">
            {share}%
          </span>{" "}
          <span className="text-xs text-snow/60">
            {lang === "en" ? "of Peru's hotspots" : "de los focos del Perú"}
          </span>
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-snow/70">
          {region.desc[lang]}
        </p>
      </div>
    </Card>
  );
}
