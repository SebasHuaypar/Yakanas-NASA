"use client";

type Opt<T extends string> = { value: T; label: string };

/** Selector segmentado (dos o más botones, uno activo). */
export default function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-full border border-snow/20 bg-ink/40">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer px-3.5 py-1.5 text-xs font-medium transition-colors ${
            value === o.value ? "bg-snow text-ink" : "text-snow/70 hover:text-snow"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
