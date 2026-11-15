"""Paths and the FIRMS key. The key is read from the environment or from backend/.env."""
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
HTML = ROOT / "web" / "calendario-del-fuego.html"

BBOX = "-81.4,-18.4,-68.6,0.0"
FUENTES = ("MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT")

# Peru's file starts in 2003 (MODIS). Observed VIIRS starts in 2012.
# Recurrence uses the whole series, one year per zone: before 2012 it counts MODIS
# fire, and from 2012 only VIIRS, so the same day is not marked twice.
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
