"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import { PERU_MONTHLY_MEAN } from "@/lib/fire-data";
import { sceneBus } from "@/lib/scene-bus";
import FireClock from "./FireClock";
import type { SceneState } from "./GlobeScene";

// three.js solo corre en el navegador
const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Pantalla 1: una historia con el globo de fondo.
 *  1) Bienvenida con apenas el borde del globo asomando abajo.
 *  2) Al empezar a bajar, el globo sube, gira y se acerca hasta Perú (animación por tiempo).
 *  3) El globo se queda zoomeado sobre Perú, fijo detrás, mientras el reloj del fuego y las
 *     siguientes secciones (children) pasan por encima como una landing normal.
 */
export default function HeroScroll({ children }: { children?: ReactNode }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);

  const clearSmooth = useRef(0);
  const state = useRef<SceneState>({ p: 0, dive: 0, end: 0 }); // valores suavizados para la escena 3D
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll -> suavizado -> escena y textos
  useEffect(() => {
    const wrap = wrapper.current;
    if (!wrap) return;
    const target = { p: 0, dive: 0 };
    let raf = 0;
    let last = performance.now();

    const readScroll = () => {
      // El scroll solo dispara el viaje al Perú; la animación corre sola por tiempo (como una web, no un video)
      const scrolled = -wrap.getBoundingClientRect().top;
      target.p = scrolled > window.innerHeight * 0.18 ? 1 : 0;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 1.7);
      const s = state.current;
      s.p += (target.p - s.p) * k;
      const p = s.p;

      clearSmooth.current +=
        (sceneBus.clear - clearSmooth.current) *
        (reduced ? 1 : 1 - Math.exp(-dt * 1.3));

      if (intro.current) {
        intro.current.style.opacity = String(1 - smooth(0.02, 0.12, p));
        intro.current.style.transform = `translateY(${-smooth(0, 0.15, p) * 70}px)`;
      }
      // Oscurecimiento parejo para leer el contenido sobre el globo (se aclara en la sección de los satélites)
      if (dim.current) {
        dim.current.style.opacity = String(
          smooth(0.7, 1, p) * 0.55 * (1 - 0.75 * clearSmooth.current),
        );
      }
      raf = requestAnimationFrame(frame);
    };

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
    };
  }, [reduced]);

  return (
    <div ref={wrapper} id="inicio" className="relative">
      {/* Globo 3D fijo detrás de toda la historia (no ocupa espacio en el flujo) */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 z-0 -mb-[100svh] h-svh overflow-hidden"
      >
        <div
          className={`absolute inset-0 transition-opacity duration-[1600ms] ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <GlobeScene
            stateRef={state}
            reducedMotion={reduced}
            running={visible}
            onReady={() => setReady(true)}
          />
        </div>

        <div
          ref={dim}
          style={{ opacity: 0 }}
          className="absolute inset-0 bg-ink"
        />
      </div>

      {/* Hero: bienvenida (queda fija mientras el globo viaja hasta Perú) */}
      <section className="relative z-10 h-svh">
        <div className="relative h-svh overflow-hidden">
          <div
            ref={intro}
            className="pointer-events-none absolute inset-x-0 top-0 flex h-[79%] flex-col items-center px-4 pt-8 text-center sm:pt-10"
          >
            <p className="flex animate-rise items-center gap-2.5 text-[11px] text-snow/65 sm:text-xs [animation-delay:200ms]">
              <Image
                src="/images/nasa-logo-white.svg"
                alt="NASA"
                width={110}
                height={92}
                unoptimized
                className="h-6 w-auto sm:h-7"
              />
              <span>
                Una solución para{" "}
                <span className="font-medium text-snow">
                  NASA Space Apps Challenge 2026
                </span>
              </span>
            </p>

            {/* Logo + Presenta: centrados entre la línea de NASA y el borde del globo */}
            <div className="flex flex-1 flex-col items-center justify-center">
              <h1 className="animate-rise font-logo text-[3.4rem] font-normal leading-none text-snow [animation-delay:450ms] sm:text-8xl lg:text-9xl">
                Yakana&apos;s Team
              </h1>

              <p className="mt-4 animate-rise text-sm tracking-[0.14em] text-snow/65 [animation-delay:800ms] sm:mt-6 sm:text-base">
                Presenta
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* El Perú arde cada año: sección normal (sin altura forzada) sobre el globo */}
      <section
        id="reloj"
        className="relative z-10 px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-44"
      >
        <SectionDivider
          index="01"
          label="El fenómeno"
          className="mb-14 sm:mb-20"
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 text-left lg:grid-cols-2 lg:gap-16">
          {/* Texto: centrado verticalmente respecto al reloj, con el botón debajo */}
          <Reveal className="lg:order-2">
            <h2 className="text-[1.9rem] leading-tight tracking-tight text-snow sm:text-5xl">
              El Perú arde cada año
            </h2>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-snow/70 sm:text-base">
              Así ocurre en un año típico, mes a mes.
            </p>

            <Link
              href="/pantalla-3"
              className="group mt-7 inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition duration-300 hover:shadow-[0_0_32px_rgb(243_249_252/0.4)] sm:mt-9"
            >
              Explora tu región
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>

          {/* Reloj */}
          <Reveal delay={150} className="lg:order-1">
            <div className="mx-auto w-full max-w-[560px] rounded-[2rem] border border-snow/15 bg-snow/[0.06] p-4 shadow-[0_12px_60px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(243_249_252/0.14)] backdrop-blur-xl sm:p-7">
              <FireClock
                data={PERU_MONTHLY_MEAN}
                autoPlay
                svgClassName="max-w-[480px]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Siguientes secciones: landing normal por encima del globo */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
