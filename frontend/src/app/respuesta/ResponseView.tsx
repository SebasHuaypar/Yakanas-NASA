"use client";

import Link from "next/link";
import FieldSection from "@/app/prevencion/FieldSection";
import { textFor } from "@/app/prevencion/text";
import type { ApiAlert, ApiEvents } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { useApi } from "@/lib/use-api";

const HEAD = {
  en: { h1: "Response view", lead: "For firefighters, civil defense and local authorities: active fires, coordinates to dispatch crews, exports and a printable situation report.", back: "← Back to the public page" },
  es: { h1: "Vista de respuesta", lead: "Para bomberos, defensa civil y autoridades locales: fuegos activos, coordenadas para despachar equipos, exportaciones y un informe de situación imprimible.", back: "← Volver a la página pública" },
};

export default function ResponseView() {
  const [lang] = useLang();
  const events = useApi<ApiEvents>("/events", { limit: 1000 });
  const alert = useApi<ApiAlert>("/alert");
  const h = HEAD[lang];
  return (
    <div className="flex-1 text-snow">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32">
        <Link href="/prevencion" className="text-sm text-snow/65 hover:text-snow">
          {h.back}
        </Link>
        <h1 className="mt-4 text-4xl tracking-tight sm:text-6xl">{h.h1}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-snow/75 sm:text-lg">{h.lead}</p>
        <div className="mt-8">
          <FieldSection t={textFor(lang)} lang={lang} events={events} alert={alert} />
        </div>
      </div>
    </div>
  );
}
