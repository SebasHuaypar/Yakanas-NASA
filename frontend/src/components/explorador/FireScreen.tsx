"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { loadFireDataset } from "@/app/explorador/lib/fire-data";
import { TEXTS } from "@/app/explorador/lib/i18n";
import type { FireDataset } from "@/app/explorador/lib/types";
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
      {/* Cabecera con el mismo diseño que la de Método: centrada, a casi toda la pantalla, con la imagen
          satelital del Perú de fondo que se desvanece hacia el explorador (el mapa ya está más abajo). */}
      <header className="relative flex min-h-[92vh] flex-col justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_16%,black_48%,transparent_100%)]"
        >
          <Image
            src="/metodo/hero-peru.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_42%] opacity-75"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgb(12_9_10/0.6),transparent_78%)]" />
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-36 text-center sm:px-6 sm:pt-44">
          <p className="animate-rise text-xs uppercase tracking-[0.22em] text-snow/60 [animation-delay:50ms]">
            {t.heroKicker}
          </p>
          <h1 className="mx-auto mt-8 max-w-5xl animate-rise text-5xl leading-[1.04] tracking-tight text-snow [animation-delay:100ms] sm:text-7xl lg:text-8xl">
            {t.heroA}
            <span className="block text-snow/50">{t.heroB}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl animate-rise text-lg leading-relaxed text-snow/70 [animation-delay:250ms] sm:text-xl">
            {t.heroLead}
          </p>
          <div className="mt-12 flex animate-rise justify-center [animation-delay:400ms]">
            <a
              href="#explorer"
              className="inline-flex items-center gap-2 rounded-full bg-snow px-7 py-3.5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:opacity-90"
            >
              {t.heroCta}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
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
