"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Aparece suavemente (sube y se desvanece hacia adentro) cuando entra en pantalla.
 * Expone data-in="true" para que los hijos puedan animarse en cadena (ver .mini-wedge en globals.css).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Retraso en ms, útil para escalonar varias tarjetas. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-in={inView}
      style={{ transitionDelay: `${delay}ms`, ["--d" as string]: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
