# Yakana's Team · NASA Space Apps

Monorepo del proyecto.

| Carpeta     | Qué hay                         | Equipo   |
| ----------- | ------------------------------- | -------- |
| `frontend/` | Next.js (App Router) + Tailwind | Frontend |
| `backend/`  | _pendiente_                     | Backend  |

## Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run lint
```

### Estructura

```
frontend/src/
├─ app/
│  ├─ layout.tsx          # fuentes, fondo global (StarField + nebulosa) y Navbar
│  ├─ globals.css         # paleta, tokens de Tailwind, .bg-stars y .nebula
│  ├─ historia/page.tsx   # pantalla 1: la historia (landing con globo 3D)
│  ├─ metodo/             # pantalla 2: el método (page.tsx = metadata, View.tsx = contenido)
│  ├─ explorador/page.tsx # pantalla 3: explorador del fuego
│  └─ alertas/            # pantalla 4: alertas, fuegos activos y pronóstico
├─ components/
│  ├─ StarField.tsx       # estrellas tenues en canvas, fijas detrás de todo
│  ├─ Navbar.tsx          # barra fija sin fondo: logo + píldoras sueltas
│  ├─ Logo.tsx
│  └─ hero/               # pantalla 1: HeroScroll (historia con scroll) y GlobeScene (globo 3D)
│                         # CurvedCarousel y FireClock están hechos pero sin uso por ahora
└─ lib/
   ├─ api.ts              # cliente de la API del backend + tipos de sus respuestas
   ├─ use-api.ts          # hook useApi(path, params)
   ├─ lang.ts             # idioma global EN/ES (inglés por defecto, selector en el navbar)
   ├─ method-data.ts      # serie, calibración y validación del método (instantánea + lectura en vivo)
   ├─ api-snapshot.ts     # GENERADO: datos reales de la API (valor inicial, ver más abajo)
   └─ carousel.ts         # fotos del carrusel con autor, licencia y fuente

frontend/scripts/snapshot-api.mjs   # regenera src/lib/api-snapshot.ts desde la API
```

### Datos: la API del equipo de backend

Toda la web usa datos reales de la API "Calendario del Fuego" (FastAPI, documentación en
`docs/API.md` de la repo del backend). La dirección vive en una sola variable de entorno:

```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=https://...  (sin barra final)
```

Sin variable se usa el despliegue actual. Cuando la API pase a la repo oficial, solo cambia esa línea.

- **Pantalla 3** (explorador): `/regions`, `/calendar` (serie mensual 2003–2025 por región), `/heatmap` y `/export/mensual.csv`.
  El calendario es mensual porque la API no entrega conteos por semana histórica.
- **Pantalla 4** (alertas): `/alert`, `/events`, `/forecast`, `/health` y `/regions`.
- **Pantalla 2** (método): `/calendar`, `/calibration` y `/validation`. Arranca con una instantánea real
  (`src/lib/api-snapshot.ts`) y la reemplaza por la lectura en vivo. Los conteos crudos de MODIS y VIIRS
  (la línea "como llegan") salen de la extracción del equipo de backend, que la API no expone.
- **Pantalla 1** (historia): el año típico del fuego sale de la misma instantánea.

Para actualizar la instantánea: `node scripts/snapshot-api.mjs` (usa `API=https://...` para otra dirección).

### Idioma

El selector EN | ES está en el navbar y aplica a todas las pantallas (inglés por defecto, se recuerda en el navegador).
Cada componente guarda sus textos en un diccionario `{ en, es }` y los lee con `useLang()` (`src/lib/lang.ts`).

### Fondo global y navbar (para todas las pantallas)

- El fondo (estrellas + nebulosa navy) vive en `layout.tsx`, así que **ya está en todas las pantallas**: no hay que agregarlo.
  Las secciones deben tener fondo transparente y texto claro (`text-snow`).
- El navbar es fijo y transparente (56 px): en las pantallas 2 y 3 deja unos `pt-28` arriba para no tapar el título.
  En la pantalla 1 aparece al hacer scroll.
- La pantalla 1 usa three.js (`three` + `@react-three/fiber`) con texturas NASA en `public/images/earth/`.

Imágenes en `frontend/public/images/`: `earth/` (texturas NASA Blue Marble y VIIRS City Lights vía GIBS),
`carousel/` (fotos de incendios) y `nasa-logo-white.svg`.

### Créditos de imágenes

Las 12 fotos del carrusel son de Wikimedia Commons con licencia abierta; cada una
muestra su crédito en pantalla y el enlace a su página original (ver `src/lib/carousel.ts`).

- Ministerio de Defensa del Perú — CC BY 2.0
- Carlo Brescia, LLs, Johnattan Rupire, Txolo — CC BY-SA 4.0
- Thayne Tuason — CC BY 4.0

Las texturas del globo son imágenes de NASA (GIBS / Earthdata, dominio público).

El logo de NASA se usa solo para indicar el reto (NASA Space Apps Challenge); no implica respaldo de NASA.

`/` redirige a `/historia`. Cada integrante trabaja en su carpeta `pantalla-N`
(y sus componentes propios) para evitar conflictos de merge. Si algo es
compartido (botones, tarjetas...), va en `src/components/`.

### Identidad

- **Logo:** "Yakana's Team" en Irish Grover (`<Logo />`, clase `font-logo`).
- **Títulos:** Plus Jakarta Sans SemiBold/Bold (`font-heading`, aplicado a `h1-h4`).
- **Cuerpo:** Inter Regular/Medium (`font-sans`, por defecto).
- **Colores** (clases de Tailwind: `bg-snow`, `text-slate`, `bg-navy`, `text-ink`):
  - `#F3F9FC` snow, fondo
  - `#4C6679` slate, texto secundario
  - `#283A54` navy, color principal
  - `#0C090A` ink, texto
