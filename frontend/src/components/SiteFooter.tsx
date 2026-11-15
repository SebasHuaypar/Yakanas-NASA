"use client";

import { useLang } from "@/lib/lang";
import { GitHubIcon } from "./SocialIcons";

const REPO = "https://github.com/SebasHuaypar/Yakanas-NASA";

const TXT = {
  en: { ask: "Want to see more of the project? Visit the repo on", label: "Yakana’s Fire Intelligence repository on GitHub" },
  es: { ask: "¿Quieres ver más del proyecto? Visita el repositorio en", label: "Repositorio de Yakana’s Fire Intelligence en GitHub" },
};

/** Pie de página mínimo: una sola línea con el enlace al repositorio. */
export default function SiteFooter() {
  const [lang] = useLang();
  const t = TXT[lang];
  return (
    <footer className="relative z-10 border-t border-snow/10 px-4 py-4 text-center text-xs text-snow/60 sm:text-sm">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>{t.ask}</span>
        <a
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.label}
          className="inline-flex items-center gap-1.5 font-medium text-snow/85 transition-colors hover:text-amber"
        >
          <GitHubIcon className="size-4" />
          SebasHuaypar/Yakanas-NASA
        </a>
      </p>
    </footer>
  );
}
