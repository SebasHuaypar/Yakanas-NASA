"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const links = [
  { href: "/pantalla-1", label: "Historia" },
  { href: "/pantalla-2", label: "Método" },
  { href: "/pantalla-3", label: "Explorador" },
];

/**
 * Barra fija arriba, de lado a lado, con fondo que difumina lo que pasa por detrás.
 * Logo a la izquierda y las pantallas a la derecha como texto con subrayado (blanco en la activa).
 * En la pantalla 1 no se ve al inicio (la bienvenida ya muestra el logo grande); aparece con un
 * fundido apenas se empieza a hacer scroll.
 */
export default function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/pantalla-1";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > window.innerHeight * 0.06);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  const visible = !onHome || scrolled;

  return (
    <header
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-50 border-b border-snow/10 bg-ink/55 backdrop-blur-xl transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Logo />
        <ul className="flex items-center gap-4 sm:gap-9">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  tabIndex={visible ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                  className={`group relative block whitespace-nowrap py-2 text-xs font-medium transition-colors sm:text-sm ${
                    active ? "text-snow" : "text-snow/60 hover:text-snow"
                  }`}
                >
                  {label}
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
      </nav>
    </header>
  );
}
