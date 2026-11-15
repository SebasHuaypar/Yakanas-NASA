from pydantic import BaseModel


class Health(BaseModel):
    status: str
    generated: str | None = None
    completo: bool = False
    ventana: dict | None = None
    filas: int | None = None
    parquet: bool = False
