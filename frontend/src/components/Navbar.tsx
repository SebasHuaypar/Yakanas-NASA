"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const links = [
  { href: "/pantalla-1", label: "Pantalla 1" },
  { href: "/pantalla-2", label: "Pantalla 2" },
  { href: "/pantalla-3", label: "Pantalla 3" },
];

/**
 * Barra superior fija y sin fondo: logo a la izquierda y una píldora suelta por pantalla.
 * En la pantalla 1 no se ve al inicio (la bienvenida ya muestra el logo grande);
 * aparece apenas se empieza a hacer scroll.
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
      className={`fixed inset-x-0 top-0 z-50 h-14 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <nav className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <ul className="flex items-center gap-1.5 sm:gap-2">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  tabIndex={visible ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors sm:px-4 sm:py-1.5 sm:text-xs ${
                    active
                      ? "border-snow bg-snow text-ink"
                      : "border-snow/20 bg-ink/40 text-snow/70 hover:border-snow/50 hover:text-snow"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
