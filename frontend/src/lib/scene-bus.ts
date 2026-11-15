/**
 * Canal simple entre las secciones de la landing y el globo 3D de fondo.
 * Las secciones escriben aquí (según su scroll) y la escena lo lee en cada cuadro.
 * Solo se usa en el navegador.
 */
export const sceneBus = {
  /** 0..1: cuánto del contorno de Perú está dibujado sobre el globo. */
  outline: 0,
  /** 0..1: acercamiento extra sobre Perú. */
  zoom: 0,
  /** 0..1: aclara el globo (quita el oscurecimiento) para que Perú se vea en grande. */
  clear: 0,
  /** 0..1: cuánto se ven los puntos de calor reales sobre Perú (solo en la sección «en vivo»). */
  hot: 0,
  /** Detecciones reales como pares [lat, lon, lat, lon, …] y su versión (sube cada vez que cambian). */
  points: null as Float32Array | null,
  pointsVersion: 0,
};
