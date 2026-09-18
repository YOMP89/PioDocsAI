"""Carga inicial: si 'grades' esta vacia, importa el CSV real del consolidado
academico (si esta presente en DATA_DIR) y calcula las alertas de riesgo.
No modifica el CSV de origen en ningun momento: solo lo lee."""
from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import DATASET_CSV_PATH, FORCE_RESEED
from app.models import Grade, User
from app.security import hash_password
from app.services import insert_grades, read_grades_csv, recompute_risk_alerts

logger = logging.getLogger("eduapp.seed")

USUARIOS_INICIALES = [
    {"username": "admin", "password": "12345", "rol": "superadministrador"},
    {"username": "coordiaca", "password": "123456", "rol": "coordinacion_academica"},
    {"username": "escolarori", "password": "12345678", "rol": "orientacion_escolar"},
]


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


def seed_users(db: Session) -> None:
    """Crea las cuentas iniciales del panel si 'users' esta vacia. No pisa
    cuentas ya creadas ni corre de nuevo si alguien ya cambio algo."""
    total = db.execute(select(func.count()).select_from(User)).scalar_one()
    if total > 0:
        logger.info("Ya hay %d cuentas en 'users'; se omite la creacion de usuarios iniciales.", total)
        return

    for u in USUARIOS_INICIALES:
        db.add(User(username=u["username"], password_hash=hash_password(u["password"]), rol=u["rol"]))
    db.commit()
    logger.info("Usuarios iniciales creados: %s", ", ".join(u["username"] for u in USUARIOS_INICIALES))
