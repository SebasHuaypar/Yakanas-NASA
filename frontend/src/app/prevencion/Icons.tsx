/** Iconos de línea (SVG) de la página de prevención. Heredan el color del texto. */
type P = { className?: string };
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const FlameIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3c.6 3.2-2.8 4.6-3.7 7.6C7.6 13 8.7 14.6 10 15.3c-.3-1.6.4-2.9 1.6-3.7.1 1.7 1.6 2.3 2.1 3.6.4 1.1.1 2.3-.6 3.1" />
    <path d="M12 21c-3.6 0-6-2.5-6-5.8 0-2.2 1.2-3.9 2.5-5.3C9.3 8.9 10.6 7 12 3c1.8 2.2 6 5.2 6 12.2 0 3.3-2.4 5.8-6 5.8Z" />
  </svg>
);

export const PinIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
