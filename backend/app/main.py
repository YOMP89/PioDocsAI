import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, SessionLocal, engine
from app.ml.pipeline import load_model_bundle
from app.routers import alerts, assistant, dashboard, imports, model_info, students, subjects
from app.seed import run_seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("eduapp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    load_model_bundle()
    db = SessionLocal()
    try:
        run_seed(db)
    except Exception:
        logger.exception("El seed inicial fallo; la API sigue arriba, pero puede no tener datos.")
    finally:
        db.close()
    yield


app = FastAPI(
    title="PioDocsAI — API",
    description="Deteccion temprana de riesgo academico a partir del consolidado "
                "2020-2025 y el modelo entrenado en Proceso_ML_1_Clasificacion.ipynb.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(subjects.router)
app.include_router(students.router)
app.include_router(imports.router)
app.include_router(model_info.router)
app.include_router(assistant.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
