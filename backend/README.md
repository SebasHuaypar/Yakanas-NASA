# Fire Calendar

Peru fire hotspots from NASA FIRMS, MODIS and VIIRS, as one comparable series from 2003 to today. A small FastAPI app serves the data and three static pages show it.

Before 20 January 2012 the series is MODIS converted to VIIRS-equivalent hotspots. From that date it is observed VIIRS, one satellite per day. The conversion is fit on 2012–2022 and frozen. On the held-out years 2020–2022 the national error is about 13 %.

## Where things are

| Path | What it is |
|---|---|
| `app/`, `ingest/`, `harmonize/`, `tests/` | The API, the downloads, the harmonization and the tests |
| `data/out/` | Small results kept in git: calibration, validation, summaries |
| `web/` | The three pages |
| `docs/API.md` | Every route, its parameters and its response. **Start here to build a front end** |
| `docs/metodo.md` | The harmonization method, step by step (Spanish) |
| `docs/investigacion-inicial.md` | The team's first research notes (Spanish) |
| `Dockerfile`, `docker-compose.yml` | Run everything in containers |

## What you need

- Docker Desktop, **or** Python 3.11 or newer
- A FIRMS MAP key ([request one here](https://firms.modaps.eosdis.nasa.gov/api/area/)), needed to download 2026 and the recent week

Put the key in `.env`, which git ignores:

```bash
cp .env.example .env
```

```
FIRMS_MAP_KEY=your_key
```

## Run with Docker

From this folder (`backend/`):

```bash
docker compose run --rm serie      # once: builds the series, 2003 to today
docker compose run --rm semana     # optional: downloads the recent week
docker compose up -d --build       # API on :8000, pages on :5500
```

There is no database container: the series lives in Parquet files and DuckDB reads them. `data` and `web` are mounted as volumes, so data and page edits show up without rebuilding the image.

Stop any local `uvicorn` first, because it uses the same port.

## Run without Docker

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run_serie.py      # once: builds the series, 2003 to today
.venv/bin/python run_week.py       # optional: downloads the recent week
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd web
python3 -m http.server 5500 --bind 127.0.0.1
```

On Windows the interpreter is `.venv\Scripts\python`.

## Open it

| Page | URL |
|---|---|
| Harmonized series: alert, calendar, chart, map | http://127.0.0.1:5500/armonizado.html |
| Prevention: where fire tends to come back around a date | http://127.0.0.1:5500/prevencion.html |
| Week radar: raw detections grouped into events, alert and forecast | http://127.0.0.1:5500/radar.html |
| Story page | http://127.0.0.1:5500/calendario-del-fuego.html |
| Recent-week checker | http://127.0.0.1:5500/comprobar-api.html |
| API docs | http://127.0.0.1:8000/docs |

The story page tells the story with a 2003–2025 series embedded in the file and an earlier in-browser conversion. Its numbers can differ slightly from the API. For figures, use the harmonized series.

## What the two data commands do

**`run_serie.py`** downloads the country CSV files for 2003–2025 once (files already in `data/raw/sp/` are reused), downloads 2026 from the FIRMS API, fits the calibration and writes:

| Path | What it is | In git |
|---|---|---|
| `data/raw/` | FIRMS CSV files | No |
| `data/processed/fire_cell_day.parquet` | Hotspots per 0.02° cell and day | No |
| `data/processed/region_month.parquet` | Monthly totals per department | No |
| `data/out/calibration_factors.csv` | Conversion coefficients per department | Yes |
| `data/out/validation.json` | Errors on 2020–2022 | Yes |
| `data/out/armonizado.json` | Coverage summary, with the last day included | Yes |
| `data/out/regiones.json` | Department ids and names | Yes |
| `data/out/recurrencia_validacion.json` | How often the prevention map was right on 2019–2025 | Yes |

The Parquet files are not in git, so a fresh clone has to run this command once before the series routes answer. For 2026, January–July come from the standard product and August onward from the near-real-time feed.

**`run_week.py`** downloads the last 8 days (MODIS, NOAA-20, NOAA-21) and writes `data/parquet/fires.parquet` plus `week.json`, `heat.json`, `series.json` and `meta.json` in `data/out/`. The recent-week routes, the radar and the checker page read it. Without it they fall back to the 7–14 November 2026 week kept in `data/out/fires.csv`.

## Tests

```bash
.venv/bin/pip install pytest
.venv/bin/python -m pytest tests          # model, region lookup, alert rule
.venv/bin/python tests/comprobar.py       # checks the downloaded week; needs run_week.py first
```

## Known limits

- The alert rule has not been tested against past years. Treat it as a signal to look at.
- The most recent days come from the near-real-time feed and can be incomplete.
- The forecast (`/forecast`) is a seasonal baseline: the typical value of each month. Tested on 2019–2025 it was off by about 39 % per department and month, and it does not anticipate exceptional years.
- The prevention map (`/recurrence`) is history that repeats, with no weather in it. It counts 2003–2011 from MODIS and 2012 onward from VIIRS, once per year. MODIS misses small fires, so those early years lower the frequency. Tested on 2019–2025, zones with fire in 7 of 10 years or more burned 93 % of the time, and they held 13 % of the zones that burned.
- Events (`/events`) describe what the satellites saw. They do not predict where a fire will move, and their area is a ceiling from pixel sizes, not burned area.
- Updates are manual: run `serie` or `semana` again to refresh.
- Only Peru is covered.
