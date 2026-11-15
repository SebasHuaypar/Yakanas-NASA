# One image for the API, the pages, and the data load.
# There is no database: the series lives in Parquet and DuckDB reads it.
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt requirements-modelo.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-modelo.txt
COPY . .
# The pages live in ./web: run_serie.py also reads the department polygons from there.
ENV PORT=8000
EXPOSE 8000 5500
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
