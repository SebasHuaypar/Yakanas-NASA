<div align="center">

<img src="docs/images/banner.svg" alt="Yakana’s Fire Intelligence" width="720">

# Yakana’s Fire Intelligence

**One comparable record of Peru's satellite fire hotspots, 2003 → today — harmonized across NASA's MODIS and VIIRS sensors, explored on the web, turned into a fire-risk forecast for families, farmers and firefighters, and open to questions through an AI assistant.**

*NASA Space Apps Challenge 2026 · by **Yakana's Team** · [yakanas.earth](https://yakanas.earth)*

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=fff)
![three.js](https://img.shields.io/badge/three.js-0.187-000?logo=threedotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-DuckDB-009688?logo=fastapi&logoColor=fff)
![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run%20%2B%20Jobs-4285f4?logo=googlecloud&logoColor=fff)
![Vercel](https://img.shields.io/badge/Vercel-deployed-000?logo=vercel)
![Data](https://img.shields.io/badge/data-NASA%20FIRMS-0b3d91)

</div>

<p align="center">
  <img src="docs/images/story-hero.jpg" alt="Yakana’s Fire Intelligence: the globe travels to Peru" width="820">
</p>

---

## Table of contents

1. [The problem](#1-the-problem)
2. [What we built](#2-what-we-built)
3. [Screens](#3-screens)
4. [Architecture](#4-architecture)
5. [The science in one page](#5-the-science-in-one-page)
6. [The prevention model](#6-the-prevention-model)
7. [Repository layout](#7-repository-layout)
8. [Quick start](#8-quick-start)
9. [Deployment and CI/CD](#9-deployment-and-cicd)
10. [Data sources, licenses and credits](#10-data-sources-licenses-and-credits)
11. [Team](#11-team)

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

**Yakana’s Fire Intelligence** is a full-stack product: a **backend** (data pipeline, prevention model and API) and a **frontend** (`frontend/`: six pages and an AI assistant, bilingual EN/ES).

| # | Page | Route | What it does |
| - | ---- | ----- | ------------ |
| 1 | **Story** | `/historia` | A scroll-driven 3D globe travels to Peru and shows **this week's real hotspots**, explains Costa / Sierra / Selva, and ends with the problem of the two satellites. |
| 2 | **Team** | `/equipo` | Photo cards that flip to show each person's contribution, with their social links. |
| 3 | **Method** | `/metodo` | The harmonization explained and *auditable*: before/after chart, and four tabs — try the model, validation, assumptions and limits, parameters by region. |
| 4 | **Explorer** | `/explorador` | Pick a region, a year and a month: summary, department map, **real 3D terrain with the real hotspot cells**, a 23-year monthly calendar, CSV export. |
| 5 | **Prevention** | `/prevencion` | *"Is there fire near you?"* — pick your home or farm and get a traffic-light answer, a map with 10 km / 25 km rings, a button to warn your family, and a **weather-style fire-risk forecast** (next 8 weeks or 14 days). |
| 6 | **Response** | `/respuesta` | For firefighters and authorities: active fires with coordinates, filters, CSV / GeoJSON export and a printable situation report. |
| – | **YakaLlama** | every page | The assistant. It knows the site, the team and the method, and can query the backend for real figures. |

Everything shown is **real data** from the team's API. Nothing is simulated or illustrative.

---

## 3. Screens

<table>
<tr>
<td width="50%"><b>Story — this week's fire over Peru</b><br><img src="docs/images/story-live.jpg" alt="Real hotspots of the last week on the globe"></td>
<td width="50%"><b>Story — two satellites, two pictures</b><br><img src="docs/images/story-problem.jpg" alt="MODIS and VIIRS pixels compared with a draggable lens"></td>
</tr>
<tr>
<td><b>Method — try the model</b><br><img src="docs/images/method-tabs.jpg" alt="The model equation and an interactive calculator"></td>
<td><b>Explorer — real hotspots on 3D terrain</b><br><img src="docs/images/explorer-3d.jpg" alt="Department map and 3D relief of Cusco with real hotspot cells"></td>
</tr>
<tr>
<td><b>Explorer — 23-year monthly calendar</b><br><img src="docs/images/explorer-calendar.jpg" alt="Year × month calendar of harmonized hotspots"></td>
<td><b>Explorer — all of Peru</b><br><img src="docs/images/explorer-overview.jpg" alt="Summary cards and department map of Peru"></td>
</tr>
<tr>
<td><b>Prevention — is there fire near you?</b><br><img src="docs/images/prevention-verdict.jpg" alt="Traffic-light answer with a zoomed map and rings"></td>
<td><b>Prevention — the fire-risk forecast</b><br><img src="docs/images/prevention-forecast.jpg" alt="Weather-style forecast: weeks, flames and probability curve"></td>
</tr>
<tr>
<td><b>Response — for firefighters and authorities</b><br><img src="docs/images/response.jpg" alt="Active fires grouped by event with coordinates and exports"></td>
<td><b>The team</b><br><img src="docs/images/team.jpg" alt="Team cards with photos and roles"></td>
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

    subgraph GCP["Google Cloud · southamerica-west1"]
        J1[["Cloud Run Job<br/>run_week.py<br/>every 10 minutes"]]
        J2[["Cloud Run Job<br/>run_modelo.py<br/>1st of every month"]]
        GCS[("Cloud Storage bucket<br/>Parquet + model + registry")]
        API["Cloud Run service<br/>FastAPI + DuckDB<br/>GET only, CORS open"]
    end

    subgraph FE["frontend/ · Next.js 16 · Vercel · yakanas.earth"]
        C1["/historia /equipo"]
        C2["/metodo"]
        C3["/explorador"]
        C4["/prevencion /respuesta"]
        C5[lib/api.ts<br/>+ snapshot]
        BOT["/api/chat<br/>YakaLlama"]
    end

    NV[(NVIDIA<br/>hosted LLM)]
    U((People<br/>and authorities))

    A1 & A2 & A3 --> J1
    J1 --> GCS
    J2 --> GCS
    GCS --> API
    API -- JSON / CSV --> C5
    C5 --> C1 & C2 & C3 & C4
    BOT -- tools: read-only --> API
    BOT <--> NV
    C1 & C2 & C3 & C4 & BOT --> U
    AWS[(AWS Terrain Tiles<br/>Sentinel-2 cloudless)] -. relief + imagery .-> C3
    NASAG[(NASA GIBS<br/>Blue Marble, City Lights)] -. globe textures .-> C1
```

The container image is **one** image for the API and for the jobs (see [`backend/Dockerfile`](backend/Dockerfile)). The jobs and the API never share a disk: they exchange the data package through a **Cloud Storage bucket** (`DATOS_BUCKET`), and the API picks up newer files by itself.

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

The **Method** and **Story** pages use this *snapshot-then-live* pattern. The **Explorer**, **Prevention** and **Response** pages always load live (with loading and retry states), because their numbers change.

### What each page asks the API

```mermaid
flowchart TB
    subgraph Pages
      P1[Story]
      P2[Method]
      P3[Explorer]
      P4[Prevention]
      P5[Response]
      P6[YakaLlama]
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
      E12["/recurrence/place"]
      E13["/forecast"]
      E14["/prevention/model<br/>/prevention/model/info"]
    end
    P1 --> E10
    P2 --> E1 & E2 & E3
    P3 --> E4 & E1 & E5 & E6
    P4 --> E10 & E8 & E12 & E13 & E14
    P5 --> E8 & E7
    P6 --> E1 & E7 & E13
```

### Automatic updates

| What | How often | Who |
| --- | --- | --- |
| Recent-week hotspots and the harmonized series | **every 10 minutes** | Cloud Run Job `run_week.py` → bucket → API |
| Prevention model retraining | **on the 1st of every month** | Cloud Run Job `run_modelo.py` → bucket → API |
| The frontend's built-in snapshot | every day at 00:10 (Peru time) | GitHub Action [`daily-data.yml`](.github/workflows/daily-data.yml) → commit → Vercel redeploys |
| Live pages (Explorer, Prevention, Response, bot) | on every visit | straight from the API |

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

Full details live in [`backend/docs/metodo.md`](backend/docs/metodo.md) and [`backend/docs/API.md`](backend/docs/API.md).

---

## 6. The prevention model

The Prevention page answers a plain question — *how likely is fire around here, around this date?* — with a **logistic regression** trained on the harmonized series, built by the team's data scientist and compared against four other methods.

```mermaid
flowchart LR
    H["Harmonized series<br/>2003 → today<br/>(zone of 0.06°, ~6.6 km)"] --> F["11 features, using only earlier years<br/>recurrence in ±7 / ±15 / ±30 days · last 3 years<br/>neighbours · intensity · time of year"]
    F --> T["Train 2016 → latest complete year<br/>(1.7 million rows)"]
    T --> M["Logistic regression<br/>stored as coefficients"]
    M --> P["/prevention/model<br/>probability per zone and date"]
    P --> UI["Forecast: next 8 weeks / 14 days<br/>flame icons + probability curve"]
```

Tested on years the model had not seen (2019–2025):

| Method | Average precision | AUC | Zones marked that really burned | Fire anticipated |
| --- | --- | --- | --- | --- |
| Recurrence (plain history) | 0.571 | 0.857 | 83.0 % | 28.1 % |
| **Logistic regression (served)** | **0.637** | **0.893** | **83.7 %** | **28.4 %** |
| Random forest | 0.641 | 0.894 | 84.4 % | 28.6 % |
| Gradient boosting | 0.638 | 0.893 | 84.1 % | 28.5 % |

The simple model was chosen on purpose: it performs like the complex ones, gives real probabilities between 0 and 1, and its weights can be read. It ranks zones better than plain history; it marks them right about as often. **It uses no weather**, so the website says it is a prediction from past years, not a warning of a specific fire. The job `run_modelo.py` retrains it every month. See [`backend/docs/modelo-predictivo.md`](backend/docs/modelo-predictivo.md).

---

## 7. Repository layout

```
Yakanas-NASA/
├─ README.md                  ← you are here (project overview)
├─ docs/
│  └─ images/                 ← screenshots and the banner used in the READMEs
├─ .github/workflows/
│  └─ daily-data.yml          ← daily refresh of the frontend's data snapshot
├─ frontend/                  ← Next.js app (see frontend/README.md)
│  ├─ src/app/                  routes: historia, equipo, metodo, explorador,
│  │                            prevencion, respuesta, api/chat
│  ├─ src/components/           shared UI + per-page components
│  ├─ src/lib/                  API client, i18n, data hooks, snapshot
│  ├─ scripts/                  snapshot-api.mjs
│  └─ public/                   images, textures, official brand SVGs, team photos
└─ backend/                   ← API + pipeline + model (see backend/README.md)
   ├─ app/                      FastAPI routes, storage sync, prevention model
   ├─ ingest/                   FIRMS downloads
   ├─ harmonize/                the harmonization and the series build
   ├─ run_serie.py              build the series (once)
   ├─ run_week.py               refresh the recent week  (Cloud Run Job)
   ├─ run_modelo.py             retrain the prevention model  (Cloud Run Job)
   ├─ data/out/                 small results kept in git
   └─ docs/                     API.md, metodo.md, modelo-predictivo.md
```

| Folder | Docs |
| --- | --- |
| `frontend/` | [`frontend/README.md`](frontend/README.md) |
| `backend/` | [`backend/README.md`](backend/README.md) |

---

## 8. Quick start

You only need **Node.js 20+** to run the website; it talks to the already-deployed API.

```bash
git clone https://github.com/SebasHuaypar/Yakanas-NASA.git
cd Yakanas-NASA/frontend
npm install
npm run dev          # http://localhost:3000  →  redirects to /historia
```

Other commands: `npm run build` (production build), `npm run lint`, `npx tsc --noEmit`.

To point the site at another API (for example a local one), or to turn on the assistant, copy the example env file:

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=https://… (no trailing slash)
                             # NVIDIA_API_KEY=…   (server only, enables YakaLlama)
```

To run the **backend** locally (Python or Docker, needs a free FIRMS key) follow [`backend/README.md`](backend/README.md).

---

## 9. Deployment and CI/CD

```mermaid
flowchart LR
    DEV[Push to main] --> VER["Vercel<br/>build + deploy<br/>yakanas.earth"]
    DEV --> IMG["Container image<br/>backend/Dockerfile"]
    IMG --> SVC["Cloud Run service<br/>the API"]
    IMG --> JOBS["Cloud Run Jobs<br/>run_week.py · run_modelo.py"]
    JOBS -- publish data package --> BUCKET[("Cloud Storage bucket")]
    BUCKET -- newer files pulled --> SVC
    CRON["GitHub Action<br/>daily 00:10 Peru"] -- regenerate snapshot, commit --> DEV
    SVC --> VER
```

| Piece | Where | Notes |
| --- | --- | --- |
| **Frontend** | Vercel, domain [`yakanas.earth`](https://yakanas.earth) (and `www`) | Set **Root Directory = `frontend`**. Env vars: `NEXT_PUBLIC_API_URL` (optional), `NVIDIA_API_KEY` (server only, for YakaLlama) and `NVIDIA_MODEL` (optional). |
| **Backend API** | Google Cloud Run service (`southamerica-west1`) | Container built from `backend/Dockerfile`. Reads the data package from the bucket and reloads it when a newer one appears. |
| **Recurring jobs** | Google Cloud Run **Jobs**, same image | `python run_week.py` queries NASA FIRMS and refreshes the recent week **every 10 minutes**; `python run_modelo.py` retrains the prevention model **on the 1st of every month**. Both publish to the bucket (`DATOS_BUCKET`) because a job's disk is wiped when it ends. |
| **Data snapshot** | GitHub Actions · [`daily-data.yml`](.github/workflows/daily-data.yml) | Every day at 00:10 (Peru) it regenerates `frontend/src/lib/api-snapshot.ts` and, if it changed, commits it to `main`; Vercel then redeploys. Can also be run by hand. |

Notes:

- When the API moves to another address, **only `NEXT_PUBLIC_API_URL` changes** — no code.
- On Vercel's Hobby plan a deployment is blocked when the last commit's author is not a member of the team; the daily Action therefore commits with the repository owner's identity.
- The assistant's key lives **only on the server** (never `NEXT_PUBLIC_`), and the chat route rate-limits requests by IP.

---

## 10. Data sources, licenses and credits

| Data | Source | License / terms |
| --- | --- | --- |
| Fire hotspots | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (MODIS C6.1, VIIRS 375 m) | NASA open data |
| Globe textures | NASA GIBS: Blue Marble, VIIRS City Lights | Public domain |
| Terrain elevation | AWS Open Data · Terrain Tiles (Terrarium) | Open |
| Satellite imagery in 3D | Sentinel-2 cloudless © [EOX](https://s2maps.eu) | CC BY-NC-SA 4.0 (credit shown on screen) |
| Department boundaries | geoBoundaries | CC BY |
| Place names | GeoNames | CC BY 4.0 |
| Place search | OpenStreetMap Nominatim | ODbL |
| Assistant language model | NVIDIA hosted models (build.nvidia.com) | NVIDIA API terms |
| Fonts | Plus Jakarta Sans (titles), Inter (body) | SIL OFL |

The NASA logo is used only to name the challenge; it does not imply NASA's endorsement.

---

## 11. Team

Built by **Yakana's Team** for the NASA Space Apps Challenge 2026.

| Person | Role | Contribution |
| --- | --- | --- |
| **Sebastián Huaypar** | Project Manager & Team Lead | Led the project end to end; visual identity and design system; Story, Prevention, Response and Team pages; EN/ES; data integration; daily data automation and deployment. |
| **Giordano Medrano** | Frontend Developer | Method page; the official logotype and isotype. |
| **Darcy Ortega** | Full-stack Developer | Explorer (map, 3D relief, calendar); the YakaLlama assistant; the pitch video. |
| **Cesar Correa** | Backend Lead | The API (historical series, live week, prevention model) and its deployment on Google Cloud. |
| **Isabel Makishi** | Data Engineer | Ingestion pipeline, MODIS–VIIRS harmonization, data quality, monthly retraining. |
| **Isaac Martel** | Data Scientist | The predictive (logistic regression) model and its comparison with four other methods. |

