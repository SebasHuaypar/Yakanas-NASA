"use client";

import { apiUrl } from "@/lib/api";
import type { FireZone } from "@/app/explorador/lib/types";
import type { Texts } from "@/app/explorador/lib/i18n";

/** Descarga la serie mensual de la región elegida: es un enlace directo al CSV de la API (sin fetch). */
export default function ExportPanel({ zone, t }: { zone: FireZone; t: Texts }) {
  return (
    <div className="glass mb-4 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-snow [animation-delay:1100ms]">
      <span className="font-semibold">{t.exportTitle}</span>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-snow/60">{t.csvNote}</span>
        <a
          href={apiUrl("/export/mensual.csv", { region_id: zone.id })}
          download="calendario.csv"
          className="cursor-pointer rounded-full border border-snow/20 bg-ink/40 px-4 py-1.5 text-xs font-medium text-snow transition-colors hover:border-snow/60"
        >
          {t.csvBtn}
        </a>
      </div>
    </div>
  );
}
