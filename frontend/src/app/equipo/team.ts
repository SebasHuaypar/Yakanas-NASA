/**
 * Integrantes de Yakana's Team.
 * Para completar una tarjeta basta con editar esta lista:
 *  - photo: ruta de la foto dentro de /public (por ejemplo "/equipo/sebastian.jpg"). Sin foto se muestra la inicial.
 *  - links: solo se dibujan los iconos de las redes que tengan enlace (linkedin, instagram, github, email).
 */
export type Member = {
  id: string;
  name: string;
  photo?: string;
  role: { en: string; es: string };
  contribution?: { en: string; es: string };
  links: {
    linkedin?: string;
    instagram?: string;
    github?: string;
    email?: string;
  };
};

export const TEAM: Member[] = [
  {
    id: "sebastian",
    name: "Sebastián Huaypar",
    role: { en: "Frontend lead", es: "Líder de frontend" },
    contribution: {
      en: "Designed the site's visual identity and shared design system, built the Story and Prevention pages, the EN/ES language system and the connection to the real data API.",
      es: "Diseñó la identidad visual y el sistema de diseño compartido, construyó las páginas Historia y Prevención, el sistema de idiomas EN/ES y la conexión con la API de datos reales.",
    },
    links: { github: "https://github.com/SebasHuaypar" },
  },
  {
    id: "giordano",
    name: "Giordano Medrano",
    role: { en: "Frontend", es: "Frontend" },
    contribution: {
      en: "Built the Method page: the before-and-after chart, the validation and the interactive simulator of the harmonization formula.",
      es: "Construyó la página Método: el gráfico antes y después, la validación y el simulador interactivo de la fórmula de armonización.",
    },
    links: {},
  },
  {
    id: "darcy",
    name: "Darcy Ortega",
    role: { en: "Frontend", es: "Frontend" },
    contribution: {
      en: "Built the Explorer: the department map, the 3D terrain view with real hotspot cells and the 23-year monthly calendar.",
      es: "Construyó el Explorador: el mapa por departamentos, la vista de relieve 3D con las celdas de calor reales y el calendario mensual de 23 años.",
    },
    links: {},
  },
  {
    id: "cesar",
    name: "Cesar Correa",
    role: { en: "Backend and data", es: "Backend y datos" },
    contribution: {
      en: "Built the data pipeline, the MODIS–VIIRS harmonization model and the API that feeds the whole website.",
      es: "Construyó el pipeline de datos, el modelo de armonización MODIS–VIIRS y la API que alimenta toda la web.",
    },
    links: { github: "https://github.com/C-M-Cesar" },
  },
  {
    id: "isabel",
    name: "Isabel Makishi",
    role: { en: "Team member", es: "Integrante" },
    links: {},
  },
  {
    id: "isaac",
    name: "Isaac Martel",
    role: { en: "Team member", es: "Integrante" },
    links: {},
  },
];
