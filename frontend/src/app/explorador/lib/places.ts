import { GENERATED_PLACES } from "./places-generated";

/** Lugares con nombre que se muestran sobre la maqueta 3D (nivel 1 = principal). */
export type Place = { name: string; lat: number; lon: number; level: 1 | 2 };

const P = (name: string, lat: number, lon: number, level: 1 | 2): Place => ({ name, lat, lon, level });

/** Lista curada de Cusco (tiene prioridad sobre la generada). */
const CUSCO: Place[] = [
    P("Cusco", -13.5167, -71.9785, 1), P("Urubamba", -13.3053, -72.1164, 1), P("Ollantaytambo", -13.2586, -72.2636, 1),
    P("Machu Picchu", -13.1559, -72.524, 1), P("Calca", -12.9398, -72.0582, 1), P("Yauri", -14.793, -71.4128, 1),
    P("Pallpata", -14.9441, -71.0799, 1), P("Condoroma", -15.2915, -71.0578, 1), P("Quiquijana", -13.8028, -71.5156, 1),
    P("Pomacanchi", -14.03, -71.57, 1), P("Ccapacmarca", -14.0079, -71.9964, 1), P("Poroy", -13.5002, -72.0288, 1),
    P("Pisac", -13.421, -71.8505, 2), P("Chinchero", -13.4098, -72.0439, 2), P("Sacsayhuamán", -13.5088, -71.9818, 2),
];

/**
 * Lugares rotulados en el 3D de cada región: los poblados más grandes (generados desde GeoNames con
 * tools/make_places.py) y, para Cusco, una lista curada.
 */
export const PLACES_BY_DEPT: Record<string, Place[]> = {
  ...GENERATED_PLACES,
  "PE-CAL": [P("Callao", -12.0566, -77.1181, 1)], // el contorno es tan pequeño que no recoge poblados
  "PE-CUS": CUSCO,
};

/** Todas las regiones usan imagen satelital (el diseño de Cusco). */
export const hasSatellite = (id: string) => Boolean(id);
