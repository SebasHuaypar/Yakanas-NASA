/**
 * Fotos reales de incendios en el Perú para el carrusel del hero.
 * Todas vienen de Wikimedia Commons con licencia abierta; el crédito se
 * muestra en la propia foto (autor + licencia, con enlace a la fuente).
 *
 * Para agregar una foto: guardarla (3:4, ~900x1200, .webp) en
 * public/images/carousel/ y añadir una línea aquí.
 */
export type CarouselItem = {
  src: string;
  alt: string;
  /** Lugar y fecha que se muestran en la tarjeta. */
  place: string;
  date: string;
  /** Crédito en pantalla: autor + licencia. */
  author: string;
  license: string;
  /** Página original de la foto en Wikimedia Commons. */
  source: string;
};

const MINDEF = "Ministerio de Defensa del Perú";
const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${file}`;

export const CAROUSEL: readonly CarouselItem[] = [
  {
    src: "/images/carousel/fuego-1.webp",
    alt: "Humo de un incendio forestal sobre una ladera en Pucallpa",
    place: "Pucallpa, Ucayali",
    date: "Setiembre 2024",
    author: MINDEF,
    license: "CC BY 2.0",
    source: commons("Incendios_forestales_en_Pucallpa.jpg"),
  },
  {
    src: "/images/carousel/fuego-2.webp",
    alt: "Columna de humo de un incendio sobre el cerro San Cristóbal, en Huaraz",
    place: "Huaraz, Áncash",
    date: "Agosto 2024",
    author: "Carlo Brescia",
    license: "CC BY-SA 4.0",
    source: commons(
      "Incendios_forestales_alrededor_del_cerro_San_Cristóbal_01.jpg",
    ),
  },
  {
    src: "/images/carousel/fuego-3.webp",
    alt: "Vista aérea de un campo quemado en la comunidad de Yarinacocha",
    place: "Yarinacocha, Ucayali",
    date: "Setiembre 2024",
    author: "Johnattan Rupire",
    license: "CC BY-SA 4.0",
    source: commons("Incendios_forestales_en_Yarinacocha_de_2024_14.jpg"),
  },
  {
    src: "/images/carousel/fuego-4.webp",
    alt: "Incendio forestal con llamas y humo en las afueras de Iquitos",
    place: "Iquitos, Loreto",
    date: "Setiembre 2024",
    author: "LLs",
    license: "CC BY-SA 4.0",
    source: commons("Incendio_forestal_en_las_afueras_de_Iquitos.jpg"),
  },
  {
    src: "/images/carousel/fuego-5.webp",
    alt: "Vista aérea de laderas andinas quemadas en Áncash",
    place: "Áncash",
    date: "Setiembre 2024",
    author: MINDEF,
    license: "CC BY 2.0",
    source: commons("Incendios_en_Ancash.jpg"),
  },
  {
    src: "/images/carousel/fuego-6.webp",
    alt: "Áreas quemadas en la comunidad shipibo-konibo Santa Clara de Yarinacocha",
    place: "Santa Clara de Yarinacocha, Ucayali",
    date: "Octubre 2024",
    author: "Johnattan Rupire",
    license: "CC BY-SA 4.0",
    source: commons(
      "Áreas_quemadas_en_la_comunidad_shipibo_konibo_Santa_Clara_de_Yarinacocha.jpg",
    ),
  },
  {
    src: "/images/carousel/fuego-7.webp",
    alt: "Descarga de agua desde un helicóptero sobre un incendio en Chachapoyas",
    place: "Chachapoyas, Amazonas",
    date: "Setiembre 2024",
    author: MINDEF,
    license: "CC BY 2.0",
    source: commons(
      "Descarga_de_agua_hacia_los_incendios_forestales_en_Chachapoyas.jpg",
    ),
  },
  {
    src: "/images/carousel/fuego-8.webp",
    alt: "Colinas altoandinas quemadas entre Huancayo y Ayacucho",
    place: "Entre Huancayo y Ayacucho",
    date: "Octubre 2019",
    author: "Thayne Tuason",
    license: "CC BY 4.0",
    source: commons(
      "Peruvian_highlands_burned-_between_Huancayo_and_Ayuacucho.jpg",
    ),
  },
  {
    src: "/images/carousel/fuego-9.webp",
    alt: "Paisaje quemado con humo en las comunidades shipibo-konibo de Yarinacocha",
    place: "Yarinacocha, Ucayali",
    date: "Setiembre 2024",
    author: "Johnattan Rupire",
    license: "CC BY-SA 4.0",
    source: commons("Incendios_forestales_en_Yarinacocha_de_2024_05.jpg"),
  },
  {
    src: "/images/carousel/fuego-10.webp",
    alt: "Bosque seco quemado en la comunidad nativa Puerto Firmeza",
    place: "Puerto Firmeza, Ucayali",
    date: "Octubre 2024",
    author: "Txolo",
    license: "CC BY-SA 4.0",
    source: commons("Incendios_forestales_en_Puerto_Firmeza.jpg"),
  },
  {
    src: "/images/carousel/fuego-11.webp",
    alt: "Vegetación quemada en las comunidades nativas de Yarinacocha",
    place: "Yarinacocha, Ucayali",
    date: "Setiembre 2024",
    author: "Johnattan Rupire",
    license: "CC BY-SA 4.0",
    source: commons("Incendios_forestales_en_Yarinacocha_de_2024_01.jpg"),
  },
  {
    src: "/images/carousel/fuego-12.webp",
    alt: "Llanura quemada junto a una comunidad nativa de Yarinacocha",
    place: "Yarinacocha, Ucayali",
    date: "Setiembre 2024",
    author: "Johnattan Rupire",
    license: "CC BY-SA 4.0",
    source: commons("Incendios_forestales_en_Yarinacocha_de_2024_10.jpg"),
  },
];
