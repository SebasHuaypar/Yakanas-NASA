/**
 * Parámetros del modelo por región (PLACEHOLDER: salen del prototipo; el backend los reemplaza).
 * a = nivel base, d = efecto de temporada alta, b = relación MODIS→VIIRS (en logaritmos).
 */
export type RegionFit = { name: string; zone: "costa" | "sierra" | "selva"; own: boolean; a: number; d: number; b: number; months: number; high: string[] };

export const REGION_FITS: RegionFit[] = [
  {
    "name": "Amazonas",
    "zone": "sierra",
    "own": true,
    "a": 2.23,
    "d": 0.71,
    "b": 0.74,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct",
      "nov",
      "dic"
    ]
  },
  {
    "name": "Ancash",
    "zone": "sierra",
    "own": true,
    "a": 2.44,
    "d": 0.27,
    "b": 0.68,
    "months": 131,
    "high": [
      "jul",
      "ago",
      "set",
      "nov"
    ]
  },
  {
    "name": "Apurímac",
    "zone": "sierra",
    "own": true,
    "a": 1.26,
    "d": 0.87,
    "b": 0.86,
    "months": 111,
    "high": [
      "jul",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Arequipa",
    "zone": "costa",
    "own": true,
    "a": 2.43,
    "d": 0.01,
    "b": 0.65,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Ayacucho",
    "zone": "sierra",
    "own": true,
    "a": 1.38,
    "d": 0.56,
    "b": 0.93,
    "months": 126,
    "high": [
      "jul",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Cajamarca",
    "zone": "sierra",
    "own": true,
    "a": 2.38,
    "d": 0.67,
    "b": 0.71,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct",
      "nov",
      "dic"
    ]
  },
  {
    "name": "Cusco",
    "zone": "sierra",
    "own": true,
    "a": 1.35,
    "d": 0.49,
    "b": 0.94,
    "months": 131,
    "high": [
      "jul",
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "El Callao",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 48,
    "high": [
      "jun"
    ]
  },
  {
    "name": "Huancavelica",
    "zone": "sierra",
    "own": true,
    "a": 1.12,
    "d": 0.85,
    "b": 0.9,
    "months": 110,
    "high": [
      "jul",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Huánuco",
    "zone": "sierra",
    "own": true,
    "a": 2.34,
    "d": 0.1,
    "b": 0.85,
    "months": 130,
    "high": [
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "Ica",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 131,
    "high": [
      "mar",
      "abr",
      "may",
      "jun",
      "jul"
    ]
  },
  {
    "name": "Junín",
    "zone": "sierra",
    "own": true,
    "a": 2.04,
    "d": 0.16,
    "b": 0.89,
    "months": 131,
    "high": [
      "jul",
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "La Libertad",
    "zone": "costa",
    "own": true,
    "a": 2.48,
    "d": 0.38,
    "b": 0.65,
    "months": 131,
    "high": [
      "may",
      "jul",
      "ago",
      "set",
      "nov"
    ]
  },
  {
    "name": "Lambayeque",
    "zone": "costa",
    "own": true,
    "a": 2.28,
    "d": 0.4,
    "b": 0.62,
    "months": 131,
    "high": [
      "jun",
      "jul",
      "ago",
      "set",
      "oct",
      "nov",
      "dic"
    ]
  },
  {
    "name": "Lima",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Lima Metropolitana",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 107,
    "high": [
      "ene",
      "feb",
      "mar",
      "abr",
      "nov"
    ]
  },
  {
    "name": "Loreto",
    "zone": "selva",
    "own": true,
    "a": 2.71,
    "d": 0.39,
    "b": 0.75,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "Madre de Dios",
    "zone": "selva",
    "own": true,
    "a": 1.91,
    "d": -0.05,
    "b": 0.91,
    "months": 128,
    "high": [
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "Moquegua",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 128,
    "high": [
      "feb",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Pasco",
    "zone": "sierra",
    "own": true,
    "a": 1.71,
    "d": 0.11,
    "b": 0.93,
    "months": 126,
    "high": [
      "jul",
      "ago",
      "set",
      "oct"
    ]
  },
  {
    "name": "Piura",
    "zone": "costa",
    "own": true,
    "a": 2.41,
    "d": 0.28,
    "b": 0.76,
    "months": 131,
    "high": [
      "jul",
      "set",
      "oct",
      "nov",
      "dic"
    ]
  },
  {
    "name": "Puno",
    "zone": "sierra",
    "own": true,
    "a": 1.63,
    "d": 0.54,
    "b": 0.85,
    "months": 127,
    "high": [
      "jul",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "San Martín",
    "zone": "selva",
    "own": true,
    "a": 2.79,
    "d": 0.2,
    "b": 0.78,
    "months": 131,
    "high": [
      "ago",
      "set"
    ]
  },
  {
    "name": "Tacna",
    "zone": "costa",
    "own": false,
    "a": 1.69,
    "d": 0,
    "b": 0.98,
    "months": 128,
    "high": [
      "jun",
      "ago",
      "set",
      "oct",
      "nov"
    ]
  },
  {
    "name": "Tumbes",
    "zone": "costa",
    "own": true,
    "a": 1.58,
    "d": 0.46,
    "b": 0.66,
    "months": 116,
    "high": [
      "jun",
      "jul",
      "nov",
      "dic"
    ]
  },
  {
    "name": "Ucayali",
    "zone": "selva",
    "own": true,
    "a": 2.52,
    "d": 0.28,
    "b": 0.78,
    "months": 131,
    "high": [
      "ago",
      "set",
      "oct"
    ]
  }
];

export const NATIONAL_FIT = {"a":1.69,"d":0,"b":0.98,"n":3219};
