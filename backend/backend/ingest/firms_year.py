"""Descarga solo 2026 por la API de área, en bloques de 5 días.

NOAA-20 es la referencia. NOAA-21 queda de respaldo. No toca los CSV
anteriores a 2026.
"""
import time
import urllib.error
import urllib.request
from datetime import date

from app.config import BBOX, RAW, map_key, redact
from ingest.firms_week import tramos

API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
FUENTES = (
    ("VIIRS_NOAA20_SP", date(2026, 1, 1), None),
    ("VIIRS_NOAA21_SP", date(2026, 1, 1), None),
    ("VIIRS_NOAA20_NRT", date(2026, 8, 1), None),
    ("VIIRS_NOAA21_NRT", date(2026, 8, 1), None),
)


def _pedir(url: str, key: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "calendario-del-fuego/0.1"})
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.read().decode("utf-8-sig", "replace")
    except urllib.error.HTTPError as exc:
        cuerpo = exc.read().decode("utf-8", "replace")[:180]
        print(f"HTTP {exc.code}: {redact(cuerpo, key)}", flush=True)
        return None
    except urllib.error.URLError as exc:
        print(redact(str(exc.reason), key), flush=True)
        return None


def descargar_2026(hasta: date | None = None) -> int:
    key = map_key()
    fin = hasta or date.today()
    if fin.year != 2026:
        fin = date(2026, 11, 14)
    guardados = 0
    for fuente, inicio, _ in FUENTES:
        cursor_fin = fin
        if inicio > cursor_fin:
            continue
        for dia, n in tramos(inicio, cursor_fin):
            destino = RAW / "y2026" / fuente / f"{dia.isoformat()}_{n}.csv"
            destino.parent.mkdir(parents=True, exist_ok=True)
            if destino.exists() and destino.read_text(encoding="utf-8", errors="replace").startswith("latitude"):
                print(f"ya estaba {fuente} {dia.isoformat()}", flush=True)
                guardados += 1
                continue
            url = f"{API}/{key}/{fuente}/{BBOX}/{n}/{dia.isoformat()}"
            texto = _pedir(url, key)
            primera = texto.splitlines()[0] if texto and texto.strip() else ""
            if "latitude" not in primera.lower():
                print(f"sin datos {fuente} {dia.isoformat()}", flush=True)
                time.sleep(0.3)
                continue
            destino.write_text(texto, encoding="utf-8")
            filas = max(0, sum(1 for linea in texto.splitlines() if linea.strip()) - 1)
            print(f"bajado {fuente} {dia.isoformat()} ({n} días, {filas} filas)", flush=True)
            guardados += 1
            time.sleep(0.3)
    if guardados == 0:
        raise SystemExit("La API no entregó CSV de 2026")
    return guardados
