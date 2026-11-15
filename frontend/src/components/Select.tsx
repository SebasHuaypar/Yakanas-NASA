"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  /** `id` del botón: sirve para enlazarlo con un `<label htmlFor>`. */
  id?: string;
  ariaLabel?: string;
  /** `md`: campo ancho de formulario. `sm`: píldora compacta para filtros. */
  size?: "md" | "sm";
  className?: string;
};

type Pos = { left: number; width: number; top?: number; bottom?: number };

/**
 * Selector propio con el estilo de cristal de la web (reemplaza al `<select>` nativo).
 * Teclado: flechas, Inicio/Fin, Enter o Espacio para elegir, Esc para cerrar y letras para saltar.
 * Usa colores fijos (no tokens) para verse igual en todas las pantallas. La lista se dibuja en el
 * `body`, así ninguna tarjeta con `overflow` la recorta.
 */
export default function Select<T extends string | number>({
  value,
  onChange,
  options,
  id,
  ariaLabel,
  size = "md",
  className = "",
}: Props<T>) {
  const autoId = useId();
  const btnId = id ?? autoId;
  const listId = `${btnId}-list`;
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);

  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[selected];

  const openList = useCallback(() => {
    const el = btn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const up = below < 270 && r.top > below;
    setPos(
      up
        ? {
            bottom: window.innerHeight - r.top + 6,
            left: r.left,
            width: r.width,
          }
        : { top: r.bottom + 6, left: r.left, width: r.width },
    );
    setActive(selected);
    setOpen(true);
  }, [selected]);

  const choose = useCallback(
    (i: number) => {
      const o = options[i];
      if (o) onChange(o.value);
      setOpen(false);
      btn.current?.focus();
    },
    [onChange, options],
  );

  // Cerrar al tocar fuera, al hacer scroll o al cambiar el tamaño de la ventana
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (list.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  // Mantener visible la opción activa
  useEffect(() => {
    if (!open) return;
    const li = list.current?.children[active] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const k = e.key.toLowerCase();
          const start = (active + 1) % options.length;
          const order = [...options.keys()].map(
            (n) => (n + start) % options.length,
          );
          const hit = order.find((n) =>
            options[n].label.toLowerCase().startsWith(k),
          );
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  const sizing =
    size === "sm"
      ? "rounded-full px-4 py-1.5 text-xs font-medium"
      : "rounded-2xl px-4 py-3 text-base";

  return (
    <>
      <button
        ref={btn}
        id={btnId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${btnId}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-3 border bg-[rgb(12_9_10/0.45)] text-left text-[#F3F9FC] outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-[rgb(243_249_252/0.35)] ${sizing} ${
          open
            ? "border-[rgb(243_249_252/0.55)]"
            : "border-[rgb(243_249_252/0.2)] hover:border-[rgb(243_249_252/0.45)]"
        } ${className}`}
      >
        <span className="truncate normal-case tracking-normal">
          {current?.label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-[rgb(243_249_252/0.6)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              minWidth: pos.width,
            }}
            className="glass-dark fixed z-[100] max-h-64 w-max max-w-[min(22rem,calc(100vw-1rem))] overflow-auto rounded-2xl p-1.5 [scrollbar-color:rgb(243_249_252/0.3)_transparent] [scrollbar-width:thin]"
          >
            {options.map((o, i) => {
              const isSel = i === selected;
              return (
                <li
                  key={String(o.value)}
                  id={`${btnId}-opt-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 normal-case tracking-normal transition-colors ${
                    size === "sm" ? "text-xs" : "text-sm"
                  } ${
                    i === active
                      ? "bg-[rgb(243_249_252/0.12)] text-[#F3F9FC]"
                      : "text-[rgb(243_249_252/0.78)]"
                  }`}
                >
                  <span>{o.label}</span>
                  {isSel && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-[#F3F9FC]"
                    >
                      <path
                        d="M2.5 7l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
