"""CSV anuales de FIRMS por país. No usa la MAP_KEY.

MODIS y VIIRS S-NPP salen de las carpetas publicadas. NOAA-20 está como
viirs-jpss1 (JPSS-1). NOAA-21 no tiene archivo por país; entra solo como
respaldo NRT de la semana ya descargada.
"""
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from app.config import SP

BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"
PRODUCTOS = (
    ("modis", "MODIS", 2003, 2025),
    ("viirs-snpp", "VIIRS_SNPP", 2012, 2025),
    ("viirs-jpss1", "VIIRS_NOAA20", 2018, 2025),
)


def destino(sensor: str, year: int):
    return SP / sensor / f"{year}.csv"


def url(carpeta: str, year: int) -> str:
    return f"{BASE}/{carpeta}/{year}/{carpeta}_{year}_Peru.csv"


def _listo(path) -> bool:
    if not path.exists() or path.stat().st_size < 1000:
        return False
    with path.open("rb") as fh:
        return fh.read(8) == b"latitude"


def _bajar(carpeta: str, sensor: str, year: int) -> dict:
    path = destino(sensor, year)
    path.parent.mkdir(parents=True, exist_ok=True)
    if _listo(path):
        return {"sensor": sensor, "year": year, "bytes": path.stat().st_size, "estado": "ya estaba"}
    req = urllib.request.Request(url(carpeta, year), headers={"User-Agent": "calendario-del-fuego"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    if not data.startswith(b"latitude"):
        raise RuntimeError(f"{sensor} {year} no es un CSV de FIRMS ({len(data)} bytes)")
    path.write_bytes(data)
    return {"sensor": sensor, "year": year, "bytes": len(data), "estado": "descargado"}


def descargar() -> list[dict]:
    tareas = [
        (carpeta, sensor, year)
        for carpeta, sensor, ini, fin in PRODUCTOS
        for year in range(ini, fin + 1)
    ]
    hechos = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futuros = {pool.submit(_bajar, *t): t for t in tareas}
        for fut in as_completed(futuros):
            carpeta, sensor, year = futuros[fut]
            try:
                rec = fut.result()
            except Exception as exc:
                rec = {"sensor": sensor, "year": year, "estado": "error", "detalle": str(exc)}
            hechos.append(rec)
            print(f"{rec['estado']:12} {sensor} {year}", flush=True)
    hechos.sort(key=lambda r: (r["sensor"], r["year"]))
    manifest = {
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "fuente": BASE,
        "archivos": hechos,
    }
    SP.mkdir(parents=True, exist_ok=True)
    (SP / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    errores = [r for r in hechos if r["estado"] == "error"]
    if errores:
        raise SystemExit(f"{len(errores)} descargas fallaron. Revisa {SP / 'manifest.json'}")
    return hechos


if __name__ == "__main__":
    descargar()
