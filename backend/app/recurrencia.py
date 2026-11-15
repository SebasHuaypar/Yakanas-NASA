"""Recurrencia: en qué zonas suele haber fuego alrededor de una fecha del calendario.

Para cada zona de 0,06° (unos 6,6 km de lado) se cuenta en cuántos años hubo al
menos una detección dentro de una ventana de días alrededor de esa fecha. La
frecuencia es años con fuego / años mirados. Entra toda la serie, desde 2003.
Cada año cuenta una sola vez: de 2003 a 2011 vale lo que vio MODIS (convertido
a la grilla); desde 2012 solo VIIRS. MODIS no ve los fuegos chicos, así que
esos años bajan la frecuencia y no se suman encima de VIIRS.

No es un modelo del tiempo ni de la vegetación: dice dónde el fuego se repite,
que en el Perú es sobre todo quema agrícola de temporada. La validación mide,
con años que el cálculo no vio, cuántas de las zonas marcadas ardieron de verdad.
"""
import json
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
from fastapi import HTTPException

from app.calendario import ORIGEN, PASO, _conexion, _nombres, resolver
from app.config import OUT, SERIE_DESDE, VIIRS_DESDE

LADO = 3                 # celdas de 0,02° por lado de la zona
GRADOS = PASO * LADO     # 0,06°
DESDE = SERIE_DESDE
PRUEBA = range(2019, 2026)
CORTES = (0.3, 0.5, 0.7)
TRAMOS = ((0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01))
BASE = 100_000           # para juntar (zx, zy) en un solo número
VENTANAS = (7, 15, 30)
GUARDADA = OUT / "recurrencia_validacion.json"


@lru_cache(maxsize=1)
def _datos() -> dict:
    con = _conexion()
    # Una fila por zona y día. VIIRS gana si el mismo día también tiene MODIS,
    # y un año no se cuenta dos veces aunque la zona toque dos departamentos.
    filas = con.execute(
        f"""SELECT zx, zy, year, doy, mode(dep_id) AS dep_id
            FROM (
                SELECT xi // {LADO} AS zx, yi // {LADO} AS zy, year,
                       dayofyear(CAST(acq_date_local AS DATE)) AS doy, dep_id
                FROM fire_cell_day
                WHERE year >= {DESDE}
                  AND (source = 'VIIRS' OR (source = 'MODIS_ADJ' AND year < {VIIRS_DESDE}))
            )
            GROUP BY zx, zy, year, doy"""
    ).fetchall()
    zx, zy, anio, doy, dep = zip(*filas)
    zona = np.array(zx, dtype=np.int64) * BASE + np.array(zy, dtype=np.int64)
    ultimo = con.execute("SELECT MAX(acq_date_local) FROM fire_cell_day").fetchone()[0]
    # Departamento de cada zona: el que más celdas-día tiene en ella.
    cuenta: dict[int, dict[str, int]] = {}
    for z, d in zip(zona.tolist(), dep):
        cuenta.setdefault(z, {})
        cuenta[z][d] = cuenta[z].get(d, 0) + 1
    return {
        "zona": zona,
        "anio": np.array(anio, dtype=np.int64),
        "doy": np.array(doy, dtype=np.int64),
        "dep": {z: max(c, key=c.get) for z, c in cuenta.items()},
        "ultimo": date.fromisoformat(str(ultimo)[:10]),
    }


def _cerca(doy: np.ndarray, dia: int, ventana: int) -> np.ndarray:
    """Días del año a `ventana` días o menos de `dia`, dando la vuelta en diciembre–enero."""
    dist = np.abs(doy - dia)
    return np.minimum(dist, 365 - dist) <= ventana


def _anios(fecha: date, ventana: int, ultimo: date, hasta: int | None = None) -> list[int]:
    """Años cuya ventana alrededor de esa fecha ya terminó en los datos."""
    tope = hasta if hasta is not None else ultimo.year
    anios = []
    for y in range(DESDE, tope + 1):
        try:
            fin = fecha.replace(year=y) + timedelta(days=ventana)
        except ValueError:          # 29 de febrero
            fin = date(y, 3, 1) + timedelta(days=ventana)
        if fin <= ultimo:
            anios.append(y)
    return anios


def _frecuencias(dia: int, ventana: int, anios: list[int]) -> tuple[np.ndarray, np.ndarray, dict]:
    """Por zona: en cuántos de esos años hubo fuego en la ventana, y cuáles."""
    d = _datos()
    m = _cerca(d["doy"], dia, ventana) & np.isin(d["anio"], anios)
    pares = np.unique(np.stack([d["zona"][m], d["anio"][m]], axis=1), axis=0)
    zonas, veces = np.unique(pares[:, 0], return_counts=True)
    cuales: dict[int, list[int]] = {}
    for z, y in pares.tolist():
        cuales.setdefault(z, []).append(y)
    return zonas, veces, cuales


def _centro(z: int) -> tuple[float, float]:
    zx, zy = divmod(z, BASE)
    return (round(ORIGEN[0] + (zx + 0.5) * GRADOS, 4), round(ORIGEN[1] + (zy + 0.5) * GRADOS, 4))


def _texto_ventana(fecha: date, ventana: int) -> dict:
    a, b = fecha - timedelta(days=ventana), fecha + timedelta(days=ventana)
    return {"desde": a.strftime("%m-%d"), "hasta": b.strftime("%m-%d")}


def mapa(fecha: date | None, ventana: int, region_id: str, minimo: float, limite: int) -> dict:
    d = _datos()
    fecha = fecha or (d["ultimo"] + timedelta(days=1))
    dep = resolver(region_id)
    anios = _anios(fecha, ventana, d["ultimo"])
    if len(anios) < 5:
        raise HTTPException(status_code=400, detail="No hay suficientes años completos para esa fecha")
    zonas, veces, cuales = _frecuencias(fecha.timetuple().tm_yday, ventana, anios)
    n = len(anios)
    todas = []
    for z, v in zip(zonas.tolist(), veces.tolist()):
        if dep != "PE" and d["dep"][z] != dep:
            continue
        todas.append((v / n, z, v))
    todas.sort(key=lambda t: (-t[0], t[1]))
    nombres = _nombres()
    elegidas = [t for t in todas if t[0] >= minimo]
    features = [
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": list(_centro(z))},
         "properties": {"frecuencia": round(f, 3), "anios_con_fuego": v, "anios": n,
                        "cuales": cuales[z], "region_id": d["dep"][z],
                        "name": nombres.get(d["dep"][z], d["dep"][z])}}
        for f, z, v in elegidas[:limite]
    ]
    v = validacion(ventana)
    return {
        "type": "FeatureCollection",
        "tipo": "recurrencia",
        "fecha": fecha.isoformat(),
        "ventana_dias": ventana,
        "ventana": _texto_ventana(fecha, ventana),
        "region_id": dep,
        "anios_base": anios,
        "zona_grados": GRADOS,
        "metodo": f"Para cada zona de {GRADOS:.2f}° (unos 6,6 km de lado) se cuenta en cuántos años, de "
                  f"{anios[0]} a {anios[-1]}, hubo fuego a {ventana} días o menos de esa fecha. "
                  f"De {DESDE} a {VIIRS_DESDE - 1} cuenta lo que vio MODIS; desde {VIIRS_DESDE} solo VIIRS. "
                  "Cada año entra una vez. La frecuencia es años con fuego entre años mirados.",
        "nota": "Es historia que se repite, no un pronóstico del tiempo: no usa lluvia, viento ni sequía, "
                "y un año muy seco o muy húmedo cambia el resultado. MODIS, usado hasta 2011, no ve los "
                "fuegos chicos que sí ve VIIRS, así que esos años hacen más difícil llegar a 7 de cada 10. "
                "Sirve para saber dónde y cuándo conviene prevenir, no para avisar de un incendio.",
        "resumen": {
            "zonas_con_historia": len(todas),
            **{f"zonas_desde_{int(c * 100)}": sum(1 for t in todas if t[0] >= c) for c in CORTES},
        },
        "validacion": v,
        "features": features,
    }


def lugar(lat: float, lon: float) -> dict:
    """Semana por semana, en cuántos años hubo fuego en la zona que contiene ese punto."""
    d = _datos()
    zx = int((lon - ORIGEN[0]) // GRADOS)
    zy = int((lat - ORIGEN[1]) // GRADOS)
    z = zx * BASE + zy
    anios = list(range(DESDE, d["ultimo"].year))     # años completos
    m = (d["zona"] == z) & np.isin(d["anio"], anios)
    semana = np.minimum((d["doy"][m] - 1) // 7, 51)
    pares = np.unique(np.stack([semana, d["anio"][m]], axis=1), axis=0)
    por_semana: dict[int, list[int]] = {}
    for s, y in pares.tolist():
        por_semana.setdefault(s, []).append(y)
    n = len(anios)
    semanas = []
    for s in range(52):
        inicio = date(2001, 1, 1) + timedelta(days=7 * s)
        ys = por_semana.get(s, [])
        semanas.append({"semana": s + 1, "inicia": inicio.strftime("%m-%d"),
                        "anios_con_fuego": len(ys), "frecuencia": round(len(ys) / n, 3), "cuales": ys})
    dep = d["dep"].get(z, "")
    cx, cy = _centro(z)
    con_fuego = sorted({y for ys in por_semana.values() for y in ys})
    return {
        "tipo": "recurrencia",
        "centro": [cx, cy],
        "bbox": [round(cx - GRADOS / 2, 4), round(cy - GRADOS / 2, 4),
                 round(cx + GRADOS / 2, 4), round(cy + GRADOS / 2, 4)],
        "region_id": dep,
        "name": _nombres().get(dep, dep) if dep else "Sin detecciones registradas",
        "anios_base": anios,
        "anios_con_fuego": con_fuego,
        "semanas_mas_frecuentes": [s["semana"] for s in sorted(semanas, key=lambda s: -s["frecuencia"])[:4]
                                   if s["frecuencia"] > 0],
        "semanas": semanas,
    }


def validacion(ventana: int = 15) -> dict:
    """La validación guardada por run_serie.py; si falta, se calcula (tarda unos segundos)."""
    if GUARDADA.exists():
        guardada = json.loads(GUARDADA.read_text(encoding="utf-8"))
        if str(ventana) in guardada:
            return guardada[str(ventana)]
    return _validar(ventana)


def guardar_validacion() -> None:
    GUARDADA.write_text(
        json.dumps({str(v): _validar(v) for v in VENTANAS}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )


@lru_cache(maxsize=8)
def _validar(ventana: int) -> dict:
    """Para 2019–2025: con los años anteriores se marca, y se mira qué ardió ese año."""
    d = _datos()
    dias = [1 + 15 * i for i in range(24)] + [361]      # cada quince días, todo el año
    tramos = np.zeros((len(TRAMOS), 2))
    cortes = {c: [0, 0, 0] for c in CORTES}
    for anio in PRUEBA:
        base = list(range(DESDE, anio))
        for dia in dias:
            zonas, veces, _ = _frecuencias(dia, ventana, base)
            f = veces / len(base)
            m = _cerca(d["doy"], dia, ventana) & (d["anio"] == anio)
            real = np.unique(d["zona"][m])
            ardio = np.isin(zonas, real)
            for i, (a, b) in enumerate(TRAMOS):
                k = (f >= a) & (f < b)
                tramos[i] += (k.sum(), ardio[k].sum())
            for c in CORTES:
                k = f >= c
                cortes[c][0] += int(k.sum())
                cortes[c][1] += int(ardio[k].sum())
                cortes[c][2] += len(real)
    return {
        "prueba": f"{PRUEBA[0]}-{PRUEBA[-1]}",
        "ventana_dias": ventana,
        "como": "Cada año de prueba se marcó solo con los años anteriores, en 25 fechas repartidas "
                "por el año, y se comparó con lo que ardió ese año en la misma ventana.",
        "por_frecuencia": [
            {"desde": a, "hasta": min(b, 1.0), "zonas": int(t[0]),
             "ardieron": round(float(t[1] / t[0]), 3) if t[0] else None}
            for (a, b), t in zip(TRAMOS, tramos)
        ],
        "por_corte": [
            {"frecuencia_minima": c,
             "aciertos": round(h / n, 3) if n else None,            # de las marcadas, cuántas ardieron
             "cobertura": round(h / total, 3) if total else None}   # de las que ardieron, cuántas estaban marcadas
            for c, (n, h, total) in cortes.items()
        ],
    }
