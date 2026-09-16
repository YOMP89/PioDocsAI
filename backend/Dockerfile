FROM python:3.13-slim

# Nota: el modelo se entreno con Python 3.14 (ver Proceso_ML_1_Clasificacion.ipynb),
# pero a esa version todavia le faltan wheels precompiladas en PyPI para medio
# stack (pydantic-core, etc.), lo que obligaria a compilar con Rust/gcc dentro
# de la imagen. 3.13 tiene wheels para todo lo que se necesita y sigue siendo
# binariamente compatible para deserializar el .joblib con la misma version
# de scikit-learn (1.9.0, fijada en requirements.txt).
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
