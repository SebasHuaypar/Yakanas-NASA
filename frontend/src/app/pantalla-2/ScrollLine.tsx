"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * Línea fina y curva que recorre toda la página y se va dibujando con el
 * scroll (como en el diseño de referencia). Es decorativa: no tapa contenido.
 */
export default function ScrollLine() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    mass: 0.4,
  });
  const drawn = useTransform(smooth, [0, 1], [0.04, 1]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 4200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    >
      {/* trazo tenue completo, de fondo */}
      <path
        d={PATH}
        fill="none"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="stroke-snow/10"
      />
      <motion.path
        d={PATH}
        fill="none"
        strokeWidth={1.3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-snow/60"
        style={{ pathLength: drawn }}
      />
    </svg>
  );
}

const PATH =
  "M 860 0 C 860 260, 120 340, 150 760 S 900 1180, 850 1620 S 90 2080, 130 2520 S 910 2960, 860 3380 S 200 3800, 480 4200";
