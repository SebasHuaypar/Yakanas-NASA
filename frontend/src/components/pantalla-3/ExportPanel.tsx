"use client";

import { useState } from "react";
import type { FireDataset, FireZone } from "@/app/pantalla-3/lib/types";
import type { Texts } from "@/app/pantalla-3/lib/i18n";

/** Copia al portapapeles la serie mensual de la región elegida. */
export default function ExportPanel({ zone, ds, t }: { zone: FireZone; ds: FireDataset; t: Texts }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  const build = () => {
    let out = "region_id,month,hotspots_harmonized,range_p10,range_p90,source\n";
    zone.H.forEach((h, i) => {
      const y = ds.startYear + Math.floor(i / 12);
      out += `${zone.id},${y}-${String((i % 12) + 1).padStart(2, "0")},${h.toFixed(1)},${zone.LO[i].toFixed(1)},${zone.HI[i].toFixed(1)},${y <= ds.lastEstimatedYear ? "MODIS_ADJ" : "VIIRS"}\n`;
    });
    return out;
  };

  const copy = async () => {
    const text = build();
    setCsv(text);
    let msg = t.csvCopied;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      msg = t.csvSelect;
    }
    setLabel(msg);
    setTimeout(() => setLabel(null), 2200);
  };

  return (
    <details className="mb-4 animate-rise rounded-2xl border border-snow/15 bg-ink/45 px-5 py-3.5 [animation-delay:1100ms] text-snow backdrop-blur-sm">
      <summary className="cursor-pointer font-semibold">{t.exportTitle}</summary>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer rounded-full border border-snow/20 bg-ink/40 px-4 py-1.5 text-xs font-medium text-snow transition-colors hover:border-snow/60"
        >
          {label ?? t.csvBtn}
        </button>
        <span className="text-[13px] text-snow/60" dangerouslySetInnerHTML={{ __html: t.csvNote }} />
      </div>
      {csv && (
        <textarea
          readOnly
          value={csv}
          aria-label="CSV"
          onFocus={(e) => e.currentTarget.select()}
          className="mt-3 h-30 w-full rounded-lg border border-snow/20 bg-ink/60 p-2 font-mono text-xs text-snow"
        />
      )}
    </details>
  );
}
