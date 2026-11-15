"use client";

import { useCallback, useState } from "react";

export type TooltipApi = {
  /** Ref de callback del elemento que se muestra (se pasa a <Tooltip>). */
  attach: (el: HTMLDivElement | null) => void;
  show: (e: { clientX: number; clientY: number }, html: string) => void;
  hide: () => void;
};

/**
 * Tooltip flotante compartido por el mapa y el calendario.
 * Se actualiza directamente en el DOM (sin estado de React): mover el mouse no vuelve a pintar
 * ningún componente, lo que mantiene fluidos el calendario (1 200+ celdas) y el mapa.
 */
export function useTooltip(): TooltipApi {
  // Objeto estable creado una sola vez; guarda el elemento en un contenedor propio (no en un useRef).
  const [api] = useState<TooltipApi>(() => {
    const holder: { el: HTMLDivElement | null } = { el: null };
    return {
      attach(el) {
        holder.el = el;
      },
      show(e, html) {
        const el = holder.el;
        if (!el) return;
        if (el.dataset.html !== html) {
          el.innerHTML = html;
          el.dataset.html = html;
        }
        el.style.display = "block";
        const flip = e.clientX > window.innerWidth - el.offsetWidth - 28;
        el.style.left = `${flip ? e.clientX - el.offsetWidth - 14 : e.clientX + 14}px`;
        el.style.top = `${e.clientY + 14}px`;
      },
      hide() {
        if (holder.el) holder.el.style.display = "none";
      },
    };
  });
  return api;
}

export default function Tooltip({ api }: { api: TooltipApi }) {
  const setEl = useCallback((el: HTMLDivElement | null) => api.attach(el), [api]);
  return (
    <div
      ref={setEl}
      role="tooltip"
      style={{ display: "none" }}
      className="pointer-events-none fixed z-[2000] max-w-65 rounded-[10px] bg-ink px-2.5 py-2 text-xs leading-snug text-snow shadow-lg tabular-nums"
    />
  );
}
