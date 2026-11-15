"""Rutas y clave de FIRMS. La clave se lee del entorno o de backend/.env."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
OUT = DATA / "out"
PARQUET = DATA / "parquet"
PROCESSED = DATA / "processed"
SP = RAW / "sp"
REF = ROOT / "ref"
HTML = ROOT.parent / "web" / "calendario-del-fuego.html"

BBOX = "-81.4,-18.4,-68.6,0.0"
FUENTES = ("MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT")

# El archivo de Perú empieza en 2003 (MODIS). VIIRS observado empieza en 2012.
# La recurrencia usa toda la serie, un año por zona: antes de 2012 cuenta si MODIS
# vio fuego, y desde 2012 solo VIIRS, para no marcar dos veces el mismo día.
SERIE_DESDE = 2003
VIIRS_DESDE = 2012


def map_key() -> str:
    k = os.environ.get("FIRMS_MAP_KEY", "").strip()
    env = ROOT / ".env"
    if not k and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("FIRMS_MAP_KEY="):
                k = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not k:
        raise SystemExit("Falta FIRMS_MAP_KEY en el entorno o en backend/.env")
    return k


def redact(text: str, key: str | None = None) -> str:
    secret = key if key is not None else os.environ.get("FIRMS_MAP_KEY", "")
    if secret:
        text = text.replace(secret, "***")
    return text
