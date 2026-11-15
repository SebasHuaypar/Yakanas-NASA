"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { hud, mont } from "./fonts";

export type Chapter = {
  id: string;
  n: string;
  /** Palabra corta que se muestra enorme y vertical en la cápsula. */
  word: string;
  title: string;
  blurb: string;
  art: ReactNode;
  summary: string;
  content: ReactNode;
};

/** Palabra enorme, apilada, con degradado (tipografía del diseño de referencia). */
const wordClass = `${mont} font-bold uppercase leading-[0.98] tracking-tight bg-linear-to-b from-navy to-navy/20 bg-clip-text text-transparent!`;

/**
 * Cápsulas verticales (estilo del diseño de referencia). Al hacer clic en
 * cualquier parte de una, se EXTIENDE en horizontal y muestra su contenido;
 * las otras se angostan. Escape o la × las devuelven a su tamaño igual.
 * En móvil funcionan como acordeón.
 */
export default function ChapterCards({ items }: { items: Chapter[] }) {
  const [active, setActive] = useState<number | null>(null);
  const anyOpen = active !== null;

  return (
    <div onKeyDown={(e) => e.key === "Escape" && setActive(null)}>
      {/* Escritorio: cápsulas en fila que se extienden */}
      <div className="hidden gap-4 lg:flex lg:h-184">
        {items.map((it, i) => {
          const open = active === i;
          const squeezed = anyOpen && !open;
          return (
            <section
              key={it.id}
              aria-label={`${it.n} ${it.title}`}
              style={{ flexGrow: open ? 9 : 1 }}
              className={`relative min-w-26 basis-0 overflow-hidden glass-dark rounded-4xl transition-[flex-grow,border-color] duration-500 ease-out ${
                open ? "border-navy/60!" : "hover:border-navy/40!"
              }`}
            >
              {/* imagen o dibujo, fundido a negro por arriba */}
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-[62%] mask-[linear-gradient(to_bottom,transparent,black_42%)] transition-opacity duration-500 ${
                  open
                    ? "opacity-[0.07]"
                    : squeezed
                      ? "opacity-60"
                      : "opacity-100"
                }`}
              >
                {it.art}
                <div aria-hidden className="absolute inset-0 bg-[#0C090A]/35" />
              </div>

              {/* nombre enorme, apilado */}
              <h3
                aria-hidden
                className={`pointer-events-none absolute left-6 top-7 text-[3.3rem] [text-orientation:upright] [writing-mode:vertical-rl] ${wordClass}`}
              >
                {it.word}
              </h3>

              {/* texto corto (solo cuando ninguna está abierta) */}
              {!anyOpen && (
                <p
                  className={`pointer-events-none absolute right-5 top-9 w-[44%] border-l border-slate/50 pl-4 text-xs leading-relaxed text-slate ${mont}`}
                >
                  {it.blurb}
                </p>
              )}

              {/* clic en CUALQUIER parte de la cápsula cerrada la abre */}
              {!open && (
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Abrir capítulo ${it.n}: ${it.title}`}
                  className="absolute inset-0 z-10 cursor-pointer rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-navy"
                />
              )}

              {/* contenido extendido */}
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="absolute inset-0 overflow-y-auto py-9 pl-28 pr-9 [color-scheme:dark] [scrollbar-color:rgb(76_102_121)_transparent] [scrollbar-width:thin]"
                >
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    aria-label="Cerrar capítulo"
                    className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-navy/50 text-lg text-navy transition-colors hover:bg-navy hover:text-[#0C090A]"
                  >
                    ×
                  </button>
                  <p className={`text-xs text-slate ${hud}`}>
                    {it.n} · {it.word}
                  </p>
                  <h3 className="mt-2 max-w-xl text-2xl tracking-tight">
                    {it.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-slate">
                    {it.summary}
                  </p>
                  <div className="mt-7">{it.content}</div>
                </motion.div>
              )}
            </section>
          );
        })}
      </div>

      {/* Móvil: acordeón */}
      <div className="space-y-4 lg:hidden">
        {items.map((it, i) => {
          const open = active === i;
          return (
            <section
              key={it.id}
              className="glass-dark overflow-hidden rounded-4xl"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setActive(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-6 text-left"
              >
                <span>
                  <span className={`block text-5xl ${wordClass}`}>
                    {it.word}
                  </span>
                  <span className={`mt-2 block text-xs text-slate ${mont}`}>
                    {it.blurb}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy/50 text-lg text-navy"
                >
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <div className="px-6 pb-8">
                  <h3 className="text-xl tracking-tight">{it.title}</h3>
                  <p className="mt-2 text-sm text-slate">{it.summary}</p>
                  <div className="mt-6">{it.content}</div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* paginación */}
      <div
        role="group"
        aria-label="Capítulos"
        className="mt-8 flex justify-center gap-2.5"
      >
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setActive(active === i ? null : i)}
            aria-label={`Capítulo ${it.n}: ${it.title}`}
            aria-current={i === active}
            className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-navy" : "w-2 bg-slate/50 hover:bg-slate"}`}
          />
        ))}
      </div>
    </div>
  );
}
