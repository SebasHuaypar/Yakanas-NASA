import Reveal from "./Reveal";

/**
 * División entre secciones: una línea finísima que se desvanece, con número y nombre.
 * Delimita sin fondos ni bloques, para no tapar el globo de atrás.
 */
export default function SectionDivider({
  index,
  label,
  className = "",
}: {
  index: string;
  label: string;
  className?: string;
}) {
  return (
    <Reveal className={`mx-auto w-full max-w-6xl ${className}`}>
      <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-snow/55">
        <span className="font-heading font-bold text-snow/80">{index}</span>
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-snow/35 via-snow/10 to-transparent"
        />
      </div>
    </Reveal>
  );
}
