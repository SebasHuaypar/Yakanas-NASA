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
    photo: "/equipo/sebastian.jpg",
    role: { en: "Project Manager & Team Lead", es: "Project Manager y líder del equipo" },
    contribution: {
      en: "Led the project end to end: set the vision, coordinated the team and the work of every branch, and made sure everything came together as one coherent product. Designed the visual identity and shared design system, built the Story, Prevention, Response and Team pages, the EN/ES language system and the connection to the real data API, automated the daily data refresh and the deployment, and kept the quality of the whole site high.",
      es: "Lideró el proyecto de punta a punta: definió la visión, coordinó al equipo y el trabajo de cada rama, y se aseguró de que todo se uniera en un solo producto coherente. Diseñó la identidad visual y el sistema de diseño compartido, construyó las páginas Historia, Prevención, Respuesta y Equipo, el sistema de idiomas EN/ES y la conexión con la API de datos reales, automatizó la actualización diaria de datos y el despliegue, y cuidó la calidad de todo el sitio.",
    },
    links: {
      linkedin: "https://www.linkedin.com/in/sebashuaypar/",
      instagram: "https://www.instagram.com/sebas_huaypar/",
      github: "https://github.com/SebasHuaypar",
    },
  },
  {
    id: "giordano",
    name: "Giordano Medrano",
    photo: "/equipo/giordano.jpg",
    role: { en: "Frontend Developer", es: "Desarrollador frontend" },
    contribution: {
      en: "Built the Method page: the before-and-after chart, the validation and the interactive simulator of the harmonization formula. Also designed the official Yakana logotype and isotype.",
      es: "Construyó la página Método: el gráfico antes y después, la validación y el simulador interactivo de la fórmula de armonización. También diseñó el logotipo e isotipo oficiales de Yakana.",
    },
    links: {
      linkedin: "https://www.linkedin.com/in/giordanomedrano",
      instagram: "https://www.instagram.com/giordanomedranoc/",
      email: "giordanomc041020@gmail.com",
    },
  },
  {
    id: "darcy",
    name: "Darcy Ortega",
    photo: "/equipo/darcy.jpg",
    role: { en: "Full-stack Developer", es: "Desarrollador full-stack" },
    contribution: {
      en: "Built the Explorer: the department map, the 3D terrain view with real hotspot cells and the 23-year monthly calendar. Also built YakaLlama, the assistant connected to NVIDIA models and the backend data, and produced the project's pitch video.",
      es: "Construyó el Explorador: el mapa por departamentos, la vista de relieve 3D con las celdas de calor reales y el calendario mensual de 23 años. También construyó YakaLlama, el asistente conectado a modelos de NVIDIA y a los datos del backend, y produjo el video de pitch del proyecto.",
    },
    links: {
      linkedin: "https://www.linkedin.com/in/ortega-sullcaccori-darcy",
      github: "https://github.com/DarcyOrtegaSullcaccori",
      email: "ortegadarcy2005@gmail.com",
    },
  },
  {
    id: "cesar",
    name: "Cesar Correa",
    photo: "/equipo/cesar.jpg",
    role: { en: "Backend Lead", es: "Líder de backend" },
    contribution: {
      en: "Built the API that serves the historical series, the live week and the prevention model, and configured and deployed it on Google Cloud so the whole platform can query it.",
      es: "Construyó la API que sirve la serie histórica, la semana en vivo y el modelo de prevención, y la configuró y desplegó en Google Cloud para que toda la plataforma pueda consultarla.",
    },
    links: {
      github: "https://github.com/C-M-Cesar",
      linkedin: "https://www.linkedin.com/in/cesar-abrahan-correa-mullisaca-5b398939b",
    },
  },
  {
    id: "isabel",
    name: "Isabel Makishi",
    photo: "/equipo/isabel.jpg",
    role: { en: "Data Engineer", es: "Data Engineer" },
    contribution: {
      en: "Engineered the data ingestion pipeline, implemented the MODIS–VIIRS harmonization methodology, ensured data quality, set up the monthly retraining of the model and developed the backend API powering the entire platform.",
      es: "Construyó el pipeline de ingesta de datos, implementó la metodología de armonización MODIS–VIIRS, aseguró la calidad de los datos, configuró el reentrenamiento mensual del modelo y desarrolló la API de backend que alimenta toda la plataforma.",
    },
    links: {
      linkedin: "https://www.linkedin.com/in/imakishim/",
      github: "https://github.com/mikita925",
    },
  },
  {
    id: "isaac",
    name: "Isaac Martel",
    photo: "/equipo/isaac.webp",
    role: { en: "Data Scientist", es: "Data Scientist" },
    contribution: {
      en: "Built the predictive model, a logistic regression trained on the harmonized series and compared against four other methods, and collaborated on the MODIS–VIIRS harmonization model and on integrating the team’s work into the 2003–2026 series and its API.",
      es: "Construyó el modelo predictivo, una regresión logística entrenada con la serie armonizada y comparada con otros cuatro métodos, y colaboró en el modelo de armonización MODIS–VIIRS y en la integración del trabajo del equipo en la serie 2003–2026 y su API.",
    },
    links: {
      linkedin: "https://www.linkedin.com/in/isaac-martel-balvin",
      github: "https://github.com/SL7u777",
    },
  },
];
