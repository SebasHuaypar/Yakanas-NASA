"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

function format(v: number, decimals: number, prefix: string, suffix: string) {
  return (
    prefix +
    v.toLocaleString("es", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix
  );
}

/** Número que cuenta desde 0 hasta su valor al entrar en pantalla. */
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [text, setText] = useState(format(value, decimals, prefix, suffix));

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setText(format(v, decimals, prefix, suffix)),
    });
    return () => controls.stop();
  }, [inView, reduce, value, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
