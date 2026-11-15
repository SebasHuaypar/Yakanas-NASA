"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { loadFireDataset } from "@/app/pantalla-3/lib/fire-data";
import { TEXTS } from "@/app/pantalla-3/lib/i18n";
import type { FireDataset } from "@/app/pantalla-3/lib/types";
import { useLang } from "@/lib/lang";
import Footer from "@/components/sections/Footer";
import Explorer from "./Explorer";

/** Pantalla 3: explorador de datos de fuego (cabecera con imagen + explorador). El idioma es global (navbar). */
export default function FireScreen() {
  const [lang] = useLang();
  // Datos reales de la API del equipo de backend (ver lib/fire-data.ts).
  const [ds, setDs] = useState<FireDataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = TEXTS[lang];

  useEffect(() => {
    const ctl = new AbortController();
    loadFireDataset(ctl.signal)
      .then((d) => {
        setDs(d);
        setFailed(false);
      })
      .catch(() => !ctl.signal.aborted && setFailed(true));
    return () => ctl.abort();
  }, [attempt]);

  return (
    <div className="flex-1 text-snow">
      <header className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-28 sm:px-6 sm:pt-36 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pb-16">
        <div className="text-center lg:text-left">
          <h1 className="animate-rise text-4xl leading-[1.06] tracking-tight text-snow [animation-delay:100ms] sm:text-6xl lg:text-7xl">
            {t.heroA}
            <span className="block text-snow/50">{t.heroB}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] animate-rise text-base leading-relaxed text-snow/75 [animation-delay:250ms] sm:text-lg lg:mx-0">
            {t.heroLead}
          </p>
          <div className="mt-9 animate-rise [animation-delay:400ms]">
            <a
              href="#explorer"
              className="inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:opacity-90"
            >
              {t.heroCta}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Mapa de relieve del Perú: se funde con el fondo (el negro del PNG desaparece con mix-blend) */}
        <div className="relative mx-auto w-full max-w-[17rem] animate-fade-in [animation-delay:300ms] sm:max-w-sm lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-[-12%] -z-10 bg-[radial-gradient(ellipse_at_center,rgb(76_102_121/0.35),transparent_68%)]"
          />
          <Image
            src="/explorador/hero-relief.webp"
            alt={t.heroImgAlt}
            width={900}
            height={1220}
            priority
            sizes="(min-width: 1024px) 40vw, 320px"
            className="mx-auto h-auto max-h-[34rem] w-auto object-contain mix-blend-screen [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]"
          />
        </div>
      </header>

      <div id="explorer" className="scroll-mt-24">
        {ds ? (
          <Explorer ds={ds} t={t} />
        ) : (
          <div
            className="mx-auto flex min-h-80 w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 text-center text-snow/70"
            role="status"
          >
            {failed ? (
              <>
                <p>{t.loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFailed(false);
                    setAttempt((n) => n + 1);
                  }}
                  className="cursor-pointer rounded-full border border-snow/30 px-5 py-2 text-sm font-medium text-snow transition-colors hover:border-snow"
                >
                  {t.retry}
                </button>
              </>
            ) : (
              <p className="animate-pulse">{t.loading}</p>
            )}
          </div>
        )}
      </div>

      <p className="mx-auto mt-4 w-full max-w-6xl px-4 pb-4 text-xs leading-relaxed text-snow/50 sm:px-6">
        {t.foot}
      </p>
      <Footer />
    </div>
  );
}
