"""Reimplementa, sobre datos que ya viven en la base de datos, la misma
ingenieria de variables de la Fase 3 y el sistema de alertas de la Fase 8 de
Proceso_ML_1_Clasificacion.ipynb. Cualquier cambio de criterio (el CUTOFF, las
variables, el texto de recomendacion) deberia hacerse en ambos lugares.
"""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

from app.config import MODEL_PATH, UMBRAL_ALTO, UMBRAL_MEDIO

logger = logging.getLogger("eduapp.ml")

CUTOFF = 3  # periodos 1..CUTOFF -> variables ; periodo CUTOFF+1 -> lo que se predice
FEATURES = [
    "valor_p1", "valor_p2", "valor_p3", "promedio_propio",
    "minimo_propio", "tendencia", "veces_no_aprobado",
    "promedio_otras_materias", "sexo", "curso",
]

_bundle_cache: dict | None = None
_bundle_loaded = False


def load_model_bundle(force: bool = False) -> dict | None:
    """Carga (una vez) el paquete guardado por la Fase 9 del notebook:
    {'modelo', 'features', 'umbral_alerta', 'periodo_corte', ...}."""
    global _bundle_cache, _bundle_loaded
    if _bundle_loaded and not force:
        return _bundle_cache

    path = Path(MODEL_PATH)
    if not path.exists():
        logger.warning("No se encontro el modelo entrenado en %s; las alertas quedaran vacias.", path)
        _bundle_cache = None
    else:
        _bundle_cache = joblib.load(path)
        logger.info("Modelo cargado desde %s (entrenado %s, AUC %.3f)", path,
                    _bundle_cache.get("fecha_entrenamiento"), _bundle_cache.get("auc_prueba", 0.0))
    _bundle_loaded = True
    return _bundle_cache


PRESCOLAR = {"01", "02", "03"}


def build_feature_table(df: pd.DataFrame, cutoff: int = CUTOFF) -> pd.DataFrame:
    """A partir de un DataFrame en formato largo (columnas: anio, periodo,
    cod_estudiante, sexo, curso, seccion, area, materia, valor, estado),
    devuelve una fila por (anio, cod_estudiante, materia) con las variables
    de FEATURES, indexada por ese trio. Preescolar (curso 01/02/03) se
    excluye: usa una escala de 'valor' distinta a la de Primero-Undecimo."""
    df = df[~df["curso"].isin(PRESCOLAR)].copy()
    if df.empty:
        return pd.DataFrame()
    df["curso"] = df["curso"].astype(int)

    vistos = df[df.periodo <= cutoff]
    if vistos.empty:
        return pd.DataFrame()

    piv_valor = vistos.pivot_table(index=["anio", "cod_estudiante", "materia"],
                                    columns="periodo", values="valor", aggfunc="last")
    piv_valor.columns = [f"valor_p{c}" for c in piv_valor.columns]

    piv_estado = vistos.pivot_table(index=["anio", "cod_estudiante", "materia"],
                                     columns="periodo", values="estado", aggfunc="last")
    piv_estado.columns = [f"estado_p{c}" for c in piv_estado.columns]

    contexto = (vistos.drop_duplicates(["anio", "cod_estudiante", "materia"], keep="last")
                      [["anio", "cod_estudiante", "materia", "sexo", "curso", "seccion", "area"]]
                      .set_index(["anio", "cod_estudiante", "materia"]))

    data = contexto.join(piv_valor).join(piv_estado)

    cols_periodo = [f"valor_p{i}" for i in range(1, cutoff + 1)]
    missing = [c for c in cols_periodo if c not in data.columns]
    for c in missing:
        data[c] = np.nan
    data = data.dropna(subset=cols_periodo)
    if data.empty:
        return data

    valor_cols = [f"valor_p{i}" for i in range(1, cutoff + 1)]
    estado_cols = [f"estado_p{i}" for i in range(1, cutoff + 1) if f"estado_p{i}" in data.columns]

    data["promedio_propio"] = data[valor_cols].mean(axis=1)
    data["minimo_propio"] = data[valor_cols].min(axis=1)
    data["tendencia"] = data[f"valor_p{cutoff}"] - data["valor_p1"]
    data["veces_no_aprobado"] = (data[estado_cols] == 2).sum(axis=1) if estado_cols else 0

    suma_estudiante = vistos.groupby(["anio", "cod_estudiante"])["valor"].sum()
    cnt_estudiante = vistos.groupby(["anio", "cod_estudiante"])["valor"].count()
    idx_estudiante = data.index.droplevel("materia")
    suma_total = suma_estudiante.reindex(idx_estudiante).to_numpy()
    cnt_total = cnt_estudiante.reindex(idx_estudiante).to_numpy()
    suma_propia = data[valor_cols].sum(axis=1).to_numpy()
    denom = cnt_total - cutoff
    with np.errstate(invalid="ignore", divide="ignore"):
        promedio_otras = np.where(denom > 0, (suma_total - suma_propia) / np.where(denom == 0, np.nan, denom), np.nan)
    data["promedio_otras_materias"] = promedio_otras
    data["promedio_otras_materias"] = data["promedio_otras_materias"].fillna(data["promedio_propio"])

    return data


def _nivel_riesgo(prob: float) -> str:
    if prob >= UMBRAL_ALTO:
        return "Alto"
    if prob >= UMBRAL_MEDIO:
        return "Medio"
    return "Bajo"


def tendencia_texto(valor: float) -> str:
    if valor <= -0.2:
        return "descendente"
    if valor >= 0.2:
        return "mejora"
    return "estable"


def construir_recomendacion(fila: pd.Series) -> str:
    """Misma logica de la Fase 8 del notebook: explica por que se genero
    la alerta y sugiere una accion concreta."""
    razones = []
    if fila["minimo_propio"] < 3.0:
        razones.append("ya reprobo al menos un periodo en esta materia")
    if fila["tendencia"] <= -0.3:
        razones.append("la nota viene bajando periodo a periodo")
    if fila["promedio_otras_materias"] < 3.5:
        razones.append("el bajo rendimiento no es solo en esta materia")
    if not razones:
        razones.append("el patron de notas se parece al de estudiantes que terminaron reprobando")
    detalle = "; ".join(razones)

    if fila["probabilidad_riesgo"] >= UMBRAL_ALTO:
        accion = "Plan de refuerzo inmediato y citacion a acudientes"
    else:
        accion = "Seguimiento cercano y tutoria de refuerzo antes del cierre del periodo"

    return f"{accion} en {fila['materia']} — motivo: {detalle}."


def score_features(data: pd.DataFrame, bundle: dict | None) -> pd.DataFrame:
    """Aplica el modelo cargado sobre la tabla de variables y agrega
    probabilidad, nivel de riesgo y recomendacion. Si no hay modelo
    disponible, devuelve la tabla sin puntuar (probabilidad = NaN)."""
    if data.empty:
        return data

    out = data.reset_index()  # anio, cod_estudiante, materia pasan a ser columnas
    if bundle is None:
        out["probabilidad_riesgo"] = np.nan
        out["nivel_riesgo"] = "Sin modelo"
        out["recomendacion"] = ""
        return out

    modelo = bundle["modelo"]
    features = bundle.get("features", FEATURES)
    X = out[features].astype(float)
    out["probabilidad_riesgo"] = modelo.predict_proba(X)[:, 1]
    out["nivel_riesgo"] = out["probabilidad_riesgo"].apply(_nivel_riesgo)

    mask_alerta = out["nivel_riesgo"].isin(["Alto", "Medio"])
    out["recomendacion"] = ""
    if mask_alerta.any():
        out.loc[mask_alerta, "recomendacion"] = out.loc[mask_alerta].apply(construir_recomendacion, axis=1)

    return out


def tendencia_para(data_row: pd.Series) -> str:
    return tendencia_texto(data_row["tendencia"])


def evaluar_modelo(df: pd.DataFrame, bundle: dict | None, cutoff: int = CUTOFF) -> dict | None:
    """Reproduce la particion 70/30 estratificada de la Fase 5 del notebook
    (train_size=0.7, random_state=42) sobre los datos que hoy viven en la base
    de datos, y evalua el modelo cargado en la porcion de prueba: matriz de
    confusion y curva ROC sobre casos que el modelo no vio al entrenar."""
    if bundle is None:
        return None

    data = build_feature_table(df, cutoff=cutoff)
    if data.empty:
        return None

    periodo_objetivo = cutoff + 1
    resultado_final = (df[df.periodo == periodo_objetivo]
                        .drop_duplicates(["anio", "cod_estudiante", "materia"], keep="last")
                        .set_index(["anio", "cod_estudiante", "materia"])["estado"])

    data = data.join(resultado_final.rename("estado_final"))
    data = data.dropna(subset=["estado_final"])
    if data.empty:
        return None
    data["reprobo_final"] = (data["estado_final"] == 2).astype(int)

    features = bundle.get("features", FEATURES)
    X = data[features].astype(float)
    y = data["reprobo_final"]
    if y.nunique() < 2:
        return None

    _, X_test, _, y_test = train_test_split(
        X, y, train_size=0.7, random_state=42, stratify=y)

    modelo = bundle["modelo"]
    y_prob = modelo.predict_proba(X_test)[:, 1]
    umbral = bundle.get("umbral_alerta", UMBRAL_MEDIO)
    y_pred = (y_prob >= umbral).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    auc = roc_auc_score(y_test, y_prob)

    # La curva no necesita cada punto de corte de un test set de miles de
    # filas para dibujarse bien; se reduce a un maximo de 60 puntos.
    if len(fpr) > 60:
        idx = np.unique(np.linspace(0, len(fpr) - 1, 60).round().astype(int))
        fpr, tpr = fpr[idx], tpr[idx]

    return {
        "filas_prueba": int(len(y_test)),
        "umbral_usado": float(umbral),
        "auc_prueba_actual": float(auc),
        "matriz_confusion": {
            "verdaderos_negativos": int(tn), "falsos_positivos": int(fp),
            "falsos_negativos": int(fn), "verdaderos_positivos": int(tp),
        },
        "curva_roc": [{"fpr": float(f), "tpr": float(t)} for f, t in zip(fpr, tpr)],
    }


def calcular_shap_summary(df: pd.DataFrame, bundle: dict | None, cutoff: int = CUTOFF,
                           muestra: int = 300) -> dict | None:
    """Valores SHAP (TreeExplainer) sobre una muestra de combinaciones
    estudiante-materia actuales: a diferencia de la impureza Gini (que solo
    dice cuanto pesa cada variable), esto muestra ademas la direccion del
    efecto — si un valor alto de esa variable empuja la probabilidad de
    reprobar hacia arriba o hacia abajo — para el grafico tipo 'summary plot'
    de la pestaña Modelo ML."""
    if bundle is None:
        return None

    data = build_feature_table(df, cutoff=cutoff)
    if data.empty:
        return None

    features = bundle.get("features", FEATURES)
    X = data[features].astype(float)
    if len(X) > muestra:
        X = X.sample(n=muestra, random_state=42)
    if X.empty:
        return None

    try:
        import shap
    except ImportError:
        logger.warning("El paquete 'shap' no esta instalado; se omite el resumen SHAP.")
        return None

    modelo = bundle["modelo"]
    explainer = shap.TreeExplainer(modelo)
    shap_values = np.asarray(explainer.shap_values(X))
    # RandomForestClassifier binario: TreeExplainer devuelve
    # (n_muestras, n_variables, 2 clases) o, en versiones viejas de shap, una
    # lista de 2 arreglos (n_muestras, n_variables). En ambos casos se toma la
    # clase positiva (1 = reprueba).
    if shap_values.ndim == 3:
        shap_pos = shap_values[:, :, 1]
    else:
        shap_pos = shap_values

    media_abs = np.abs(shap_pos).mean(axis=0)
    orden = np.argsort(media_abs)[::-1]

    variables = []
    for idx in orden:
        col = features[idx]
        valores = X[col].to_numpy(dtype=float)
        vmin, vmax = valores.min(), valores.max()
        rango = vmax - vmin
        if rango == 0:
            normalizado = np.full_like(valores, 0.5)
        else:
            normalizado = (valores - vmin) / rango
        variables.append({
            "variable": col,
            "media_abs_shap": float(media_abs[idx]),
            "puntos": [
                {"valor_shap": float(s), "valor_normalizado": float(n)}
                for s, n in zip(shap_pos[:, idx], normalizado)
            ],
        })

    return {"variables": variables, "filas_muestreadas": int(len(X))}
