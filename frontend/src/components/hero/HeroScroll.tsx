"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// three.js solo corre en el navegador
const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Pantalla 1: una historia guiada por el scroll.
 *  1) Bienvenida con apenas el borde del globo asomando abajo.
 *  2) Al bajar, el globo sube, gira y se acerca hasta Perú.
 *  3) Aparece el texto sobre el país.
 * El contenedor es alto y la escena queda fija (sticky) mientras dura la animación.
 */
export default function HeroScroll() {
  const container = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);

  const progress = useRef(0); // valor suavizado que usa la escena
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
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Progreso del scroll -> suavizado -> escena y textos
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let target = 0;
    let raf = 0;
    let last = performance.now();

    const readScroll = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
      progress.current += (target - progress.current) * k;
      const p = progress.current;

      if (intro.current) {
        intro.current.style.opacity = String(1 - smooth(0.02, 0.16, p));
        intro.current.style.transform = `translateY(${-smooth(0, 0.2, p) * 70}px)`;
      }
      if (scrim.current)
        scrim.current.style.opacity = String(smooth(0.5, 0.75, p));
      if (story.current) {
        const s = smooth(0.62, 0.86, p);
        story.current.style.opacity = String(s);
        story.current.style.transform = `translateY(${(1 - s) * 34}px)`;
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
    <section ref={container} id="inicio" className="relative h-[240svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Globo 3D */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-[1600ms] ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <GlobeScene
            progressRef={progress}
            reducedMotion={reduced}
            running={visible}
            onReady={() => setReady(true)}
          />
        </div>

        {/* Velo para que el texto final se lea sobre el globo */}
        <div
          ref={scrim}
          aria-hidden="true"
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(12_9_10/0.88)_0%,rgb(12_9_10/0.6)_38%,transparent_72%)]"
        />

        {/* 1) Bienvenida */}
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

        {/* 3) Texto sobre Perú */}
        <div
          ref={story}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 text-center sm:pt-24"
        >
          <h2 className="text-[1.9rem] leading-[1.1] tracking-tight text-snow sm:text-5xl lg:text-6xl">
            Cada año, el Perú tiene su temporada de fuego.
            <span className="block text-snow/60">
              Ahora vemos 23 años de ella.
            </span>
          </h2>
          <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-snow/80 sm:mt-6 sm:text-lg">
            Los satélites detectan incendios desde el espacio, pero los antiguos
            y los nuevos los cuentan de forma distinta. Los unimos en un solo
            registro justo, región por región, para que cualquiera pueda ver
            cuándo y dónde arde el Perú.
          </p>
        </div>
      </div>
    </section>
  );
}
