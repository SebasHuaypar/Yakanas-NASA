"""Convierte los CSV de la semana en Parquet, conteos por departamento y grilla de calor.

Los polígonos salen de web/calendario-del-fuego.html (los mismos que dibuja el mapa),
con las coordenadas divididas entre 20. Lima Metropolitana se resta de Lima.
"""
import json
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
from shapely import points
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.validation import make_valid

from app.config import HTML, OUT, PARQUET, RAW, REF

GRUPOS = {
    "MODIS_NRT": "MODIS",
    "VIIRS_NOAA20_NRT": "VIIRS_NOAA20",
    "VIIRS_NOAA21_NRT": "VIIRS_NOAA21",
}


def nivel_confianza(raw) -> str | None:
    if raw is None or (isinstance(raw, float) and np.isnan(raw)):
        return None
    s = str(raw).strip().lower()
    if s in {"", "nan", "none"}:
        return None
    if s in {"l", "low", "baja"}:
        return "low"
    if s in {"n", "nominal"}:
        return "nominal"
    if s in {"h", "high", "alta"}:
        return "high"
    try:
        x = float(s)
    except ValueError:
        return None
    if x < 30:
        return "low"
    if x <= 80:
        return "nominal"
    return "high"


def _anillo(texto: str) -> list[tuple[float, float]]:
    pts = []
    for par in texto.split():
        if "," not in par:
            continue
        lon_s, lat_s = par.split(",", 1)
        pts.append((float(lon_s) / 20.0, float(lat_s) / 20.0))
    if len(pts) >= 3 and pts[0] != pts[-1]:
        pts.append(pts[0])
    return pts


def _geom(anillos: list[list[tuple[float, float]]]):
    polys = []
    for anillo in anillos:
        if len(anillo) < 4:
            continue
        poly = Polygon(anillo)
        if not poly.is_valid:
            poly = make_valid(poly)
        if not poly.is_empty:
            polys.append(poly)
    if not polys:
        return None
    geom = unary_union(polys)
    if not geom.is_valid:
        geom = make_valid(geom)
    return geom


def departamentos_html() -> list[dict]:
    texto = HTML.read_text(encoding="utf-8")
    ini = texto.find('<script type="text/plain" id="data">')
    fin = texto.find("</script>", ini)
    if ini < 0 or fin < 0:
        raise SystemExit(f"No encuentro el bloque de datos en {HTML}")
    cuerpo = texto[texto.find(">", ini) + 1 : fin]
    deps = []
    for linea in cuerpo.strip().splitlines():
        if not linea or linea.startswith("HEAT;"):
            continue
        partes = linea.split(";", 5)
        if len(partes) < 6:
            continue
        id_, nombre, _m, _v, _vay, geo = partes
        anillos = [_anillo(r) for r in geo.split("|")]
        anillos = [a for a in anillos if len(a) >= 4]
        deps.append({"id": id_, "name": nombre, "rings": anillos, "geom": _geom(anillos)})
    if len(deps) < 20:
        raise SystemExit(f"Solo leí {len(deps)} departamentos del HTML")
    por_id = {d["id"]: d for d in deps}
    if "PE-LIM" in por_id and "PE-LMA" in por_id and por_id["PE-LIM"]["geom"] and por_id["PE-LMA"]["geom"]:
        por_id["PE-LIM"]["geom"] = por_id["PE-LIM"]["geom"].difference(por_id["PE-LMA"]["geom"])
    return deps


def escribir_geojson(deps: list[dict]) -> None:
    REF.mkdir(parents=True, exist_ok=True)
    features = []
    for d in deps:
        if d["geom"] is None or d["geom"].is_empty:
            continue
        features.append({
            "type": "Feature",
            "properties": {"id": d["id"], "name": d["name"]},
            "geometry": mapping(d["geom"]),
        })
    (REF / "departamentos.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}),
        encoding="utf-8",
    )


def leer_crudos() -> tuple[pd.DataFrame, bool]:
    frames = []
    vio_type = False
    for fuente, grupo in GRUPOS.items():
        carpeta = RAW / fuente
        if not carpeta.exists():
            continue
        for archivo in sorted(carpeta.glob("*.csv")):
            df = pd.read_csv(archivo, dtype={"acq_time": str, "confidence": str, "version": str})
            if "latitude" not in df.columns or df.empty:
                continue
            df["fuente"] = fuente
            df["sensor_group"] = grupo
            df["sensor"] = "MODIS" if grupo == "MODIS" else "VIIRS"
            if "type" in df.columns:
                vio_type = True
            frames.append(df)
    if not frames:
        raise SystemExit(f"No hay CSV en {RAW}. Corre primero la descarga.")
    return pd.concat(frames, ignore_index=True), vio_type


def normalizar(df: pd.DataFrame, vio_type: bool) -> tuple[pd.DataFrame, dict]:
    bruto = len(df)
    df = df.copy()
    df["conf_raw"] = df["confidence"].astype(str) if "confidence" in df.columns else ""
    df["conf_level"] = df["conf_raw"].map(nivel_confianza)
    df = df[df["conf_level"].isin(["nominal", "high"])].copy()
    if vio_type and "type" in df.columns:
        df["fire_type"] = pd.to_numeric(df["type"], errors="coerce").astype("Int64")
        df = df[df["fire_type"].isna() | (df["fire_type"] == 0)].copy()
    else:
        df["fire_type"] = pd.Series(pd.NA, index=df.index, dtype="Int64")
    df["acq_date"] = pd.to_datetime(df["acq_date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df = df[df["acq_date"].notna()].copy()
    df["lat"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["lon"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df[df["lat"].notna() & df["lon"].notna()].copy()
    df["frp_mw"] = pd.to_numeric(df["frp"], errors="coerce").fillna(0.0) if "frp" in df.columns else 0.0
    df["acq_time"] = df["acq_time"].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(4)
    df["satellite"] = df["satellite"].astype(str) if "satellite" in df.columns else ""
    df["daynight"] = df["daynight"].astype(str) if "daynight" in df.columns else ""
    df["version"] = df["version"].astype(str) if "version" in df.columns else "NRT"
    df = df.drop_duplicates(subset=["lat", "lon", "acq_date", "acq_time", "satellite", "fuente"])
    cols = ["sensor", "sensor_group", "satellite", "fuente", "acq_date", "acq_time",
            "lat", "lon", "frp_mw", "conf_level", "conf_raw", "daynight", "version", "fire_type"]
    stats = {"brutos": int(bruto), "tras_filtro": int(len(df)), "vio_type": vio_type}
    return df[cols], stats


def asignar(df: pd.DataFrame, deps: list[dict]) -> pd.DataFrame:
    df = df.copy()
    geoms, ids = [], []
    for d in deps:
        if d["geom"] is not None and not d["geom"].is_empty:
            geoms.append(d["geom"])
            ids.append(d["id"])
    dep = np.array([""] * len(df), dtype=object)
    if len(df) and geoms:
        left, right = STRtree(geoms).query(points(df["lon"].to_numpy(), df["lat"].to_numpy()), predicate="intersects")
        orden = {d["id"]: i for i, d in enumerate(deps)}
        opciones: dict[int, list[str]] = {}
        for i, j in zip(left.tolist(), right.tolist()):
            opciones.setdefault(i, []).append(ids[j])
        for i, opts in opciones.items():
            dep[i] = "PE-LMA" if "PE-LMA" in opts else min(opts, key=lambda x: orden[x])
    df["dep_id"] = dep
    return df


def construir(desde: date, hasta: date) -> dict:
    deps = departamentos_html()
    escribir_geojson(deps)
    crudo, vio_type = leer_crudos()
    df, stats = normalizar(crudo, vio_type)
    df = df[(df["acq_date"] >= desde.isoformat()) & (df["acq_date"] <= hasta.isoformat())].copy()
    df = asignar(df, deps)

    OUT.mkdir(parents=True, exist_ok=True)
    PARQUET.mkdir(parents=True, exist_ok=True)
    parquet_ok = False
    try:
        df.to_parquet(PARQUET / "fires.parquet", index=False)
        parquet_ok = True
    except Exception as exc:
        stats["parquet_error"] = str(exc)
    df.to_csv(OUT / "fires.csv", index=False)

    nombres = {d["id"]: d["name"] for d in deps}
    dentro = df[df["dep_id"] != ""]
    filas = []
    for dep_id, g in dentro.groupby("dep_id"):
        cuenta = g["sensor_group"].value_counts()
        filas.append({
            "id": dep_id,
            "name": nombres.get(dep_id, dep_id),
            "modis": int(cuenta.get("MODIS", 0)),
            "viirs_noaa20": int(cuenta.get("VIIRS_NOAA20", 0)),
            "viirs_noaa21": int(cuenta.get("VIIRS_NOAA21", 0)),
            "total": int(len(g)),
            "frp_mw": round(float(g["frp_mw"].sum()), 1),
        })
    orden = {d["id"]: i for i, d in enumerate(deps)}
    presentes = {f["id"] for f in filas}
    for d in deps:
        if d["id"] not in presentes:
            filas.append({"id": d["id"], "name": d["name"], "modis": 0, "viirs_noaa20": 0,
                          "viirs_noaa21": 0, "total": 0, "frp_mw": 0.0})
    filas.sort(key=lambda f: orden.get(f["id"], 999))

    por_dia = []
    if len(dentro):
        agg = (dentro.groupby(["dep_id", "acq_date", "sensor_group"], as_index=False)
               .agg(hotspots=("frp_mw", "size"), frp_mw=("frp_mw", "sum")))
        for r in agg.itertuples(index=False):
            por_dia.append({
                "region_id": r.dep_id,
                "acq_date": r.acq_date,
                "sensor": r.sensor_group,
                "hotspots": int(r.hotspots),
                "frp_mw": round(float(r.frp_mw), 1),
            })

    n20 = df[df["sensor_group"] == "VIIRS_NOAA20"]
    celdas = []
    if len(n20):
        xi = np.floor((n20["lon"].to_numpy() + 81.5) / 0.25).astype(int)
        yi = np.floor((n20["lat"].to_numpy() + 18.5) / 0.25).astype(int)
        mascara = (xi >= 0) & (xi <= 60) & (yi >= 0) & (yi <= 80)
        tabla = pd.DataFrame({"xi": xi[mascara], "yi": yi[mascara]})
        if len(tabla):
            conteo = tabla.value_counts().reset_index(name="n")
            celdas = [[int(a), int(b), int(c)] for a, b, c in conteo.itertuples(index=False)]

    totales = {
        "modis": int((df["sensor_group"] == "MODIS").sum()),
        "viirs_noaa20": int((df["sensor_group"] == "VIIRS_NOAA20").sum()),
        "viirs_noaa21": int((df["sensor_group"] == "VIIRS_NOAA21").sum()),
        "asignados": int(len(dentro)),
        "fuera": int((df["dep_id"] == "").sum()),
    }
    if vio_type:
        nota = "Había columna type: se dejaron solo fuegos de vegetación (type 0) y filas sin type."
    else:
        nota = "Producto NRT: no trae la columna type, así que no se pudo separar vegetación de otras fuentes."

    generado = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    ventana = {"desde": desde.isoformat(), "hasta": hasta.isoformat()}
    semana = {
        "desde": ventana["desde"],
        "hasta": ventana["hasta"],
        "generado": generado,
        "parcial": True,
        "calidad": "NRT",
        "nota_type": nota,
        "totales": totales,
        "departamentos": filas,
        "por_dia": por_dia,
    }
    calor = {
        "year": hasta.year,
        "desde": ventana["desde"],
        "hasta": ventana["hasta"],
        "origin": [-81.5, -18.5],
        "step": 0.25,
        "min_count": 1,
        "sensor": "VIIRS_NOAA20",
        "cells": celdas,
    }
    series = {
        "completo": False,
        "parcial": True,
        "y0": 2003,
        "ny": 23,
        "vi": 108,
        "ventana": ventana,
        "nota": "Esta corrida solo cubre la semana pedida. No reemplaza el registro 2003–2025 embebido en la página.",
        "departments": [
            {"id": f["id"], "name": f["name"],
             "semana": {"modis": f["modis"], "viirs_noaa20": f["viirs_noaa20"],
                        "viirs_noaa21": f["viirs_noaa21"], "total": f["total"]}}
            for f in filas
        ],
    }
    meta = {
        "generado": generado,
        "completo": False,
        "parcial": True,
        "ventana": ventana,
        "calidad": "NRT (casi en tiempo real). No es el producto estándar.",
        "nota_type": nota,
        "snpp": "No se consultó Suomi-NPP: ya no entrega datos nuevos.",
        "filtros": {
            "confianza": "nominal y alta (MODIS >= 30, VIIRS n/h)",
            "vegetacion": "type = 0" if vio_type else "no aplicado: el NRT no trae type",
            "sensores": list(GRUPOS),
        },
        "bbox": [-81.4, -18.4, -68.6, 0.0],
        "filas": int(len(df)),
        "fuera_de_poligono": totales["fuera"],
        "totales": totales,
        "parquet": parquet_ok,
        "brutos": stats["brutos"],
        "departamentos": len(deps),
    }
    (OUT / "week.json").write_text(json.dumps(semana, ensure_ascii=False), encoding="utf-8")
    (OUT / "heat.json").write_text(json.dumps(calor), encoding="utf-8")
    (OUT / "series.json").write_text(json.dumps(series, ensure_ascii=False), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"focos {len(df)} | asignados {totales['asignados']} | fuera {totales['fuera']} | celdas {len(celdas)}")
    print(f"MODIS {totales['modis']}  NOAA-20 {totales['viirs_noaa20']}  NOAA-21 {totales['viirs_noaa21']}")
    return meta
