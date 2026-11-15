"use client";

import Link from "next/link";
import Card from "@/components/Card";
import { useEffect, useRef } from "react";
import type { ApiFires } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { sceneBus } from "@/lib/scene-bus";
import { useApi } from "@/lib/use-api";

const TXT = {
  en: {
    eyebrow: "Today, live",
    title: "See how Peru's fire looks today.",
    sub: "Each glowing dot is a hotspot picked up by satellites this week. Everything is measured with the same yardstick since 2003, so you can compare and understand.",
    cta: "Explore Peru's fire",
    caption: (n: string, a: string, b: string) =>
      `${n} hotspots between ${a} and ${b}`,
    loc: "en-US",
  },
  es: {
    eyebrow: "Hoy, en vivo",
    title: "Mira cómo está el fuego hoy en el Perú.",
    sub: "Cada punto brillante es un foco que los satélites detectaron esta semana. Todo se mide con la misma vara desde 2003, para que puedas comparar y entender.",
    cta: "Explorar el fuego del Perú",
    caption: (n: string, a: string, b: string) =>
      `${n} focos entre el ${a} y el ${b}`,
    loc: "es-PE",
  },
};

const day = (iso: string, loc: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

/**
 * Primera sección tras la portada: el globo ya está sobre Perú y se encienden las detecciones reales de la
 * última semana (API /fires). El texto presenta la solución y lleva al explorador.
 */
export default function LiveSection() {
  const [lang] = useLang();
  const L = TXT[lang];
  const section = useRef<HTMLElement>(null);
  const fires = useApi<ApiFires>("/fires", { limit: 20000 });

  // Los puntos reales pasan al globo
  useEffect(() => {
    const d = fires.data;
    if (!d) return;
    const a = new Float32Array(d.features.length * 2);
    d.features.forEach((f, i) => {
      a[i * 2] = f.geometry.coordinates[1];
      a[i * 2 + 1] = f.geometry.coordinates[0];
    });
    sceneBus.points = a;
    sceneBus.pointsVersion++;
  }, [fires.data]);

  // El globo se acerca a Perú, traza el contorno y enciende los puntos mientras la sección está en pantalla
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          sceneBus.outline = 1;
          sceneBus.zoom = 1;
          sceneBus.clear = 1;
          sceneBus.hot = 1;
        } else if (e.boundingClientRect.top < 0) {
          // Se fue hacia abajo: el globo se queda cerca de Perú y solo se apagan contorno, aclarado y puntos
          sceneBus.outline = 0;
          sceneBus.clear = 0;
          sceneBus.hot = 0;
        } else {
          sceneBus.outline = 0;
          sceneBus.zoom = 0;
          sceneBus.clear = 0;
          sceneBus.hot = 0;
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      sceneBus.outline = 0;
      sceneBus.zoom = 0;
      sceneBus.clear = 0;
      sceneBus.hot = 0;
    };
  }, []);

  const d = fires.data;
  return (
    <section
      ref={section}
      id="en-vivo"
      className="relative z-10 flex min-h-svh items-end px-4 pb-16 pt-24 sm:px-6 lg:items-center lg:pb-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Card className="relative max-w-md rounded-[2rem] p-6 sm:p-8">
          <p className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.16em] text-snow/70">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-amber" />
            </span>
            {L.eyebrow}
          </p>

          <h2 className="mt-5 text-[2rem] leading-[1.08] tracking-tight text-snow sm:text-5xl">
            {L.title}
          </h2>
          <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-snow/75 sm:text-base">
            {L.sub}
          </p>

          <Link
            href="/explorador"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition duration-300 hover:shadow-[0_0_32px_rgb(243_249_252/0.4)]"
          >
            {L.cta}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
          {d && (
            <p className="mt-4 text-xs text-snow/55">
              {L.caption(
                d.total.toLocaleString(L.loc),
                day(d.cobertura.desde, L.loc),
                day(d.cobertura.hasta, L.loc),
              )}
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
