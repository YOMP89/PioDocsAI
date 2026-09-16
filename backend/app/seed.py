"""Carga inicial: si 'grades' esta vacia, importa el CSV real del consolidado
academico (si esta presente en DATA_DIR) y calcula las alertas de riesgo.
No modifica el CSV de origen en ningun momento: solo lo lee."""
from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import DATASET_CSV_PATH, FORCE_RESEED
from app.models import Grade
from app.services import insert_grades, read_grades_csv, recompute_risk_alerts

logger = logging.getLogger("eduapp.seed")


def run_seed(db: Session) -> None:
    total = db.execute(select(func.count()).select_from(Grade)).scalar_one()

    if total > 0 and not FORCE_RESEED:
        logger.info("Ya hay %d registros en 'grades'; se omite el seed (FORCE_RESEED=false).", total)
        return

    if total > 0 and FORCE_RESEED:
        logger.info("FORCE_RESEED activo: se vacia 'grades' y 'risk_alerts' antes de recargar.")
        db.execute(Grade.__table__.delete())
        db.commit()

    if not DATASET_CSV_PATH.exists():
        logger.warning(
            "No se encontro %s: la base de datos queda vacia. Copia el CSV real "
            "en backend/data/ (o usa POST /api/import) para poblarla.",
            DATASET_CSV_PATH,
        )
        return

    logger.info("Cargando %s ...", DATASET_CSV_PATH)
    df = read_grades_csv(DATASET_CSV_PATH)
    inserted = insert_grades(db, df, origen="seed")
    logger.info("Insertadas %d filas en 'grades'.", inserted)

    logger.info("Calculando alertas de riesgo con el modelo entrenado (Fase 9 del notebook)...")
    n_alertas = recompute_risk_alerts(db)
    logger.info("risk_alerts listo: %d combinaciones estudiante-materia evaluadas.", n_alertas)
