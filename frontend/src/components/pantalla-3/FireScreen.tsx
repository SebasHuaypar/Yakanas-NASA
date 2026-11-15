"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { loadFireDataset } from "@/app/pantalla-3/lib/fire-data";
import { TEXTS } from "@/app/pantalla-3/lib/i18n";
import type { Lang } from "@/app/pantalla-3/lib/types";
import Explorer from "./Explorer";

const LANG_KEY = "pantalla3-lang";

/* El idioma vive en localStorage; se lee como store externo para evitar desajustes de hidratación. */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
};
const getLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
};

/** Pantalla 3: explorador de datos de fuego (cabecera con idioma + explorador). */
export default function FireScreen() {
  const lang = useSyncExternalStore(subscribe, getLang, () => "es" as Lang);
  // Datos simulados hoy; mañana vienen del backend (ver lib/fire-data.ts).
  const [ds] = useState(loadFireDataset);
  const t = TEXTS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const pickLang = (l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    emit();
  };

  return (
    <div className="flex-1 pt-14 text-snow">
      {/* la navbar fija no tiene fondo: este degradado funde el contenido al pasar por debajo */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-20 bg-linear-to-b from-ink via-ink/80 to-transparent" />
      <header className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-10 text-center sm:pt-14">
        <p className="flex animate-rise items-center gap-2.5 text-[11px] text-snow/65 [animation-delay:100ms] sm:text-xs">
          <Image src="/images/nasa-logo-white.svg" alt="NASA" width={110} height={92} unoptimized className="h-6 w-auto sm:h-7" />
          <span>
            {t.eyebrow} <span className="font-medium text-snow">NASA Space Apps Challenge 2026</span>
          </span>
        </p>
        <h1 className="mt-5 animate-rise text-[1.9rem] leading-[1.1] tracking-tight text-snow [animation-delay:250ms] sm:text-5xl lg:text-6xl">
          {t.heroA}
          <span className="block text-snow/60">{t.heroB}</span>
        </h1>
        <p className="mt-5 max-w-[56ch] animate-rise text-sm leading-relaxed text-snow/80 [animation-delay:400ms] sm:mt-6 sm:text-lg">{t.heroLead}</p>
        <div className="mt-6 flex animate-rise flex-wrap items-center justify-center gap-3 [animation-delay:550ms]">
          <span className="text-xs tracking-[0.14em] text-snow/60">{t.sub}</span>
          <span title={t.mockTip} className="cursor-help rounded-full border border-snow/20 bg-ink/40 px-3 py-1 text-[11px] font-medium text-snow/70 backdrop-blur-sm">
            {t.mock}
          </span>
          <div role="group" aria-label="Idioma / Language" className="inline-flex overflow-hidden rounded-full border border-snow/20 bg-ink/40 backdrop-blur-sm">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => pickLang(l)}
                className={`cursor-pointer px-3 py-1 text-[11px] font-medium transition-colors ${lang === l ? "bg-snow text-ink" : "text-snow/70 hover:text-snow"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Explorer ds={ds} t={t} />

      <footer className="mt-4 border-t border-snow/10 text-xs text-snow/50">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-4 px-4 py-5 sm:px-6">
          <span>{t.foot}</span>
          <span>Space Apps 2026 · Lima</span>
        </div>
      </footer>
    </div>
  );
}
