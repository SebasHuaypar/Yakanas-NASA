/**
 * Datos de ejemplo para la Pantalla 2 (Método).
 *
 * Serie anual de focos de calor para todo el Perú, calculada con el modelo del
 * prototipo (calendario-del-fuego.html). Es PLACEHOLDER: cuando el backend
 * exponga el dataset armonizado, solo hay que reemplazar este objeto por la
 * respuesta de la API manteniendo la misma forma (`HarmonizedSeries`).
 */
export type HarmonizedSeries = {
  /** Años de la serie (uno por punto). */
  years: number[];
  /** MODIS + VIIRS sumados tal cual, sin armonizar. */
  raw: number[];
  /** Serie armonizada a escala VIIRS (mediana estimada). */
  harmonized: number[];
  /** Rango bajo (p10) de la estimación; igual a `harmonized` desde que hay VIIRS. */
  low: number[];
  /** Rango alto (p90) de la estimación. */
  high: number[];
};

export const FIRST_VIIRS_YEAR = 2012;

export const SERIES: HarmonizedSeries = {
  years: [
    2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
  ],
  raw: [
    14114, 10523, 20999, 11869, 16588, 12654, 10552, 18576, 10367, 92738, 70751,
    63405, 78530, 101947, 62884, 123649, 153378, 197757, 136659, 179864, 157991,
    205556, 105157,
  ],
  harmonized: [
    74311, 57606, 102490, 63724, 82710, 67456, 58527, 92371, 56413, 75287,
    59208, 53336, 64610, 83972, 52319, 56563, 69350, 90648, 62280, 81799, 72202,
    95350, 48561,
  ],
  low: [
    40242, 32184, 54696, 35080, 45974, 37248, 32282, 50026, 31277, 75287, 59208,
    53336, 64610, 83972, 52319, 56563, 69350, 90648, 62280, 81799, 72202, 95350,
    48561,
  ],
  high: [
    113041, 87566, 155903, 96910, 125091, 102248, 88931, 140217, 85423, 75287,
    59208, 53336, 64610, 83972, 52319, 56563, 69350, 90648, 62280, 81799, 72202,
    95350, 48561,
  ],
};

/** Hitos de cambio de satélite, mostrados como líneas verticales. */
export const SATELLITE_MARKS = [
  { year: 2012.05, label: "+ S-NPP" },
  { year: 2018.25, label: "+ NOAA-20" },
];

/** Parámetros del ajuste nacional (PLACEHOLDER, vienen del modelo). */
export const MODEL_FIT = { a: 1.69, d: 0.01, b: 0.98 };

/**
 * Escena real de NASA Worldview usada en el comparador MODIS vs VIIRS.
 * Los recuentos son APROXIMADOS: se contaron las marcas dibujadas en las
 * imágenes (diferencia contra la misma imagen sin capa de focos). Dos focos
 * muy juntos pueden fundirse en una marca, así que ambos valores son un mínimo.
 */
export const SCENE = {
  date: "30 de agosto de 2020",
  area: "Amazonía central del Perú, alrededor de Pucallpa",
  /** Reparto del recuadro por departamento, calculado con los límites del prototipo. */
  coverage: "≈75 % Ucayali · ≈19 % Huánuco · ≈5 % Loreto",
  bbox: "9,6°–8,1° S · 75,9°–73,5° O",
  modisMarks: 31,
  viirsMarks: 227,
};

/**
 * Conteo anual de focos del Perú SEPARADO por satélite (prototipo; vegetación, confianza nominal y
 * alta). PLACEHOLDER: el backend lo reemplaza. MODIS opera todo el periodo; VIIRS desde 2012.
 */
export const BY_SENSOR = {
  years: [
    2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
  ],
  modis: [
    14114, 10523, 20999, 11869, 16588, 12654, 10552, 18576, 10367, 17451, 11543,
    10069, 13920, 17975, 10565, 12374, 15747, 16416, 12312, 17343, 14455, 19432,
    7658,
  ],
  viirs: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 75287, 59208, 53336, 64610, 83972, 52319, 56563,
    69350, 90648, 62280, 81799, 72202, 95350, 48561,
  ],
};
