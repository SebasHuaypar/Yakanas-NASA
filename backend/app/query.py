"""Hotspot queries between two dates, inclusive."""
import json
from datetime import date

from fastapi import HTTPException

from app.config import OUT
from app.db import connect


def _conexion():
    try:
        return connect()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="No está el Parquet. Ejecuta python run_week.py")


def cobertura() -> tuple[str, str]:
    con = _conexion()
    fila = con.execute(
        "SELECT MIN(substr(CAST(acq_date AS VARCHAR), 1, 10)), MAX(substr(CAST(acq_date AS VARCHAR), 1, 10)) FROM fires"
    ).fetchone()
    if not fila or not fila[0]:
        raise HTTPException(status_code=503, detail="El Parquet no tiene fechas")
    return fila[0], fila[1]


def acotar(desde: date | None, hasta: date | None) -> tuple[str, str, str, str]:
    """Returns (desde, hasta, cobertura_desde, cobertura_hasta)."""
    cob_desde, cob_hasta = cobertura()
    inicio = desde.isoformat() if desde else cob_desde
    fin = hasta.isoformat() if hasta else cob_hasta
    if inicio > fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio es posterior a la fecha final")
    return inicio, fin, cob_desde, cob_hasta


def _donde(inicio: str, fin: str, sensor: str | None) -> tuple[str, list]:
    sql = "substr(CAST(acq_date AS VARCHAR), 1, 10) BETWEEN ? AND ?"
    args: list = [inicio, fin]
    if sensor:
        sql += " AND sensor_group = ?"
        args.append(sensor)
    return sql, args


def _nombres() -> dict[str, str]:
    path = OUT / "week.json"
    if not path.exists():
        return {}
    semana = json.loads(path.read_text(encoding="utf-8"))
    return {d["id"]: d["name"] for d in semana.get("departamentos", []) if d.get("id")}


def resumen(desde: date | None, hasta: date | None) -> dict:
    inicio, fin, cob_desde, cob_hasta = acotar(desde, hasta)
    con = _conexion()
    donde, args = _donde(inicio, fin, None)
    grupos = dict(con.execute(
        f"SELECT sensor_group, COUNT(*) FROM fires WHERE {donde} GROUP BY 1", args
    ).fetchall())
    fuera = con.execute(
        f"SELECT COUNT(*) FROM fires WHERE {donde} AND dep_id = ''", args
    ).fetchone()[0]
    por_dep = con.execute(
        f"""
        SELECT dep_id, sensor_group, COUNT(*) AS n, SUM(frp_mw) AS frp
        FROM fires
        WHERE {donde} AND dep_id <> ''
        GROUP BY 1, 2
        """,
        args,
    ).fetchall()
    nombres = _nombres()
    acum: dict[str, dict] = {}
    for dep_id, sensor, n, frp in por_dep:
        slot = acum.setdefault(dep_id, {
            "id": dep_id, "name": nombres.get(dep_id, dep_id),
            "modis": 0, "viirs_noaa20": 0, "viirs_noaa21": 0, "total": 0, "frp_mw": 0.0,
        })
        campo = {"MODIS": "modis", "VIIRS_NOAA20": "viirs_noaa20", "VIIRS_NOAA21": "viirs_noaa21"}.get(sensor)
        if campo:
            slot[campo] = int(n)
        slot["total"] += int(n)
        slot["frp_mw"] = round(slot["frp_mw"] + float(frp or 0), 1)
    for dep_id, name in nombres.items():
        acum.setdefault(dep_id, {
            "id": dep_id, "name": name,
            "modis": 0, "viirs_noaa20": 0, "viirs_noaa21": 0, "total": 0, "frp_mw": 0.0,
        })
    orden = list(nombres)
    departamentos = sorted(acum.values(), key=lambda d: orden.index(d["id"]) if d["id"] in orden else 999)

    por_dia_rows = con.execute(
        f"""
        SELECT dep_id, substr(CAST(acq_date AS VARCHAR), 1, 10), sensor_group, COUNT(*), SUM(frp_mw)
        FROM fires
        WHERE {donde} AND dep_id <> ''
        GROUP BY 1, 2, 3
        ORDER BY 2, 1, 3
        """,
        args,
    ).fetchall()
    por_dia = [
        {"region_id": dep, "acq_date": dia, "sensor": sensor, "hotspots": int(n), "frp_mw": round(float(frp or 0), 1)}
        for dep, dia, sensor, n, frp in por_dia_rows
    ]
    asignados = sum(d["total"] for d in departamentos)
    nota = None
    if fin < cob_desde or inicio > cob_hasta:
        nota = f"No hay focos entre {inicio} y {fin}. La descarga cubre {cob_desde} a {cob_hasta}."
    return {
        "desde": inicio,
        "hasta": fin,
        "cobertura": {"desde": cob_desde, "hasta": cob_hasta},
        "nota": nota,
        "totales": {
            "modis": int(grupos.get("MODIS", 0)),
            "viirs_noaa20": int(grupos.get("VIIRS_NOAA20", 0)),
            "viirs_noaa21": int(grupos.get("VIIRS_NOAA21", 0)),
            "asignados": int(asignados),
            "fuera": int(fuera),
        },
        "departamentos": departamentos,
        "por_dia": por_dia,
    }


def calor(desde: date | None, hasta: date | None) -> dict:
    inicio, fin, cob_desde, cob_hasta = acotar(desde, hasta)
    con = _conexion()
    filas = con.execute(
        """
        SELECT xi, yi, COUNT(*) AS n FROM (
            SELECT
                CAST(floor((lon + 81.5) / 0.25) AS INTEGER) AS xi,
                CAST(floor((lat + 18.5) / 0.25) AS INTEGER) AS yi
            FROM fires
            WHERE sensor_group = 'VIIRS_NOAA20'
              AND substr(CAST(acq_date AS VARCHAR), 1, 10) BETWEEN ? AND ?
        )
        WHERE xi BETWEEN 0 AND 60 AND yi BETWEEN 0 AND 80
        GROUP BY 1, 2
        ORDER BY n DESC
        """,
        [inicio, fin],
    ).fetchall()
    return {
        "desde": inicio,
        "hasta": fin,
        "cobertura": {"desde": cob_desde, "hasta": cob_hasta},
        "origin": [-81.5, -18.5],
        "step": 0.25,
        "min_count": 1,
        "sensor": "VIIRS_NOAA20",
        "cells": [[int(xi), int(yi), int(n)] for xi, yi, n in filas],
    }


def puntos(desde: date | None, hasta: date | None, limit: int, sensor: str | None) -> dict:
    inicio, fin, cob_desde, cob_hasta = acotar(desde, hasta)
    con = _conexion()
    donde, args = _donde(inicio, fin, sensor)
    total = con.execute(f"SELECT COUNT(*) FROM fires WHERE {donde}", args).fetchone()[0]
    cursor = con.execute(
        f"""
        SELECT lat, lon, substr(CAST(acq_date AS VARCHAR), 1, 10), sensor_group, satellite, frp_mw, conf_level, dep_id
        FROM fires
        WHERE {donde}
        ORDER BY frp_mw DESC
        LIMIT ?
        """,
        [*args, limit],
    )
    features = []
    for lat, lon, dia, sensor_group, satellite, frp, conf, dep in cursor.fetchall():
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "acq_date": dia,
                "sensor": sensor_group,
                "satellite": satellite,
                "frp_mw": frp,
                "conf_level": conf,
                "dep_id": dep,
            },
        })
    return {
        "type": "FeatureCollection",
        "desde": inicio,
        "hasta": fin,
        "cobertura": {"desde": cob_desde, "hasta": cob_hasta},
        "total": int(total),
        "features": features,
    }
