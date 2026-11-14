import type { ReactNode } from "react";

/**
 * Término con definición en lenguaje simple (hover, foco o toque).
 * Sirve de mini-glosario para quien no es científico.
 */
export default function Term({
  children,
  def,
}: {
  children: ReactNode;
  def: string;
}) {
  return (
    <span
      tabIndex={0}
      className="group relative inline-block cursor-help rounded-sm border-b border-dotted border-navy/60 text-navy outline-none focus-visible:ring-2 focus-visible:ring-navy"
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-left text-sm font-normal leading-snug text-[#0C090A] opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
      >
        {def}
      </span>
    </span>
  );
}
