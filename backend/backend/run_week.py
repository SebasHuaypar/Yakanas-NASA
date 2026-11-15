"""Descarga y agrega la semana que termina hoy (inclusive)."""
from datetime import date, timedelta

from harmonize.build import construir
from ingest.firms_week import descargar


def main():
    hasta = date.today()
    desde = hasta - timedelta(days=7)
    print(f"ventana {desde.isoformat()} → {hasta.isoformat()}")
    descargar(desde, hasta)
    construir(desde, hasta)


if __name__ == "__main__":
    main()
