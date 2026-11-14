import { JetBrains_Mono, Montserrat } from "next/font/google";

/** Tipografía mono para etiquetas tipo HUD (solo esta pantalla; no toca layout.tsx). */
export const mono = JetBrains_Mono({
  variable: "--font-mono-hud",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** Clases de una etiqueta HUD: mono, mayúsculas, tracking ancho. */
export const hud = "font-[family-name:var(--font-mono-hud)] uppercase tracking-[0.14em]";

/** Tipografía de las cápsulas: geométrica ancha, como el diseño de referencia. */
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

/** Clase para usar Montserrat. */
export const mont = "font-[family-name:var(--font-montserrat)]";
