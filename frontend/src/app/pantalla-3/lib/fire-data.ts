import { buildMockDataset } from "./mock-data";
import type { FireDataset } from "./types";

/**
 * ÚNICO punto de entrada de datos de la pantalla 3.
 *
 * Hoy devuelve datos simulados. Cuando el backend entregue las series ya
 * armonizadas, reemplaza el cuerpo (por ejemplo con un `fetch` a la API,
 * volviendo la función `async`) y devuelve un objeto con la forma de
 * `FireDataset` (ver `types.ts`). Ningún componente cambia.
 */
export function loadFireDataset(): FireDataset {
  return buildMockDataset();
}
