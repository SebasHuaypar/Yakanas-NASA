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
│  ├─ layout.tsx          # fuentes + Navbar
│  ├─ globals.css         # paleta y tokens de Tailwind
│  ├─ pantalla-1/page.tsx
│  ├─ pantalla-2/page.tsx
│  └─ pantalla-3/page.tsx
└─ components/
   ├─ Navbar.tsx
   └─ Logo.tsx
```

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
