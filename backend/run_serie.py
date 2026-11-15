"""Builds the series from 2003 through the current year.

The published annual CSVs for 2003–2025 are downloaded once and reused. 2026 is
filled in through the API. The fit uses 2012–2022. The recurrence validation is
saved at the end.
"""
from ingest.firms_archive import descargar
from ingest.firms_year import descargar_2026
from harmonize.serie import construir
from app import recurrencia


def main() -> None:
    descargar()
    descargar_2026()
    construir(2003, 2026)
    recurrencia.guardar_validacion()


if __name__ == "__main__":
    main()
