"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Lang = "en" | "es";

/** Inglés por defecto; la elección del visitante se recuerda en este navegador. */
export const DEFAULT_LANG: Lang = "en";
const KEY = "yakana-lang";

/* Store externo: el servidor siempre pinta "en" y el cliente lee localStorage sin desajustes de hidratación. */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
};
const read = (): Lang => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "es" || v === "en" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export function setLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  listeners.forEach((f) => f());
}

/** Idioma actual del sitio y su selector. */
export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, read, () => DEFAULT_LANG);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return [lang, setLang];
}

/** Elige el texto según el idioma: `pick(lang, { en: "...", es: "..." })`. */
export function pick<T>(lang: Lang, v: { en: T; es: T }): T {
  return v[lang];
}
