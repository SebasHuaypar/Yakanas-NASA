/** Iconos de redes (SVG de línea). Heredan el color del texto. */
type P = { className?: string };
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const LinkedInIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V16M8 7.8v.01M12 16v-3.2a2.3 2.3 0 0 1 4.6 0V16M12 10.5V16" />
  </svg>
);

export const InstagramIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.2 6.8v.01" />
  </svg>
);

export const MailIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const GitHubIcon = ({ className = "" }: P) => (
  <svg {...base} className={className}>
    <path d="M9 19c-4 1.2-4-2-6-2.5M15 21v-3.2a2.8 2.8 0 0 0-.8-2.2c2.700-.3 5.500-1.300 5.500-6a4.600 4.600 0 0 0-1.300-3.200 4.300 4.300 0 0 0-.1-3.200s-1-.3-3.400 1.300a11.500 11.500 0 0 0-6 0C6.500 3.100 5.500 3.400 5.500 3.400a4.300 4.300 0 0 0-.1 3.200A4.600 4.600 0 0 0 4.100 9.800c0 4.700 2.800 5.700 5.500 6a2.800 2.800 0 0 0-.8 2.200V21" />
  </svg>
);
