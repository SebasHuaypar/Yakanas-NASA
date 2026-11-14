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
│  ├─ pantalla-1/page.tsx
│  ├─ pantalla-2/page.tsx
│  └─ pantalla-3/page.tsx
├─ components/
│  ├─ StarField.tsx       # estrellas tenues en canvas, fijas detrás de todo
│  ├─ Navbar.tsx          # barra fija sin fondo: logo + píldoras sueltas
│  ├─ Logo.tsx
│  └─ hero/               # pantalla 1: HeroScroll (historia con scroll) y GlobeScene (globo 3D)
│                         # CurvedCarousel y FireClock están hechos pero sin uso por ahora
└─ lib/
   ├─ fire-data.ts        # DATOS FALSOS por ahora (reemplazar por la API del backend)
   └─ carousel.ts         # fotos del carrusel con autor, licencia y fuente
```

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

`/` redirige a `/pantalla-1`. Cada integrante trabaja en su carpeta `pantalla-N`
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
