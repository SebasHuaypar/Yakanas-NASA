"use client";

import { motion } from "motion/react";

const START = 2000;
const END = 2025;
const pos = (yr: number) => ((yr - START) / (END - START)) * 100;

/**
 * Línea de tiempo: MODIS desde 2000, VIIRS desde 2012 y la ventana donde
 * ambos observan a la vez (2012–2022), que es donde el modelo aprende.
 */
export default function OverlapTimeline() {
  const grow = (delay: number) => ({
    initial: { scaleX: 0 },
    whileInView: { scaleX: 1 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <figure
      className="m-0"
      aria-label="Línea de tiempo: MODIS observa desde 2000 y VIIRS desde 2012. Entre 2012 y 2022 los dos observan a la vez, y ahí el modelo aprende la equivalencia."
    >
      <div className="relative mt-2 h-30">
        {/* ventana de aprendizaje */}
        <div
          className="absolute bottom-6 top-0 rounded-xl border-2 border-dashed border-(--accent) bg-(--accent)/10"
          style={{ left: `${pos(2012)}%`, width: `${pos(2022) - pos(2012)}%` }}
        />
        <motion.div
          {...grow(0)}
          className="absolute top-3 h-7 origin-left motion-reduce:transform-none! rounded-full bg-slate"
          style={{ left: `${pos(2000)}%`, width: `${pos(2025) - pos(2000)}%` }}
        />
        <motion.div
          {...grow(0.25)}
          className="absolute top-14 h-7 origin-left motion-reduce:transform-none! rounded-full bg-navy"
          style={{ left: `${pos(2012)}%`, width: `${pos(2025) - pos(2012)}%` }}
        />
        <span
          className="absolute top-4 pl-3 text-xs font-medium text-[#0C090A]"
          style={{ left: `${pos(2000)}%` }}
        >
          MODIS
        </span>
        <span
          className="absolute top-15 pl-3 text-xs font-medium text-[#0C090A]"
          style={{ left: `${pos(2012)}%` }}
        >
          VIIRS
        </span>

        {[2000, 2012, 2022, 2025].map((yr) => (
          <span
            key={yr}
            className="absolute bottom-0 -translate-x-1/2 text-xs text-slate"
            style={{ left: `${pos(yr)}%` }}
          >
            {yr}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-sm text-slate">
        La franja punteada es donde ambos satélites miraron a la vez: ahí
        aprendemos cómo se traduce uno en otro.
      </figcaption>
    </figure>
  );
}
