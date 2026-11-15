import type { ReactNode } from "react";

/**
 * Nota de procedencia de los datos: deja claro qué es dato real, qué viene
 * del prototipo y qué falta validar con el algoritmo final.
 */
export default function DataNote({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className={`flex items-start gap-2.5 text-sm ${dark ? "text-snow/80" : "text-slate"}`}
    >
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          dark ? "border-snow/50" : "border-slate/60"
        }`}
      >
        i
      </span>
      <span>{children}</span>
    </p>
  );
}
