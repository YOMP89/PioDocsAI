"""Logica de negocio compartida entre el seed inicial, la importacion de
archivos y los routers: cargar filas en 'grades' y recalcular 'risk_alerts'."""
from __future__ import annotations

import logging

import pandas as pd
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.ml.pipeline import (build_feature_table, calcular_shap_summary, evaluar_modelo,
                              load_model_bundle, score_features, tendencia_texto)
from app.models import Grade, RiskAlert

logger = logging.getLogger("eduapp.services")

# Columnas que produce el consolidado (ver hoja 'Diccionario' del Excel de
# origen). Se aceptan variantes de nombre porque el CSV se puede reexportar
# con o sin tildes segun el sistema operativo que lo genere.
COLUMN_ALIASES = {
    "año": "anio", "anio": "anio",
    "periodo": "periodo",
    "código del estudiante": "cod_estudiante", "codigo del estudiante": "cod_estudiante",
    "sexo": "sexo",
    "curso": "curso",
    "sección": "seccion", "seccion": "seccion",
    "área académica": "area", "area academica": "area", "area": "area",
    "materia": "materia",
    "valor": "valor",
    "nota": "nota",
    "estado": "estado",
    "observación": "observacion", "observacion": "observacion",
}

REQUIRED_COLUMNS = ["anio", "periodo", "cod_estudiante", "sexo", "curso",
                    "seccion", "area", "materia", "valor", "estado"]


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename = {}
    for col in df.columns:
        key = str(col).strip().lower()
        if key in COLUMN_ALIASES:
            rename[col] = COLUMN_ALIASES[key]
    df = df.rename(columns=rename)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas obligatorias: {', '.join(missing)}")
    if "nota" not in df.columns:
        df["nota"] = df["valor"].astype(str)
    if "observacion" not in df.columns:
        df["observacion"] = ""
    return df


def read_grades_csv(path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig", dtype={"Curso": str, "curso": str})
    return normalize_columns(df)


def insert_grades(db: Session, df: pd.DataFrame, origen: str = "seed") -> int:
    """Inserta filas nuevas en 'grades'. No modifica ni borra nada del CSV
    de origen: solo lee el archivo y escribe una copia en la base de datos."""
    df = df.copy()
    df["curso"] = df["curso"].astype(str)
    df["anio"] = df["anio"].astype(str)
    df["origen"] = origen

    records = df[REQUIRED_COLUMNS + ["nota", "observacion", "origen"]].to_dict(orient="records")
    db.bulk_insert_mappings(Grade, records)
    db.commit()
    return len(records)


def recompute_risk_alerts(db: Session, anios: list[str] | None = None) -> int:
    """Recalcula 'risk_alerts' a partir de lo que haya en 'grades', para los
    años indicados (o todos). Usa el modelo entrenado en el notebook
    (Fase 9); si no esta disponible, no genera alertas pero no falla."""
    query = select(Grade.anio, Grade.periodo, Grade.cod_estudiante, Grade.sexo,
                    Grade.curso, Grade.seccion, Grade.area, Grade.materia,
                    Grade.valor, Grade.estado)
    if anios:
        query = query.where(Grade.anio.in_(anios))

    rows = db.execute(query).all()
    if not rows:
        return 0

    df = pd.DataFrame(rows, columns=["anio", "periodo", "cod_estudiante", "sexo",
                                      "curso", "seccion", "area", "materia",
                                      "valor", "estado"])

    data = build_feature_table(df)
    if data.empty:
        return 0

    bundle = load_model_bundle()
    scored = score_features(data, bundle)  # ya viene con anio/cod_estudiante/materia como columnas

    afectados = anios if anios else scored["anio"].unique().tolist()
    db.execute(delete(RiskAlert).where(RiskAlert.anio.in_(afectados)))

    records = []
    for _, r in scored.iterrows():
        records.append(dict(
            anio=r["anio"], cod_estudiante=int(r["cod_estudiante"]),
            curso=str(r["curso"]), seccion=int(r["seccion"]), sexo=int(r["sexo"]),
            materia=r["materia"], area=r["area"],
            valor_p1=float(r["valor_p1"]), valor_p2=float(r["valor_p2"]), valor_p3=float(r["valor_p3"]),
            promedio_propio=float(r["promedio_propio"]), minimo_propio=float(r["minimo_propio"]),
            tendencia=float(r["tendencia"]), promedio_otras_materias=float(r["promedio_otras_materias"]),
            veces_no_aprobado=int(r["veces_no_aprobado"]),
            probabilidad_riesgo=float(r["probabilidad_riesgo"]) if pd.notna(r["probabilidad_riesgo"]) else 0.0,
            nivel_riesgo=r["nivel_riesgo"], recomendacion=r["recomendacion"],
        ))

    if records:
        db.bulk_insert_mappings(RiskAlert, records)
    db.commit()
    logger.info("risk_alerts recalculado para %s: %d filas", afectados, len(records))
    return len(records)


# ---------------------------------------------------------------------------
# Consultas de solo lectura sobre 'risk_alerts' / 'grades'. Las usan tanto los
# routers HTTP (app/routers/*) como las tools del asistente Claude
# (app/assistant/tools.py) — un solo lugar de verdad para que el bot nunca
# muestre un numero distinto al del dashboard.
# ---------------------------------------------------------------------------

def _grades_dataframe(db: Session) -> pd.DataFrame:
    rows = db.execute(
        select(Grade.anio, Grade.periodo, Grade.cod_estudiante, Grade.sexo,
               Grade.curso, Grade.seccion, Grade.area, Grade.materia,
               Grade.valor, Grade.estado)
    ).all()
    return pd.DataFrame(rows, columns=["anio", "periodo", "cod_estudiante", "sexo",
                                        "curso", "seccion", "area", "materia",
                                        "valor", "estado"])


def get_model_metrics(db: Session) -> dict | None:
    """Matriz de confusion y curva ROC del modelo cargado, evaluadas sobre la
    misma particion de prueba 70/30 de la Fase 5 del notebook (ver
    app.ml.pipeline.evaluar_modelo)."""
    df = _grades_dataframe(db)
    if df.empty:
        return None
    bundle = load_model_bundle()
    return evaluar_modelo(df, bundle)


def get_model_shap(db: Session) -> dict | None:
    """Resumen SHAP (TreeExplainer) del modelo cargado, para el grafico de
    interpretabilidad ('summary plot') de la pestaña Modelo ML (ver
    app.ml.pipeline.calcular_shap_summary)."""
    df = _grades_dataframe(db)
    if df.empty:
        return None
    bundle = load_model_bundle()
    return calcular_shap_summary(df, bundle)


def get_anios_disponibles(db: Session) -> list[str]:
    return list(db.execute(select(RiskAlert.anio).distinct().order_by(RiskAlert.anio)).scalars().all())


def get_dashboard_summary(db: Session, anio: str | None = None) -> dict:
    anios = get_anios_disponibles(db)
    anio_actual = anio or (anios[-1] if anios else "")

    filas = db.execute(
        select(RiskAlert.cod_estudiante, RiskAlert.materia, RiskAlert.area, RiskAlert.nivel_riesgo)
        .where(RiskAlert.anio == anio_actual)
    ).all()

    predicciones_totales = len(filas)

    orden = {"Alto": 2, "Medio": 1, "Bajo": 0, "Sin modelo": -1}
    peor_por_estudiante: dict[int, str] = {}
    for cod, _materia, _area, nivel in filas:
        actual = peor_por_estudiante.get(cod)
        if actual is None or orden.get(nivel, -1) > orden.get(actual, -1):
            peor_por_estudiante[cod] = nivel

    total_estudiantes = len(peor_por_estudiante)
    alto = sum(1 for v in peor_por_estudiante.values() if v == "Alto")
    medio = sum(1 for v in peor_por_estudiante.values() if v == "Medio")
    bajo = total_estudiantes - alto - medio

    def pct(n: int) -> float:
        return round(100 * n / total_estudiantes, 1) if total_estudiantes else 0.0

    por_materia: dict[tuple[str, str], dict[str, int]] = {}
    for _cod, materia, area, nivel in filas:
        key = (materia, area)
        stats = por_materia.setdefault(key, {"total": 0, "riesgo": 0})
        stats["total"] += 1
        if nivel in ("Alto", "Medio"):
            stats["riesgo"] += 1

    materias_top = sorted(
        (
            {
                "materia": materia, "area": area,
                "risk_pct": round(100 * s["riesgo"] / s["total"], 1) if s["total"] else 0.0,
                "estudiantes_en_riesgo": s["riesgo"], "estudiantes_evaluados": s["total"],
            }
            for (materia, area), s in por_materia.items() if s["riesgo"] > 0
        ),
        key=lambda m: m["risk_pct"], reverse=True,
    )[:5]

    materias_priorizadas = sum(1 for s in por_materia.values() if s["riesgo"] > 0)

    return {
        "anio": anio_actual, "anios_disponibles": anios,
        "estudiantes_evaluados": total_estudiantes,
        "estudiantes_en_riesgo_alto": alto,
        "materias_priorizadas": materias_priorizadas,
        "predicciones_totales": predicciones_totales,
        "distribucion": {
            "alto": alto, "medio": medio, "bajo": bajo,
            "alto_pct": pct(alto), "medio_pct": pct(medio), "bajo_pct": pct(bajo),
        },
        "materias_top": materias_top,
    }


def get_alerts(db: Session, anio: str | None = None, risk: str = "Todos",
                search: str = "", limit: int = 20, offset: int = 0) -> tuple[int, list[dict]]:
    query = select(RiskAlert)
    if anio:
        query = query.where(RiskAlert.anio == anio)

    if risk == "Todos":
        query = query.where(RiskAlert.nivel_riesgo.in_(["Alto", "Medio"]))
    else:
        query = query.where(RiskAlert.nivel_riesgo == risk)

    search = search.strip()
    if search:
        like = f"%{search}%"
        if search.isdigit():
            query = query.where(or_(RiskAlert.materia.ilike(like), RiskAlert.cod_estudiante == int(search)))
        else:
            query = query.where(RiskAlert.materia.ilike(like))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    filas = db.execute(
        query.order_by(RiskAlert.probabilidad_riesgo.desc()).limit(limit).offset(offset)
    ).scalars().all()

    items = [
        {
            "id": f.id, "anio": f.anio, "cod_estudiante": f.cod_estudiante, "curso": f.curso,
            "seccion": f.seccion, "materia": f.materia, "area": f.area, "sexo": f.sexo,
            "nota_reciente": round(f.valor_p3, 1),
            "probabilidad": round(f.probabilidad_riesgo * 100, 1),
            "riesgo": f.nivel_riesgo, "tendencia": tendencia_texto(f.tendencia),
            "recomendacion": f.recomendacion,
        }
        for f in filas
    ]
    return total, items


def get_subjects_summary(db: Session, anio: str | None = None) -> list[dict]:
    query = select(RiskAlert.materia, RiskAlert.area, RiskAlert.nivel_riesgo)
    if anio:
        query = query.where(RiskAlert.anio == anio)
    filas = db.execute(query).all()

    stats: dict[tuple[str, str], dict[str, int]] = {}
    for materia, area, nivel in filas:
        s = stats.setdefault((materia, area), {"total": 0, "riesgo": 0})
        s["total"] += 1
        if nivel in ("Alto", "Medio"):
            s["riesgo"] += 1

    resultado = [
        {
            "materia": materia, "area": area,
            "risk_pct": round(100 * s["riesgo"] / s["total"], 1) if s["total"] else 0.0,
            "estudiantes_en_riesgo": s["riesgo"], "estudiantes_evaluados": s["total"],
        }
        for (materia, area), s in stats.items()
    ]
    return sorted(resultado, key=lambda m: m["risk_pct"], reverse=True)


def get_student_detail(db: Session, anio: str, cod_estudiante: int) -> dict | None:
    notas = db.execute(
        select(Grade).where(Grade.anio == anio, Grade.cod_estudiante == cod_estudiante)
        .order_by(Grade.materia, Grade.periodo)
    ).scalars().all()
    if not notas:
        return None

    alertas = db.execute(
        select(RiskAlert).where(RiskAlert.anio == anio, RiskAlert.cod_estudiante == cod_estudiante)
    ).scalars().all()
    alertas_por_materia = {a.materia: a for a in alertas}

    por_materia: dict[str, dict] = {}
    for n in notas:
        m = por_materia.setdefault(n.materia, {"area": n.area, "periodos": []})
        m["periodos"].append({"periodo": n.periodo, "valor": n.valor, "estado": n.estado})

    materias = []
    for materia, info in por_materia.items():
        alerta = alertas_por_materia.get(materia)
        materias.append({
            "materia": materia, "area": info["area"], "periodos": info["periodos"],
            "probabilidad_riesgo": round(alerta.probabilidad_riesgo * 100, 1) if alerta else None,
            "nivel_riesgo": alerta.nivel_riesgo if alerta else None,
            "recomendacion": alerta.recomendacion if alerta else None,
        })
    materias.sort(key=lambda m: (m["probabilidad_riesgo"] if m["probabilidad_riesgo"] is not None else -1), reverse=True)

    primero = notas[0]
    return {
        "anio": anio, "cod_estudiante": cod_estudiante, "curso": primero.curso,
        "seccion": primero.seccion, "sexo": primero.sexo,
        "promedio_general": round(sum(n.valor for n in notas) / len(notas), 2),
        "materias": materias,
    }
