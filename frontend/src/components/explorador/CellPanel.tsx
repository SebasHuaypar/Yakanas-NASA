"use client";

import { useMemo, useState } from "react";
import { nearestTown, type Place } from "@/app/explorador/lib/places";
import type { SpotCell } from "@/app/explorador/lib/terrain-scene";
import type { Texts } from "@/app/explorador/lib/i18n";
import { fmt } from "@/app/explorador/lib/ui";
import Seg from "./Seg";

const BTN =
  "cursor-pointer rounded-full border border-snow/20 bg-ink/50 px-3 py-1 text-xs font-medium text-snow transition-colors hover:border-snow/60";

type Sort = "hs" | "alt";

const coords = (c: SpotCell) => `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`;
const mapsUrl = (c: SpotCell) =>
  `https://www.google.com/maps/search/?api=1&query=${c.lat.toFixed(5)},${c.lon.toFixed(5)}`;

/** Copia al portapapeles; si el navegador no deja usar la API moderna, prueba el método clásico. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Detalle fijo de las celdas elegidas con un clic en el mapa (una o un grupo cercano): la lista completa,
 * ordenable por focos o altitud. Pulsar una fila la resalta en el mapa y muestra sus utilidades
 * (copiar coordenadas, abrir en Google Maps). "Copiar resumen" copia todo en texto plano.
 */
export default function CellPanel({
  cells,
  focus,
  onFocus,
  onClose,
  towns,
  zoneName,
  when,
  t,
}: {
  cells: SpotCell[];
  focus: number | null;
  onFocus: (id: number) => void;
  onClose: () => void;
  towns: Place[];
  zoneName: string;
  when: string;
  t: Texts;
}) {
  const [sort, setSort] = useState<Sort>("hs");
  const [copied, setCopied] = useState<{ key: string; ok: boolean } | null>(
    null,
  );
  const f = (n: number) => fmt(n, t.loc);

  const rows = useMemo(
    () =>
      [...cells]
        .sort(
          sort === "hs"
            ? (a, b) => b.hs - a.hs || b.alt - a.alt
            : (a, b) => b.alt - a.alt,
        )
        .map((c) => ({ c, near: nearestTown(c, towns) })),
    [cells, sort, towns],
  );
  const total = cells.reduce((s, c) => s + c.hs, 0);
  const title =
    cells.length === 1
      ? t.cellHs(f(total), total)
      : t.cellGroup(cells.length, t.cellHs(f(total), total));
  const nearTxt = (n: { name: string; km: number } | null) =>
    n ? t.cellNear(n.name, f(n.km), n.km < 1) : "";

  const copy = async (key: string, text: string) => {
    const ok = await copyText(text);
    setCopied({ key, ok });
    setTimeout(() => setCopied((c) => (c?.key === key ? null : c)), 1600);
  };
  const copyLabel = (key: string, label: string) =>
    copied?.key === key ? (copied.ok ? t.copied : t.copyFail) : label;

  const summary = () => {
    const lines = [`${zoneName} · ${when}`, title];
    for (const { c, near } of rows)
      lines.push(
        `• ${t.cellHs(f(c.hs), c.hs)} · ${f(c.alt)} m · ${coords(c)}${near ? ` · ${nearTxt(near)}` : ""}`,
      );
    if (cells.length === 1) lines.push(mapsUrl(cells[0]));
    lines.push(t.cellSumNote);
    return lines.join("\n");
  };

  return (
    <div className="mt-3 rounded-2xl border border-snow/15 bg-ink/45 p-3 text-snow backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto text-sm">
          <b className="font-semibold">{title}</b>
          <span className="text-snow/60"> · {when}</span>
        </div>
        <div className="flex items-center gap-2">
          {cells.length > 1 && (
            <Seg<Sort>
              label={t.sortLabel}
              value={sort}
              onChange={setSort}
              options={[
                { value: "hs", label: t.sortHs },
                { value: "alt", label: t.sortAlt },
              ]}
            />
          )}
          <button
            type="button"
            className={BTN}
            onClick={() => copy("summary", summary())}
          >
            {copyLabel("summary", t.copySummary)}
          </button>
          <button
            type="button"
            aria-label={t.closePanel}
            title={t.closePanel}
            onClick={onClose}
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-snow/20 bg-ink/50 text-sm text-snow/80 transition-colors hover:border-snow/60 hover:text-snow"
          >
            ×
          </button>
        </div>
      </div>

      <ul className="mt-2 max-h-60 overflow-y-auto pr-1">
        {rows.map(({ c, near }) => {
          const on = c.id === focus;
          return (
            <li key={c.id} className={`rounded-xl ${on ? "bg-snow/10" : ""}`}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onFocus(c.id)}
                className="flex w-full cursor-pointer flex-wrap items-baseline gap-x-2 rounded-xl px-2.5 py-1.5 text-left text-[13px] tabular-nums transition-colors hover:bg-snow/5"
              >
                <span className="font-semibold">{t.cellHs(f(c.hs), c.hs)}</span>
                <span className="text-snow/70">· {f(c.alt)} m</span>
                <span className="text-snow/50">· {coords(c)}</span>
                {near && (
                  <span className="text-snow/50">· {nearTxt(near)}</span>
                )}
              </button>
              {on && (
                <div className="flex flex-wrap gap-2 px-2.5 pb-2">
                  <button
                    type="button"
                    className={BTN}
                    onClick={() => copy(`c${c.id}`, coords(c))}
                  >
                    {copyLabel(`c${c.id}`, t.copyCoords)}
                  </button>
                  <a
                    href={mapsUrl(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BTN}
                  >
                    {t.openMaps} ↗
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
