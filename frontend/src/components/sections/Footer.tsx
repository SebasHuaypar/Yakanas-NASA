"use client";

import { useLang } from "@/lib/lang";

const TEAM = [
  "Darcy Ortega",
  "Sebastián Huaypar",
  "Giordano Medrano",
  "Isabel Makishi",
  "Cesar Correa",
  "Isaac Martel",
];

/** Cierre de la landing: solo los nombres de quienes la hicieron. */
export default function Footer() {
  const [lang] = useLang();
  return (
    <footer className="relative border-t border-snow/10 px-4 py-6 sm:px-6">
      <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-snow/55 sm:text-sm">
        {lang === "en" ? "Made by" : "Realizado por"} {TEAM.join(" · ")}
      </p>
    </footer>
  );
}
