from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.ml.pipeline import FEATURES, load_model_bundle
from app.schemas import ModelInfo
from app.services import get_model_metrics

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/info", response_model=ModelInfo)
def info(db: Session = Depends(get_db)):
    bundle = load_model_bundle()
    if bundle is None:
        return ModelInfo(disponible=False)

    features = bundle.get("features", FEATURES)
    modelo = bundle.get("modelo")
    importancias = None
    if modelo is not None and hasattr(modelo, "feature_importances_"):
        pares = zip(features, (float(v) for v in modelo.feature_importances_))
        importancias = dict(sorted(pares, key=lambda kv: kv[1], reverse=True))

    metricas = get_model_metrics(db)

    return ModelInfo(
        disponible=True,
        fecha_entrenamiento=bundle.get("fecha_entrenamiento"),
        auc_prueba=bundle.get("auc_prueba"),
        umbral_alerta=bundle.get("umbral_alerta"),
        periodo_corte=bundle.get("periodo_corte"),
        filas_entrenamiento=bundle.get("filas_entrenamiento"),
        features=features,
        importancia_variables=importancias,
        filas_prueba=metricas.get("filas_prueba") if metricas else None,
        matriz_confusion=metricas.get("matriz_confusion") if metricas else None,
        curva_roc=metricas.get("curva_roc") if metricas else None,
    )
