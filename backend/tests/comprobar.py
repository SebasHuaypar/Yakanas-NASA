"""Checks the generated week: dates, confidence, totals, and that the key was not left in the data."""
import json
import math
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import OUT, PARQUET, map_key  # noqa: E402
from harmonize.build import nivel_confianza  # noqa: E402


def main() -> None:
    clave = map_key()
    meta = json.loads((OUT / "meta.json").read_text(encoding="utf-8"))
    semana = json.loads((OUT / "week.json").read_text(encoding="utf-8"))
    calor = json.loads((OUT / "heat.json").read_text(encoding="utf-8"))
    desde, hasta = meta["ventana"]["desde"], meta["ventana"]["hasta"]

    focos = pd.read_parquet(PARQUET / "fires.parquet")
    if focos.empty:
        raise SystemExit("el Parquet no tiene focos")
    focos["acq_date"] = focos["acq_date"].astype(str).str.slice(0, 10)

    if focos["acq_date"].min() < desde or focos["acq_date"].max() > hasta:
        raise SystemExit(f"hay fechas fuera de {desde}..{hasta}")
    malas = focos.loc[~focos["conf_level"].isin(["nominal", "high"]), "conf_level"]
    if len(malas):
        raise SystemExit(f"confianza no filtrada: {malas.value_counts().to_dict()}")

    conteo = Counter(focos["sensor_group"])
    totales = semana["totales"]
    for grupo, campo in (("MODIS", "modis"), ("VIIRS_NOAA20", "viirs_noaa20"), ("VIIRS_NOAA21", "viirs_noaa21")):
        if conteo[grupo] != totales[campo]:
            raise SystemExit(f"{grupo}: parquet {conteo[grupo]} vs semana {totales[campo]}")
    asignados = int((focos["dep_id"] != "").sum())
    if asignados != totales["asignados"] or (len(focos) - asignados) != totales["fuera"]:
        raise SystemExit("los asignados y los de fuera no cierran")
    if sum(d["total"] for d in semana["departamentos"]) != asignados:
        raise SystemExit("la suma por departamento no coincide con los focos asignados")
    if len(semana["departamentos"]) < 24:
        raise SystemExit("faltan departamentos")

    esperado = {}
    n20 = focos[focos["sensor_group"] == "VIIRS_NOAA20"]
    for lon, lat in zip(n20["lon"], n20["lat"]):
        xi = math.floor((float(lon) + 81.5) / 0.25)
        yi = math.floor((float(lat) + 18.5) / 0.25)
        if 0 <= xi <= 60 and 0 <= yi <= 80:
            esperado[(xi, yi)] = esperado.get((xi, yi), 0) + 1
    leido = {(c[0], c[1]): c[2] for c in calor["cells"]}
    if esperado != leido:
        raise SystemExit(f"la grilla no coincide ({len(esperado)} calculadas, {len(leido)} guardadas)")

    if not (PARQUET / "fires.parquet").exists():
        raise SystemExit("falta el Parquet")

    prohibidos = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".venv" in path.parts or path.name == ".env":
            continue
        if path.suffix not in {".py", ".json", ".csv", ".geojson", ".html", ".md", ".txt"}:
            continue
        if clave in path.read_text(encoding="utf-8", errors="ignore"):
            prohibidos.append(str(path.relative_to(ROOT)))
    if prohibidos:
        raise SystemExit("la clave aparece en: " + ", ".join(prohibidos))

    assert nivel_confianza("20") == "low"
    assert nivel_confianza("80") == "nominal"
    assert nivel_confianza("81") == "high"
    assert nivel_confianza("n") == "nominal"
    assert nivel_confianza("h") == "high"

    print(f"ok {len(focos)} focos, {desde} → {hasta}, {len(calor['cells'])} celdas, {asignados} dentro del mapa")


if __name__ == "__main__":
    main()
