"""Eventos: detecciones de la semana agrupadas por cercanía en el espacio y en el tiempo.

Dos detecciones quedan en el mismo evento si están a 1,2 km o menos y a un día
o menos de distancia. Los grupos se encadenan: un frente que avanza varios días
es un solo evento. No hay viento ni modelo de propagación: esto describe lo que
los satélites vieron, no hacia dónde va el fuego.
"""
import math
from collections import Counter, defaultdict
from datetime import date

from fastapi import HTTPException

from app import query
from app.calendario import _nombres, resolver

RADIO_KM = 1.2
DIAS = 1
CELDA = 0.012          # grados; un poco más que el radio, para buscar solo en celdas vecinas
PIXEL_VIIRS = 0.0035   # grados, cerca de 375 m
PIXEL_MODIS = 0.01     # grados, cerca de 1 km
HA_VIIRS = 14.0        # 375 m × 375 m
HA_MODIS = 100.0       # 1 km × 1 km
CAMPO = {"MODIS": "modis", "VIIRS_NOAA20": "viirs_noaa20", "VIIRS_NOAA21": "viirs_noaa21"}


def _km(a: dict, b: dict) -> float:
    dy = (a["lat"] - b["lat"]) * 111.32
    dx = (a["lon"] - b["lon"]) * 111.32 * math.cos(math.radians((a["lat"] + b["lat"]) / 2))
    return math.hypot(dx, dy)


def agrupar(puntos: list[dict]) -> list[list[dict]]:
    """Componentes conexas con la regla de distancia y días. Cada punto trae lat, lon y dia (ordinal)."""
    padre = list(range(len(puntos)))

    def raiz(i: int) -> int:
        while padre[i] != i:
            padre[i] = padre[padre[i]]
            i = padre[i]
        return i

    celdas: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, p in enumerate(puntos):
        celdas[(int(p["lon"] // CELDA), int(p["lat"] // CELDA))].append(i)
    for (cx, cy), dentro in celdas.items():
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in celdas.get((cx + dx, cy + dy), ()):
                    for i in dentro:
                        if i < j and abs(puntos[i]["dia"] - puntos[j]["dia"]) <= DIAS \
                                and _km(puntos[i], puntos[j]) <= RADIO_KM:
                            padre[raiz(i)] = raiz(j)
    grupos: dict[int, list[dict]] = defaultdict(list)
    for i, p in enumerate(puntos):
        grupos[raiz(i)].append(p)
    return list(grupos.values())


def _area_ha(grupo: list[dict]) -> float:
    """Superficie de los píxeles con alguna detección. Es un techo aproximado, no área quemada."""
    viirs = {(round(p["lon"] / PIXEL_VIIRS), round(p["lat"] / PIXEL_VIIRS))
             for p in grupo if p["sensor"] != "MODIS"}
    if viirs:
        return len(viirs) * HA_VIIRS
    modis = {(round(p["lon"] / PIXEL_MODIS), round(p["lat"] / PIXEL_MODIS)) for p in grupo}
    return len(modis) * HA_MODIS


def _tendencia(por_dia: list[dict]) -> str:
    if len(por_dia) == 1:
        return "nuevo"
    ultimo = por_dia[-1]["detecciones"]
    antes = sum(d["detecciones"] for d in por_dia[:-1]) / (len(por_dia) - 1)
    if ultimo > antes * 1.25:
        return "creciendo"
    if ultimo < antes * 0.75:
        return "bajando"
    return "estable"


def _resumir(grupo: list[dict], fin: str, nombres: dict) -> dict:
    lats = [p["lat"] for p in grupo]
    lons = [p["lon"] for p in grupo]
    dias = Counter(p["fecha"] for p in grupo)
    frp_dia: dict[str, float] = defaultdict(float)
    for p in grupo:
        frp_dia[p["fecha"]] += p["frp"]
    por_dia = [{"fecha": f, "detecciones": dias[f], "frp_mw": round(frp_dia[f], 1)} for f in sorted(dias)]
    sensores = Counter(CAMPO.get(p["sensor"], "otro") for p in grupo)
    deps = Counter(p["dep"] for p in grupo if p["dep"])
    dep = deps.most_common(1)[0][0] if deps else ""
    lat, lon = sum(lats) / len(lats), sum(lons) / len(lons)
    ultima = por_dia[-1]["fecha"]
    return {
        "id": f"{por_dia[0]['fecha'].replace('-', '')}_{lat:.3f}_{lon:.3f}",
        "region_id": dep,
        "name": nombres.get(dep, dep),
        "centro": [round(lon, 5), round(lat, 5)],
        "bbox": [round(min(lons), 5), round(min(lats), 5), round(max(lons), 5), round(max(lats), 5)],
        "primera_fecha": por_dia[0]["fecha"],
        "ultima_fecha": ultima,
        "dias_con_deteccion": len(por_dia),
        "activo": (date.fromisoformat(fin) - date.fromisoformat(ultima)).days <= 1,
        "tendencia": _tendencia(por_dia),
        "detecciones": {
            "total": len(grupo),
            **{c: sensores.get(c, 0) for c in CAMPO.values()},
        },
        "confianza_alta": sum(1 for p in grupo if p["conf"] == "high"),
        "frp_total_mw": round(sum(p["frp"] for p in grupo), 1),
        "frp_max_mw": round(max(p["frp"] for p in grupo), 1),
        "area_pixeles_ha": round(_area_ha(grupo)),
        "por_dia": por_dia,
    }


def _puntos(desde: date | None, hasta: date | None) -> tuple[list[dict], str, str, str, str]:
    con = query._conexion()
    inicio, fin, cob_desde, cob_hasta = query.acotar(desde, hasta)
    donde, args = query._donde(inicio, fin, None)
    filas = con.execute(
        f"""SELECT lat, lon, substr(CAST(acq_date AS VARCHAR), 1, 10), sensor_group,
                   COALESCE(frp_mw, 0), conf_level, COALESCE(dep_id, ''), satellite, acq_time
            FROM fires WHERE {donde}""",
        args,
    ).fetchall()
    # Solo lo que cae dentro de un departamento: el recuadro de descarga incluye países vecinos.
    filas = [f for f in filas if f[6]]
    puntos = [
        {"lat": float(la), "lon": float(lo), "fecha": f, "dia": date.fromisoformat(f).toordinal(),
         "sensor": s, "frp": float(frp), "conf": c, "dep": d, "satelite": sat, "hora": str(h)}
        for la, lo, f, s, frp, c, d, sat, h in filas
    ]
    return puntos, inicio, fin, cob_desde, cob_hasta


def eventos(desde: date | None, hasta: date | None, region_id: str | None,
            minimo: int, limite: int) -> dict:
    puntos, inicio, fin, cob_desde, cob_hasta = _puntos(desde, hasta)
    nombres = _nombres()
    dep = resolver(region_id) if region_id else "PE"
    grupos = agrupar(puntos)
    todos = [_resumir(g, fin, nombres) for g in grupos]
    if dep != "PE":
        todos = [e for e in todos if e["region_id"] == dep]
    elegidos = [e for e in todos if e["detecciones"]["total"] >= minimo]
    elegidos.sort(key=lambda e: (-e["detecciones"]["total"], e["id"]))
    en_eventos = sum(e["detecciones"]["total"] for e in elegidos)
    total = sum(e["detecciones"]["total"] for e in todos)
    return {
        "desde": inicio,
        "hasta": fin,
        "cobertura": {"desde": cob_desde, "hasta": cob_hasta},
        "region_id": dep,
        "regla": f"Mismo evento: detecciones a {RADIO_KM} km o menos y a {DIAS} día o menos, encadenadas. "
                 f"Se listan los eventos con al menos {minimo} detecciones.",
        "nota": "Son detecciones crudas de MODIS y VIIRS (producto casi en tiempo real), sin armonizar, "
                "dentro de los departamentos del Perú. "
                "area_pixeles_ha es la superficie de los píxeles con detección: un techo aproximado, "
                "no área quemada. No se distingue incendio forestal de quema agrícola. "
                "tendencia compara el último día del evento con sus días anteriores; no predice su avance.",
        "resumen": {
            "detecciones": total,
            "eventos": len(elegidos),
            "activos": sum(1 for e in elegidos if e["activo"]),
            "creciendo": sum(1 for e in elegidos if e["activo"] and e["tendencia"] == "creciendo"),
            "detecciones_en_eventos": en_eventos,
            "detecciones_sueltas": total - en_eventos,
        },
        "events": elegidos[:limite],
    }


def evento(evento_id: str, desde: date | None, hasta: date | None) -> dict:
    """Un evento con sus detecciones, como GeoJSON."""
    puntos, inicio, fin, _, _ = _puntos(desde, hasta)
    nombres = _nombres()
    for grupo in agrupar(puntos):
        resumen = _resumir(grupo, fin, nombres)
        if resumen["id"] == evento_id:
            return {
                **resumen,
                "type": "FeatureCollection",
                "features": [
                    {"type": "Feature",
                     "geometry": {"type": "Point", "coordinates": [p["lon"], p["lat"]]},
                     "properties": {"acq_date": p["fecha"], "acq_time": p["hora"], "sensor": p["sensor"],
                                    "satellite": p["satelite"], "frp_mw": p["frp"], "conf_level": p["conf"]}}
                    for p in sorted(grupo, key=lambda p: (p["fecha"], p["hora"]))
                ],
            }
    raise HTTPException(status_code=404, detail=f"No hay un evento {evento_id} entre {inicio} y {fin}")
