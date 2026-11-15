"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Aparece suavemente al entrar en pantalla (respeta "reducir movimiento"). */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  // Con "reducir movimiento" el CSS fuerza el estado final (sin depender de JS,
  // así no hay diferencias entre el HTML del servidor y el del cliente).
  return (
    <motion.div
      className={`motion-reduce:transform-none! motion-reduce:opacity-100! motion-reduce:[filter:none]! ${className}`}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
