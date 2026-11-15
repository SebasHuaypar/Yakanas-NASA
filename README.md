<div align="center">

# Yakana's Team · Fire Calendar of Peru

**One comparable record of Peru's satellite fire hotspots, 2003 → today — harmonized across NASA's MODIS and VIIRS sensors, explored on the web and turned into alerts.**

*NASA Space Apps Challenge 2026 · Lima*

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=fff)
![three.js](https://img.shields.io/badge/three.js-0.187-000?logo=threedotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-DuckDB-009688?logo=fastapi&logoColor=fff)
![Data](https://img.shields.io/badge/data-NASA%20FIRMS-0b3d91)

</div>

---

## Table of contents

1. [The problem](#1-the-problem)
2. [What we built](#2-what-we-built)
3. [Screens](#3-screens)
4. [Architecture](#4-architecture)
5. [The science in one page](#5-the-science-in-one-page)
6. [Repository layout](#6-repository-layout)
7. [Quick start](#7-quick-start)
8. [Deployment](#8-deployment)
9. [Data sources, licenses and credits](#9-data-sources-licenses-and-credits)
10. [Team](#10-team)

---

## 1. The problem

NASA has watched fire from space for more than twenty years, but **two different cameras** did it:

| Sensor | Satellites | Pixel | Period |
| --- | --- | --- | --- |
| **MODIS** | Terra, Aqua | 1 km | 2000 → today |
| **VIIRS** | Suomi-NPP, NOAA-20, NOAA-21 | **375 m** | 2012 → today |

VIIRS sees much smaller fires, so it reports **about 4.8 times more hotspots than MODIS** over the same land and the same years. If you simply add the two records, fire seems to explode in 2012 — and again in 2018 when a second VIIRS satellite joins. That jump is a change of *camera*, not a change of *fire*.

> **The challenge:** harmonize MODIS and VIIRS into a single, honest, comparable record — and make it useful for people who are not scientists.

```mermaid
xychart-beta
    title "Peru, hotspots per year — raw sum vs harmonized (thousands)"
    x-axis [2003, 2005, 2007, 2009, 2011, 2012, 2014, 2016, 2018, 2020, 2022, 2024]
    y-axis "hotspots (thousands)" 0 --> 210
    line [14, 21, 17, 11, 10, 93, 63, 102, 124, 198, 180, 206]
    line [75, 103, 83, 59, 57, 76, 53, 84, 56, 90, 82, 95]
```

*Top line: MODIS + VIIRS added as they arrive. Bottom line: the harmonized series in VIIRS-equivalent hotspots. The ×8.9 jump of 2012 disappears once both are on one scale.*

---

## 2. What we built

A full-stack product with a **backend** (data pipeline + API, built by the backend team) and a **frontend** (this repo's `frontend/`: four pages, bilingual EN/ES).

| # | Page | Route | What it does |
| - | ---- | ----- | ------------ |
| 1 | **Story** | `/historia` | A scroll-driven 3D globe travels to Peru, a "fire clock" shows a typical year, a real MODIS-vs-VIIRS lens shows why the cameras disagree, and an animated chart shows how we merge them. |
| 2 | **Method** | `/metodo` | The harmonization explained and *auditable*: before/after chart, validation on years the model never saw, per-region parameters, an interactive simulator of the formula. |
| 3 | **Explorer** | `/explorador` | Pick a region, a year and a month: summary, department map, **real 3D terrain with the real hotspot cells**, a 23-year monthly calendar, CSV export. |
| 4 | **Prevention** | `/prevencion` | For families, farmers, firefighters and authorities: check *your places* against nearby fire, copy field coordinates and print a situation report, and see where fire usually appears this time of year. |
| – | **YakaLlama** | every page | Floating chatbot mascot (UI ready, answers coming soon). |

Everything shown is **real data** from the team's API. Nothing is simulated or illustrative.

---

## 3. Screens

<table>
<tr>
<td width="50%"><b>Story — the typical year</b><br><img src="docs/images/story-clock.jpg" alt="Fire clock: a typical year of fire in Peru"></td>
<td width="50%"><b>Story — two eyes in the sky</b><br><img src="docs/images/story-lens.jpg" alt="Lens comparing real MODIS and VIIRS pixels"></td>
</tr>
<tr>
<td><b>Method — before and after correcting</b><br><img src="docs/images/method-chart.jpg" alt="Raw vs harmonized yearly series"></td>
<td><b>Explorer — real hotspots on 3D terrain</b><br><img src="docs/images/explorer-3d.jpg" alt="Department map and 3D relief with real hotspot cells"></td>
</tr>
<tr>
<td><b>Explorer — 23-year monthly calendar</b><br><img src="docs/images/explorer-calendar.jpg" alt="Year × month calendar"></td>
<td><b>Prevention — my places</b><br><img src="docs/images/prevention-places.jpg" alt="A saved place with nearest detection, season history and share buttons"></td>
</tr>
</table>

---

## 4. Architecture

```mermaid
flowchart LR
    subgraph NASA["NASA FIRMS"]
        A1[MODIS archive<br/>2003 →]
        A2[VIIRS S-NPP / NOAA-20<br/>archive 2012 →]
        A3[Near-real-time<br/>MODIS + VIIRS<br/>last days]
    end

    subgraph BE["backend/  ·  FastAPI + DuckDB  ·  Cloud Run"]
        B1[ingest/<br/>download + filter]
        B2[harmonize/<br/>fit log-log model<br/>2012–2022, frozen]
        B3[(Parquet<br/>cell-day series)]
        B4[app/<br/>REST API<br/>GET only, CORS open]
    end

    subgraph FE["frontend/  ·  Next.js 16  ·  Vercel"]
        C1["/historia"]
        C2["/metodo"]
        C3["/explorador"]
        C4["/prevencion"]
        C5[lib/api.ts<br/>+ snapshot]
    end

    U((People<br/>and authorities))

    A1 & A2 & A3 --> B1 --> B2 --> B3 --> B4
    B4 -- JSON / CSV --> C5
    C5 --> C1 & C2 & C3 & C4
    C1 & C2 & C3 & C4 --> U
    AWS[(AWS Terrain Tiles<br/>Sentinel-2 cloudless)] -. relief + imagery .-> C3
    NASAG[(NASA GIBS<br/>Blue Marble, City Lights)] -. globe textures .-> C1
```

### How a page gets its data

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser
    participant F as Next.js page (static)
    participant S as api-snapshot.ts (real, built-in)
    participant A as Backend API

    U->>F: open /metodo
    F-->>U: HTML with the REAL snapshot already inside
    Note over U,S: first paint is instant and already correct
    U->>A: GET /calendar, /calibration, /validation
    A-->>U: live JSON
    U->>U: swap snapshot → live data (silently)
    Note over U,A: if the API is down, the snapshot stays — nothing breaks
```

The **Method** and **Story** pages use this *snapshot-then-live* pattern. The **Explorer** and **Prevention** pages always load live (with loading and retry states), because their numbers change.

### What each page asks the API

```mermaid
flowchart TB
    subgraph Pages
      P1[Story]
      P2[Method]
      P3[Explorer]
      P4[Prevention]
    end
    subgraph Endpoints["Backend endpoints"]
      E1["/calendar"]
      E2["/calibration"]
      E3["/validation"]
      E4["/regions"]
      E5["/heatmap"]
      E6["/export/mensual.csv"]
      E7["/alert"]
      E8["/events"]
      E10["/fires"]
      E11["/health"]
      E12["/recurrence"]
      E13["/recurrence/place"]
    end
    P1 --> E10
    P2 --> E1 & E2 & E3
    P3 --> E4 & E1 & E5 & E6
    P4 --> E10 & E8 & E7 & E11 & E12 & E13
```

---

## 5. The science in one page

**One VIIRS satellite per day.** Adding satellites would inflate the series, so the pipeline keeps NOAA-20 (since April 2018), Suomi-NPP before that, and NOAA-21 only as a backup.

**Filters.** Vegetation fires only (`type = 0`) with nominal or high confidence; cells that were ever a volcano, a fixed source or sea are dropped. Local date (UTC−5), on a 0.02° grid (~5 km²).

**The model.** For each department, MODIS monthly totals are translated into VIIRS-equivalent hotspots with a log-log regression fitted on the years both satellites overlap (2012–2022):

```
log(V + 1) = a + d · high_season + b · log(M + 1)
V̂ = smear × e^(a + d·high + b·log(M+1)) − 1          (Duan smearing correction)
range = p10 … p90 of the model residuals
```

A department with fewer than 24 months with fire, fewer than 1 500 VIIRS hotspots in 2012–2022, or a slope `b` outside 0.5–1.3 uses the **national fit** instead.

```mermaid
flowchart LR
    M["MODIS monthly count<br/>per department"] --> L1["log(M+1)"]
    L1 --> R["× b  + a  + d·high"]
    R --> E["e^… × smear − 1"]
    E --> V["VIIRS-equivalent<br/>hotspots"]
    R --> Q["± residual p10 / p90"]
    Q --> RANGE["uncertainty range"]
```

**Honest validation.** Trained on 2012–2019, tested on 2020–2022 (years the model never saw):

| Metric | Value |
| --- | --- |
| National monthly error | **≈ 13 %** |
| R² of the national monthly total | **0.94** |
| Real months inside the announced range | **63 %** |
| Average error per department and month | ≈ 24 % |
| Error by zone | Rainforest 18 % · Highlands 25 % · Coast 51 % (very little fire there) |

The seasonal history page is validated too: zones that had fire in 60–80 % of past years actually burned about **85 %** of the time in the 2019–2025 tests (the API's own back-test).

Full details live in [`backend/docs/metodo.md`](backend/docs/metodo.md) and [`backend/docs/API.md`](backend/docs/API.md).

---

## 6. Repository layout

```
Yakanas-NASA/
├─ README.md                  ← you are here (project overview)
├─ docs/
│  └─ images/                 ← screenshots used in the READMEs
├─ frontend/                  ← Next.js app (see frontend/README.md)
│  ├─ src/app/                  routes: historia, metodo, explorador, prevencion
│  ├─ src/components/           shared UI + per-page components
│  ├─ src/lib/                  API client, i18n, data hooks, snapshot
│  ├─ scripts/                  snapshot-api.mjs
│  └─ public/                   images, textures, icons
└─ backend/                   ← API + pipeline (owned by the backend team; see backend/README.md)
   ├─ app/                      FastAPI routes
   ├─ ingest/                   FIRMS downloads
   ├─ harmonize/                the model and the series build
   ├─ data/out/                 small results kept in git
   ├─ docs/                     API.md, metodo.md
   └─ web/                      their own reference pages
```

| Folder | Owner | Docs |
| --- | --- | --- |
| `frontend/` | Frontend team | [`frontend/README.md`](frontend/README.md) |
| `backend/` | Backend team | [`backend/README.md`](backend/README.md) |

---

## 7. Quick start

You only need **Node.js 20+** to run the website; it talks to the already-deployed API.

```bash
git clone https://github.com/SebasHuaypar/Yakanas-NASA.git
cd Yakanas-NASA/frontend
npm install
npm run dev          # http://localhost:3000  →  redirects to /historia
```

Other commands: `npm run build` (production build), `npm run lint`, `npx tsc --noEmit`.

To point the site at another API (for example a local one), copy the example env file:

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=https://… (no trailing slash)
```

To run the **backend** locally (Python or Docker, needs a free FIRMS key) follow [`backend/README.md`](backend/README.md).

---

## 8. Deployment

| Piece | Where | Notes |
| --- | --- | --- |
| **Frontend** | Vercel | Set **Root Directory = `frontend`**. Optional env var `NEXT_PUBLIC_API_URL`. The build is fully static. |
| **Backend API** | Google Cloud Run (`southamerica-west1`) | Container built from `backend/Dockerfile`. |

When the API moves to its final address, **only `NEXT_PUBLIC_API_URL` changes** — no code.

---

## 9. Data sources, licenses and credits

| Data | Source | License / terms |
| --- | --- | --- |
| Fire hotspots | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (MODIS C6.1, VIIRS 375 m) | NASA open data |
| Globe textures | NASA GIBS: Blue Marble, VIIRS City Lights | Public domain |
| Terrain elevation | AWS Open Data · Terrain Tiles (Terrarium) | Open |
| Satellite imagery in 3D | Sentinel-2 cloudless © [EOX](https://s2maps.eu) | CC BY-NC-SA 4.0 (credit shown on screen) |
| Department boundaries | geoBoundaries | CC BY |
| Place names | GeoNames | CC BY 4.0 |
| Fonts | Irish Grover (logo), Plus Jakarta Sans (titles), Inter (body) | SIL OFL |

The NASA logo is used only to name the challenge; it does not imply NASA's endorsement.

---

## 10. Team

Built by **Yakana's Team**: Darcy Ortega · Sebastián Huaypar · Giordano Medrano · Isabel Makishi · Cesar Correa · Isaac Martel.

- **Frontend:** Sebastián Huaypar (Story page, shared design system, global language system, Prevention, data integration), Giordano Medrano (Method page), Darcy Ortega (Explorer).
- **Backend and data:** Cesar Correa and team (pipeline, model, API).

