"""Descarga y agrega la semana que termina hoy (inclusive)."""
from datetime import date, timedelta

from app.almacen import bajar, subir
from harmonize.build import construir
from ingest.firms_week import descargar


def main():
    hasta = date.today()
    desde = hasta - timedelta(days=7)
    print(f"ventana {desde.isoformat()} → {hasta.isoformat()}")
    bajar()
    descargar(desde, hasta)
    construir(desde, hasta)
    subir()


if __name__ == "__main__":
    main()
