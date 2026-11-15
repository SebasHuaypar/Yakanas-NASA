"""API de focos. Las consultas aceptan desde y hasta (fechas inclusive)."""
import csv
import io
import json
from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import OUT
from app import calendario, eventos, modelo, pronostico, query, recurrencia
from app.schemas import Health

app = FastAPI(title="Calendario del Fuego", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _leer(nombre: str) -> dict:
    path = OUT / nombre
    if not path.exists():
        raise HTTPException(status_code=503, detail="Aún no hay datos de la semana. Ejecuta python run_week.py")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/health", response_model=Health)
def health():
    path = OUT / "meta.json"
    if not path.exists():
        return Health(status="vacio")
    meta = json.loads(path.read_text(encoding="utf-8"))
    return Health(
        status="ok",
        generated=meta.get("generado"),
        completo=bool(meta.get("completo")),
        ventana=meta.get("ventana"),
        filas=meta.get("filas"),
        parquet=bool(meta.get("parquet")),
    )


@app.get("/meta")
def meta():
    return _leer("meta.json")


@app.get("/week")
def week(desde: date | None = None, hasta: date | None = None):
    return query.resumen(desde, hasta)


@app.get("/series")
def series():
    return _leer("series.json")


@app.get("/heat")
def heat(desde: date | None = None, hasta: date | None = None):
    return query.calor(desde, hasta)


@app.get("/export.csv")
def export_csv(
    region: str = Query(..., description="PE o un id PE-XXX"),
    desde: date | None = None,
    hasta: date | None = None,
):
    semana = query.resumen(desde, hasta)
    ids = {d["id"] for d in semana["departamentos"]}
    if region != "PE" and region not in ids:
        raise HTTPException(status_code=404, detail=f"Región desconocida: {region}")
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["region_id", "acq_date", "sensor", "hotspots", "frp_mw"])
    if region == "PE":
        acum: dict[tuple, list] = {}
        for fila in semana["por_dia"]:
            clave = (fila["acq_date"], fila["sensor"])
            slot = acum.setdefault(clave, [0, 0.0])
            slot[0] += fila["hotspots"]
            slot[1] += fila["frp_mw"]
        for (dia, sensor), (n, frp) in sorted(acum.items()):
            writer.writerow(["PE", dia, sensor, n, round(frp, 1)])
    else:
        for fila in sorted(semana["por_dia"], key=lambda r: (r["acq_date"], r["sensor"])):
            if fila["region_id"] == region:
                writer.writerow([region, fila["acq_date"], fila["sensor"], fila["hotspots"], fila["frp_mw"]])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=semana.csv"},
    )


@app.get("/regions")
def regions():
    return calendario.regiones()


@app.get("/calibration")
def calibration():
    return calendario.calibracion()


@app.get("/validation")
def validation():
    return calendario.validacion()


@app.get("/calendar")
def calendar(region_id: str = "PE"):
    return calendario.calendario(region_id)


@app.get("/anomaly")
def anomaly(region_id: str = "PE", year: int = 2024, month: int = 9):
    return calendario.anomalia(region_id, year, month)


@app.get("/ranking")
def ranking(desde: date = date(2024, 1, 1), hasta: date = date(2024, 12, 31)):
    return calendario.ranking(desde, hasta)


@app.get("/heatmap")
def heatmap(
    start: date = date(2026, 8, 1),
    end: date = date(2026, 9, 30),
    region_id: str = "PE",
    west: float | None = None,
    south: float | None = None,
    east: float | None = None,
    north: float | None = None,
):
    caja = None
    if None not in (west, south, east, north):
        caja = (west, south, east, north)
    return calendario.calor(start, end, region_id, caja=caja)


@app.get("/calendar/area")
def calendar_area(west: float, south: float, east: float, north: float):
    """Calendario de un recuadro en grados: west, south, east, north."""
    return calendario.area(west, south, east, north)


@app.get("/alert")
def alert(dias: int = Query(7, ge=1, le=31)):
    """Los últimos días frente a los mismos días de años anteriores, por departamento."""
    return calendario.alerta(dias)


@app.get("/forecast")
def forecast(region_id: str = "PE", year: int | None = None):
    """Pronóstico mensual: estimación estadística, separada de la serie observada."""
    return pronostico.pronostico(region_id, year)


@app.get("/forecast/validation")
def forecast_validation():
    """Cuánto se equivocó el pronóstico al probarlo contra años pasados."""
    return pronostico.validacion()


@app.get("/export/mensual.csv")
def export_mensual(
    region_id: str = "PE",
    desde: date | None = None,
    hasta: date | None = None,
):
    return Response(
        content=calendario.exportar(region_id, desde, hasta),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=calendario.csv"},
    )


@app.get("/fires")
def fires(
    desde: date | None = None,
    hasta: date | None = None,
    limit: int = Query(5000, ge=1, le=20000),
    sensor: str | None = None,
):
    return query.puntos(desde, hasta, limit, sensor)


@app.get("/events")
def events(
    desde: date | None = None,
    hasta: date | None = None,
    region_id: str | None = None,
    min_detecciones: int = Query(3, ge=1, le=100),
    limit: int = Query(200, ge=1, le=1000),
):
    """Detecciones de la semana agrupadas en eventos, del más grande al más chico."""
    return eventos.eventos(desde, hasta, region_id, min_detecciones, limit)


@app.get("/events/{evento_id}")
def event(evento_id: str, desde: date | None = None, hasta: date | None = None):
    """Un evento con cada una de sus detecciones."""
    return eventos.evento(evento_id, desde, hasta)


@app.get("/recurrence")
def recurrence(
    fecha: date | None = None,
    ventana: int = Query(15, description="Días a cada lado de la fecha: 7, 15 o 30"),
    region_id: str = "PE",
    minimo: float = Query(0.3, ge=0, le=1),
    limit: int = Query(5000, ge=1, le=20000),
):
    """Zonas donde suele haber fuego alrededor de esa fecha del calendario."""
    if ventana not in recurrencia.VENTANAS:
        raise HTTPException(status_code=400, detail="ventana debe ser 7, 15 o 30")
    return recurrencia.mapa(fecha, ventana, region_id, minimo, limit)


@app.get("/recurrence/place")
def recurrence_place(lat: float, lon: float):
    """Semana por semana, en cuántos años hubo fuego en la zona de ese punto."""
    return recurrencia.lugar(lat, lon)


@app.get("/recurrence/validation")
def recurrence_validation(ventana: int = 15):
    """De las zonas marcadas con años pasados, cuántas ardieron de verdad."""
    if ventana not in recurrencia.VENTANAS:
        raise HTTPException(status_code=400, detail="ventana debe ser 7, 15 o 30")
    return recurrencia.validacion(ventana)


@app.get("/prevention/model")
def prevention_model(
    fecha: date | None = None,
    region_id: str = "PE",
    minimo: float = Query(0.3, ge=0, le=1),
    limit: int = Query(5000, ge=1, le=20000),
):
    """Probabilidad de fuego por zona alrededor de esa fecha (regresión logística entrenada)."""
    return modelo.mapa(fecha, region_id, minimo, limit)


@app.get("/prevention/model/info")
def prevention_model_info():
    """Variables, pesos del modelo y su validación con años que no vio, frente a la recurrencia."""
    return modelo.info()
