"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";
import Logo from "./Logo";

const links = [
  { href: "/historia", label: { en: "Story", es: "Historia" } },
  { href: "/equipo", label: { en: "Team", es: "Equipo" } },
  { href: "/metodo", label: { en: "Method", es: "Método" } },
  { href: "/explorador", label: { en: "Explorer", es: "Explorador" } },
  { href: "/prevencion", label: { en: "Prevention", es: "Prevención" } },
];

const MENU = {
  en: { open: "Open menu", close: "Close menu", title: "Menu" },
  es: { open: "Abrir menú", close: "Cerrar menú", title: "Menú" },
};

/** Selector EN/ES. Se usa en la barra y también dentro del menú lateral del celular. */
function LangToggle({
  lang,
  setLang,
  focusable = true,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  focusable?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Language / Idioma"
      className="inline-flex shrink-0 overflow-hidden rounded-full border border-snow/20 bg-ink/40"
    >
      {(["en", "es"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          tabIndex={focusable ? 0 : -1}
          onClick={() => setLang(l)}
          className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
            lang === l ? "bg-snow text-ink" : "text-snow/70 hover:text-snow"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * Barra fija arriba, de lado a lado, con fondo que difumina lo que pasa por detrás.
 * Logo a la izquierda y las pantallas a la derecha como texto con subrayado (blanco en la activa).
 * Por debajo de 1024 px los enlaces pasan a un menú hamburguesa que se abre como un panel lateral
 * (desde la derecha, a todo el alto de la pantalla).
 * En la pantalla 1 no se ve al inicio (la bienvenida ya muestra el logo grande); aparece con un
 * fundido apenas se empieza a hacer scroll.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [lang, setLang] = useLang();
  const onHome = pathname === "/historia";
  const [scrolled, setScrolled] = useState(false);
  // El menú está abierto solo para la ruta en la que se abrió: al navegar se cierra solo
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const close = () => setOpenPath(null);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > window.innerHeight * 0.06);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  // Con el menú abierto: Esc lo cierra y la página de debajo no se desplaza
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPath(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const visible = !onHome || scrolled;

  return (
    <>
      <header
        aria-hidden={!visible}
        className={`fixed inset-x-0 top-0 z-50 border-b border-snow/10 bg-ink/55 backdrop-blur-xl transition-all duration-500 ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:gap-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3 lg:gap-8">
            <ul className="hidden items-center gap-8 lg:flex">
              {links.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      tabIndex={visible ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      className={`group relative block whitespace-nowrap py-2 text-sm font-medium transition-colors ${
                        active ? "text-snow" : "text-snow/60 hover:text-snow"
                      }`}
                    >
                      {label[lang]}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-snow transition-transform duration-300 ${
                          active
                            ? "scale-x-100"
                            : "scale-x-0 group-hover:scale-x-100 group-hover:bg-snow/60"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hidden lg:block">
              <LangToggle lang={lang} setLang={setLang} focusable={visible} />
            </div>
            <button
              type="button"
              aria-label={MENU[lang].open}
              aria-expanded={open}
              aria-controls="mobile-menu"
              tabIndex={visible ? 0 : -1}
              onClick={() => setOpenPath(pathname)}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-snow/20 bg-ink/40 text-snow transition-colors hover:border-snow/50 lg:hidden"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 5h14M2 9h14M2 13h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Menú lateral del celular: fuera del header, porque el difuminado del header encerraría su posición fija */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-label={MENU[lang].close}
          tabIndex={-1}
          onClick={close}
          className={`fixed inset-0 z-[60] cursor-default bg-ink/70 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={MENU[lang].title}
          aria-hidden={!open}
          inert={!open}
          className={`fixed inset-y-0 right-0 z-[70] flex w-[min(84vw,20rem)] flex-col border-l border-snow/10 bg-ink/95 shadow-[-24px_0_80px_rgb(0_0_0/0.5)] backdrop-blur-xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-snow/10 px-5">
            <span className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-snow/60">
              {MENU[lang].title}
            </span>
            <button
              type="button"
              aria-label={MENU[lang].close}
              onClick={close}
              className="grid size-10 cursor-pointer place-items-center rounded-full border border-snow/20 text-snow transition-colors hover:border-snow/50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto px-3 py-4">
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    className={`flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium transition-colors ${
                      active
                        ? "bg-snow/10 text-snow"
                        : "text-snow/70 hover:bg-snow/5 hover:text-snow"
                    }`}
                  >
                    {label[lang]}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-amber"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center justify-between border-t border-snow/10 px-5 py-4">
            <span className="text-xs text-snow/50">Language / Idioma</span>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        </aside>
      </div>
    </>
  );
}
