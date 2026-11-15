"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/sections/Footer";
import type { ApiAlert, ApiEvents, ApiFires, ApiHealth } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { useApi } from "@/lib/use-api";
import FieldSection from "./FieldSection";
import { FlameIcon } from "./Icons";
import PlacesSection from "./PlacesSection";
import SeasonSection from "./SeasonSection";
import { textFor } from "./text";

const dayLabel = (iso: string, loc: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const TABS = ["lugares", "campo", "temporada"] as const;
type Tab = (typeof TABS)[number];

/**
 * Prevención: una sola pantalla con tres pestañas (mis lugares, vista de campo y temporada).
 * Solo se ve una a la vez para no tener que hacer scroll; la pestaña se guarda en el # de la URL.
 */
export default function PreventionView() {
  const [lang] = useLang();
  const t = textFor(lang);
  const [tab, setTab] = useState<Tab>("lugares");

  // Abrir directamente en la pestaña del enlace (#campo, #temporada…) y seguir los cambios del #
  useEffect(() => {
    const read = () => {
      const h = location.hash.replace("#", "") as Tab;
      if (TABS.includes(h)) setTab(h);
    };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
  };

  // Los datos se piden una sola vez y se comparten entre las pestañas
  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const events = useApi<ApiEvents>("/events", { limit: 1000 });
  const alert = useApi<ApiAlert>("/alert");
  const health = useApi<ApiHealth>("/health");
  const cov = fires.data?.cobertura;

  return (
    <div className="flex-1 text-snow">
      <header className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6 sm:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-snow/60">
              {t.kicker}
            </p>
            <h1 className="mt-1 text-2xl leading-tight tracking-tight sm:text-4xl">
              {t.h1a} <span className="text-snow/50">{t.h1b}</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-snow/65">
            {cov && (
              <span className="rounded-full border border-snow/20 bg-ink/40 px-3 py-1">
                {t.window}: {dayLabel(cov.desde, t.loc)} –{" "}
                {dayLabel(cov.hasta, t.loc)}
              </span>
            )}
            {health.data?.generated && (
              <span className="rounded-full border border-snow/20 bg-ink/40 px-3 py-1">
                {t.updated}:{" "}
                {new Date(health.data.generated).toLocaleString(t.loc, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
        </div>

        <p className="mt-2.5 rounded-xl border border-snow/15 bg-snow/[0.04] px-4 py-2 text-xs text-snow/80 sm:text-sm">
          <FlameIcon className="mr-1.5 inline-block -translate-y-px" />
          {t.emergency}
        </p>

        <div
          role="tablist"
          aria-label={t.tabsAria}
          className="mt-5 grid grid-cols-3 gap-1.5 rounded-full border border-snow/20 bg-ink/50 p-1.5 sm:inline-grid sm:grid-cols-[repeat(3,minmax(9rem,1fr))]"
        >
          {TABS.map((id, i) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => choose(id)}
              className={`cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${tab === id ? "bg-snow text-ink" : "text-snow/70 hover:text-snow"}`}
            >
              {t.nav[i]}
            </button>
          ))}
        </div>
      </header>

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mt-5"
      >
        {tab === "lugares" && (
          <PlacesSection
            t={t}
            lang={lang}
            fires={fires}
            events={events}
            alert={alert}
          />
        )}
        {tab === "campo" && (
          <FieldSection t={t} lang={lang} events={events} alert={alert} />
        )}
        {tab === "temporada" && <SeasonSection t={t} lang={lang} />}
      </div>

      <Footer />
    </div>
  );
}
