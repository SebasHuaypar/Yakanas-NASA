/**
 * Tipografías de esta pantalla: se usan las de la marca (definidas en layout.tsx),
 * así toda la web comparte el mismo lenguaje:
 *  - títulos: Plus Jakarta Sans (font-heading)
 *  - cuerpo y etiquetas: Inter
 * Se mantienen los nombres `hud`, `mono`, `montserrat` y `mont` para no tocar los componentes.
 */

/** Etiqueta HUD: Inter en mayúsculas con tracking ancho. */
export const hud = "font-medium uppercase tracking-[0.14em]";

/** Antes cargaban fuentes propias; ahora no aportan variable CSS. */
export const mono = { variable: "" };
export const montserrat = { variable: "" };

/** Clase para los títulos de las cápsulas: Plus Jakarta Sans de la marca. */
export const mont = "font-heading";
