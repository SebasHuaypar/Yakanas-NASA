import type { ReactNode } from "react";

/**
 * Encabezado de sección: etiqueta en píldora con borde, título grande con un
 * brillo suave detrás y bajada.
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
  return (
    <header className="relative max-w-4xl">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 top-4 h-56 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(76_102_121/0.38),transparent)] blur-2xl"
      />
      <p className="relative inline-flex rounded-full border border-navy/40 px-5 py-2 text-sm tracking-wide text-navy backdrop-blur-sm">
        {kicker}
      </p>
      <h2 className="relative mt-8 text-4xl tracking-tight sm:text-6xl">{title}</h2>
      {children && <p className="relative mt-7 max-w-3xl text-lg text-slate sm:text-xl">{children}</p>}
    </header>
  );
}
