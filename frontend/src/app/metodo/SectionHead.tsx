import type { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * Encabezado de sección: división numerada (el mismo lenguaje que la pantalla 1: línea fina que se
 * desvanece, sin cápsula), título grande con un brillo suave detrás y bajada.
 * `kicker` va como "01 · Nombre".
 *
 * Ojo: dentro de esta página la paleta está remapeada (ver `tones` en page.tsx), por eso los
 * colores se escriben con `navy` (claro) y `slate` (claro tenue) y no con `snow`.
 */
export default function SectionHead({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  const [index, ...rest] = kicker.split(" · ");
  const label = rest.join(" · ");

  return (
    <>
      <Reveal>
        <div className="mb-10 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-slate sm:mb-14">
          <span className="font-heading font-bold text-navy">{index}</span>
          <span>{label}</span>
          <span
            aria-hidden
            className="h-px flex-1 bg-gradient-to-r from-navy/35 via-navy/10 to-transparent"
          />
        </div>
      </Reveal>
      <header className="relative max-w-4xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 top-0 h-56 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(76_102_121/0.38),transparent)] blur-2xl"
        />
        <h2 className="relative text-4xl tracking-tight sm:text-6xl">
          {title}
        </h2>
        {children && (
          <p className="relative mt-7 max-w-3xl text-lg text-slate sm:text-xl">
            {children}
          </p>
        )}
      </header>
    </>
  );
}
