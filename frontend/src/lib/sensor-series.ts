/**
 * Series nacionales por mes. MODIS y VIIRS son los conteos crudos de la extracción del equipo de backend
 * (calendario-del-fuego.html, datos embebidos); el registro armonizado y su rango vienen de la API.
 */
import { SNAPSHOT_MONTHLY } from "./api-snapshot";

/** Primer año de la serie. */
export const SENSOR_FIRST_YEAR = 2003;

/** Mes (índice desde enero de 2003) en que empieza VIIRS: enero de 2012. */
export const VIIRS_START = 108;

/** Último mes con ambos satélites usados para aprender la conversión: diciembre de 2022. */
export const OVERLAP_END = 239;

/** Focos por mes de MODIS (2003-01 … 2025-12), sin ajustar. */
export const MODIS_MONTHLY: readonly number[] = [
  506, 180, 59, 148, 156, 426, 957, 3791, 4921, 1969, 784, 217, 617, 332, 87,
  131, 346, 403, 577, 2109, 4417, 778, 511, 215, 451, 214, 66, 103, 388, 609,
  3090, 8152, 5397, 1222, 1094, 213, 225, 113, 55, 122, 449, 279, 1711, 2871,
  4284, 1394, 224, 142, 388, 630, 50, 63, 232, 522, 1146, 4978, 5815, 2138, 309,
  317, 155, 243, 59, 106, 242, 379, 833, 3460, 5190, 962, 562, 463, 107, 99, 60,
  65, 190, 241, 657, 2544, 4061, 1509, 657, 362, 434, 153, 85, 96, 200, 446,
  1317, 7631, 5537, 1497, 946, 234, 350, 100, 100, 111, 200, 259, 752, 3750,
  3309, 931, 381, 124, 175, 93, 96, 101, 297, 346, 1475, 5807, 6818, 1515, 496,
  232, 148, 88, 79, 337, 132, 211, 799, 1910, 5828, 947, 689, 375, 134, 89, 73,
  178, 149, 385, 577, 3137, 3443, 1297, 428, 179, 160, 127, 76, 88, 111, 272,
  745, 3977, 5657, 1910, 505, 292, 435, 62, 120, 156, 310, 643, 2303, 5197,
  4666, 1319, 2351, 413, 164, 150, 68, 107, 125, 334, 1122, 2686, 3283, 1591,
  530, 405, 263, 188, 74, 105, 234, 350, 1093, 2772, 5912, 657, 316, 410, 128,
  37, 71, 146, 198, 577, 798, 6576, 5606, 1187, 292, 131, 324, 116, 98, 250,
  449, 754, 1287, 4100, 4152, 3049, 1621, 216, 245, 127, 62, 100, 196, 225,
  1199, 4188, 3826, 1551, 340, 253, 472, 114, 53, 65, 200, 565, 1181, 3717,
  6470, 1978, 1761, 767, 346, 139, 48, 81, 138, 581, 1457, 4449, 4916, 1656,
  472, 172, 168, 101, 105, 182, 266, 534, 1334, 4395, 8749, 2438, 927, 233, 271,
  79, 76, 69, 134, 205, 845, 1556, 2110, 1019, 509, 785,
];

/** Focos por mes de VIIRS (2012-01 … 2025-12), sin ajustar. */
export const VIIRS_MONTHLY: readonly number[] = [
  720, 974, 561, 676, 1739, 2198, 6918, 22704, 26982, 7960, 2383, 1472, 976,
  760, 533, 1813, 889, 1433, 4460, 10583, 25991, 5213, 4538, 2019, 1231, 849,
  499, 947, 849, 2239, 3882, 15608, 16433, 6711, 2753, 1335, 892, 743, 477, 532,
  673, 1810, 4317, 16548, 23404, 10123, 3379, 1712, 2557, 379, 662, 753, 1642,
  3342, 10919, 20819, 21638, 8165, 11266, 1830, 984, 848, 522, 626, 652, 1887,
  5838, 11749, 14101, 10389, 2715, 2008, 1469, 1183, 666, 838, 1345, 2444, 5333,
  12061, 22970, 3708, 2177, 2369, 1057, 493, 453, 900, 1394, 3162, 5055, 26186,
  21495, 5948, 2241, 966, 2012, 1272, 735, 1406, 2950, 4877, 6652, 30372, 16564,
  14024, 7977, 1807, 1478, 1032, 569, 675, 1289, 1982, 6364, 18115, 19134, 7790,
  2024, 1828, 2609, 624, 521, 716, 1229, 3470, 6361, 16637, 26216, 10192, 8908,
  4316, 2542, 944, 467, 716, 1139, 3317, 7527, 22052, 21726, 7847, 2597, 1328,
  1368, 639, 706, 1192, 1623, 3634, 7874, 23447, 36406, 12129, 4639, 1693, 1612,
  533, 538, 608, 1114, 1545, 5459, 10301, 12638, 6356, 2711, 5146,
];

/** Registro armonizado (API del backend): MODIS convertido a escala VIIRS antes de 2012 y VIIRS observado después. */
export const HARMONIZED_MONTHLY: readonly number[] =
  SNAPSHOT_MONTHLY.harmonized;

/** Rango p10–p90 del registro armonizado (igual al valor cuando el mes es VIIRS observado). */
export const HARMONIZED_LOW: readonly number[] = SNAPSHOT_MONTHLY.low;
export const HARMONIZED_HIGH: readonly number[] = SNAPSHOT_MONTHLY.high;

/** Razón VIIRS/MODIS en los años de solape (2012–2022), calculada con los conteos mensuales reales de arriba. */
export const SENSOR_RATIO = (() => {
  let m = 0;
  let v = 0;
  for (let t = VIIRS_START; t <= OVERLAP_END; t++) {
    m += MODIS_MONTHLY[t];
    v += VIIRS_MONTHLY[t - VIIRS_START];
  }
  return v / m;
})();
