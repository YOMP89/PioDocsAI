from fastapi import APIRouter

from app.ml.pipeline import FEATURES, load_model_bundle
from app.schemas import ModelInfo

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/info", response_model=ModelInfo)
def info():
    bundle = load_model_bundle()
    if bundle is None:
        return ModelInfo(disponible=False)

    features = bundle.get("features", FEATURES)
    modelo = bundle.get("modelo")
    importancias = None
    if modelo is not None and hasattr(modelo, "feature_importances_"):
        pares = zip(features, (float(v) for v in modelo.feature_importances_))
        importancias = dict(sorted(pares, key=lambda kv: kv[1], reverse=True))

    return ModelInfo(
        disponible=True,
        fecha_entrenamiento=bundle.get("fecha_entrenamiento"),
        auc_prueba=bundle.get("auc_prueba"),
        umbral_alerta=bundle.get("umbral_alerta"),
        periodo_corte=bundle.get("periodo_corte"),
        filas_entrenamiento=bundle.get("filas_entrenamiento"),
        features=features,
        importancia_variables=importancias,
    )
