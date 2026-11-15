"""Arma la serie de 2003 al año en curso.

Los CSV anuales 2003–2025 ya publicados se bajan una vez y se reutilizan. 2026 se completa
por la API. El ajuste usa 2012–2022. Al final se guarda la validación de la recurrencia.
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
