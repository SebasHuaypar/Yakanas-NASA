"use client";

import Footer from "@/components/sections/Footer";
import type { ApiAlert, ApiEvents, ApiFires, ApiHealth } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { useApi } from "@/lib/use-api";
import FieldSection from "./FieldSection";
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

/** Prevención: lugares de la gente, vista de campo para bomberos y autoridades, y temporada de fuego. */
export default function PreventionView() {
  const [lang] = useLang();
  const t = textFor(lang);

  // Los datos se piden una sola vez y se comparten entre las secciones
  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const events = useApi<ApiEvents>("/events", { limit: 1000 });
  const alert = useApi<ApiAlert>("/alert");
  const health = useApi<ApiHealth>("/health");

  const cov = fires.data?.cobertura;
  const anchors = ["#lugares", "#campo", "#temporada"];

  return (
    <div className="flex-1 text-snow">
      <header className="relative mx-auto w-full max-w-6xl px-4 pb-4 pt-28 text-center sm:px-6 sm:pt-40">
        <p className="animate-rise text-xs uppercase tracking-[0.22em] text-snow/60">
          {t.kicker}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl animate-rise text-4xl leading-[1.06] tracking-tight [animation-delay:120ms] sm:text-6xl lg:text-7xl">
          {t.h1a}
          <span className="block text-snow/50">{t.h1b}</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl animate-rise text-base leading-relaxed text-snow/75 [animation-delay:240ms] sm:text-lg">
          {t.lead}
        </p>

        <nav
          aria-label={t.kicker}
          className="mt-9 flex animate-rise flex-wrap justify-center gap-3 text-sm font-medium [animation-delay:340ms]"
        >
          {t.nav.map((label, i) => (
            <a
              key={label}
              href={anchors[i]}
              className={
                i === 0
                  ? "rounded-full bg-snow px-6 py-3 text-ink transition hover:-translate-y-0.5 hover:opacity-90"
                  : "rounded-full border border-snow/40 px-6 py-3 text-snow transition-colors hover:border-snow"
              }
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex animate-rise flex-wrap items-center justify-center gap-3 text-xs text-snow/65 [animation-delay:440ms]">
          {cov && (
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3.5 py-1.5">
              {t.window}: {dayLabel(cov.desde, t.loc)} –{" "}
              {dayLabel(cov.hasta, t.loc)}
            </span>
          )}
          {health.data?.generated && (
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3.5 py-1.5">
              {t.updated}:{" "}
              {new Date(health.data.generated).toLocaleString(t.loc, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>

        <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-snow/20 bg-snow/[0.05] px-5 py-3 text-sm text-snow/85">
          {t.emergency}
        </p>
      </header>

      <PlacesSection
        t={t}
        lang={lang}
        fires={fires}
        events={events}
        alert={alert}
      />
      <FieldSection t={t} lang={lang} events={events} alert={alert} />
      <SeasonSection t={t} lang={lang} />

      <Footer />
    </div>
  );
}
