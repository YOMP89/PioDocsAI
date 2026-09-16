"""Configuracion centralizada del backend, leida desde variables de entorno
para que docker-compose pueda ajustarla sin tocar codigo."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend

DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", DATA_DIR / "eduapp.db"))
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

# Dataset y modelo entrenado (ver Proceso_ML_1_Clasificacion.ipynb). Se copian
# a backend/data/ para que el contenedor sea autosuficiente; si no estan
# presentes, el seed se salta con un aviso (la API sigue funcionando vacia).
DATASET_CSV_PATH = Path(os.getenv("DATASET_CSV_PATH", DATA_DIR / "acumulado_desde_2020_al_2025_datos.csv"))
MODEL_PATH = Path(os.getenv("MODEL_PATH", DATA_DIR / "modelo_riesgo_academico.joblib"))

# Umbrales de riesgo sobre la probabilidad devuelta por el modelo (0-1).
# ALTO/MEDIO coinciden con el umbral de alerta usado en la fase 8 del notebook;
# por debajo de ese umbral se clasifica como BAJO (no genera alerta).
UMBRAL_ALTO = float(os.getenv("UMBRAL_ALTO", "0.50"))
UMBRAL_MEDIO = float(os.getenv("UMBRAL_MEDIO", "0.30"))

# Origenes permitidos para CORS (el frontend corre en otro contenedor/puerto).
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Si es True, (re)carga el CSV completo al arrancar aunque ya existan datos.
FORCE_RESEED = os.getenv("FORCE_RESEED", "false").lower() in {"1", "true", "yes"}

# Asistente conversacional (OpenAI). La API key se lee del entorno y nunca se
# expone al frontend: el navegador solo habla con este backend, y este backend
# es el unico que llama a la API de OpenAI. Ver backend/.env.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
