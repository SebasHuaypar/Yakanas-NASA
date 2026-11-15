# Una sola imagen para la API, las páginas y la carga de datos.
# No lleva base de datos: la serie vive en Parquet y la lee DuckDB.
FROM python:3.12-slim
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
# Las páginas. run_serie.py también lee de aquí los polígonos de los departamentos.
COPY web/ /app/web/
ENV PORT=8000
EXPOSE 8000 5500
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
