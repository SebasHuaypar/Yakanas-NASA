"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Barra fina que avanza con el scroll de la página. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-60 h-0.75 origin-left bg-navy"
    />
  );
}
