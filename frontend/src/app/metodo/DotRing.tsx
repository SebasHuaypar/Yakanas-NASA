"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const DOTS = 60;
const R = 88;

/**
 * Anillo de puntos tipo medidor: `value` (0–1) es la fracción encendida.
 * Los puntos encendidos nunca parten de opacidad 0, para no ocultar nada si
 * la animación no corre.
 */
export default function DotRing({
  value,
  children,
  label,
}: {
  value: number;
  children: ReactNode;
  label: string;
}) {
  const lit = Math.round(value * DOTS);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-60">
      <svg
        viewBox="0 0 200 200"
        aria-hidden
        className="absolute inset-0 h-full w-full"
      >
        {Array.from({ length: DOTS }, (_, i) => {
          const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
          // redondeado: Node y el navegador difieren en la última cifra de sin/cos
          const cx = Math.round((100 + R * Math.cos(a)) * 100) / 100;
          const cy = Math.round((100 + R * Math.sin(a)) * 100) / 100;
          return i < lit ? (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={2.6}
              className="fill-(--accent)"
              initial={{ opacity: 0.2 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.015 }}
            />
          ) : (
            <circle key={i} cx={cx} cy={cy} r={1.8} className="fill-slate/45" />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-heading text-4xl font-bold text-navy">
          {children}
        </div>
        <p className="mt-1 max-w-32 text-xs leading-tight text-slate">
          {label}
        </p>
      </div>
    </div>
  );
}
