/** Utilidades de formato y clases compartidas de la pantalla 3 (paleta del proyecto). */

export const fmt = (n: number, loc: string) => Math.round(n).toLocaleString(loc);

export const dec = (x: number, d: number, loc: string) =>
  x.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });

export const CARD =
  "min-w-0 rounded-3xl border border-snow/15 bg-ink/45 p-4 shadow-[0_8px_30px_rgba(0,0,0,.35)] backdrop-blur-sm sm:p-5";

export const H2_SMALL = "text-[12.5px] font-semibold uppercase tracking-[0.14em] text-snow/60";

export const FIELD_SELECT =
  "cursor-pointer rounded-full border border-snow/20 bg-ink/40 px-4 py-1.5 text-xs font-medium text-snow backdrop-blur-sm transition-colors [color-scheme:dark] hover:border-snow/60";

/** Fondo común del mapa y del relieve de la región: un color uniforme y oscuro (#1A1815). */
export const BACKDROP = "relative overflow-hidden rounded-2xl bg-[#1A1815] ring-1 ring-snow/10";
