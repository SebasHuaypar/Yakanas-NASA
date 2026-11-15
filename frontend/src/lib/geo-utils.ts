/** Utilidades geográficas simples (WGS84, grados). */

const R = 6371; // km

const rad = (d: number) => (d * Math.PI) / 180;

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rumbo inicial en grados (0 = norte) del punto 1 al punto 2. */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS = {
  en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
  es: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"],
};

/** Punto cardinal de 8 vientos para un rumbo. */
export const compass = (deg: number, lang: "en" | "es") =>
  COMPASS[lang][Math.round(deg / 45) % 8];

/** Caja aproximada de Perú: sirve para avisar si una ubicación cae fuera de la cobertura. */
export const inPeru = (lat: number, lon: number) =>
  lat >= -18.5 && lat <= 0.1 && lon >= -81.5 && lon <= -68.5;

/** Semana del año (1–52) como la define la API de recurrencia: cada semana empieza 7 días después de la anterior desde el 1 de enero. */
export function weekOfYear(d = new Date()) {
  const start = Date.UTC(d.getFullYear(), 0, 1);
  const day = Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000,
  );
  return Math.min(52, Math.floor(day / 7) + 1);
}

/** Grados decimales con 4 decimales (≈ 11 m), para enlaces y mensajes. */
export const fmtCoord = (n: number) => n.toFixed(4);
