/**
 * Conteos CRUDOS reales de la Pantalla 2 (Método), de la extracción del equipo de backend
 * (calendario-del-fuego.html, datos embebidos): focos de vegetación con confianza nominal y alta en el Perú.
 * La API no expone los conteos por satélite; la serie armonizada, su rango, la calibración y la
 * validación llegan en vivo desde la API (ver lib/method-data.ts).
 */
export const FIRST_VIIRS_YEAR = 2012;

export const SERIES = {
  years: [
    2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
  ],
  /** MODIS + todos los VIIRS sumados tal cual, sin armonizar («como llegan»). */
  raw: [
    14114, 10523, 20999, 11869, 16588, 12654, 10552, 18576, 10367, 92738, 70751,
    63405, 78530, 101947, 62884, 123649, 153378, 197757, 136659, 179864, 157991,
    205556, 105157,
  ],
};

/** Hitos de cambio de satélite, mostrados como líneas verticales. */
export const SATELLITE_MARKS = [
  { year: 2012.05, label: "+ S-NPP" },
  { year: 2018.25, label: "+ NOAA-20" },
];

/** Conteo anual crudo del Perú SEPARADO por satélite (VIIRS = un satélite por día). MODIS opera todo el periodo; VIIRS desde 2012. */
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
