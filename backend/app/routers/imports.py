import io
import logging

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ImportBatch
from app.schemas import ImportBatchOut, ImportResult
from app.services import insert_grades, normalize_columns, recompute_risk_alerts

logger = logging.getLogger("eduapp.imports")
router = APIRouter(prefix="/api/import", tags=["import"])

MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.get("/history", response_model=list[ImportBatchOut])
def historial(db: Session = Depends(get_db)):
    filas = db.execute(select(ImportBatch).order_by(ImportBatch.creado_en.desc())).scalars().all()
    return filas


@router.post("", response_model=ImportResult)
async def importar_csv(archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    if not archivo.filename.lower().endswith((".csv",)):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .csv por ahora.")

    contenido = await archivo.read()
    if len(contenido) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el tamaño maximo permitido (50 MB).")

    try:
        df = pd.read_csv(io.BytesIO(contenido), encoding="utf-8-sig", dtype={"Curso": str, "curso": str})
        df = normalize_columns(df)
    except ValueError as err:
        batch = ImportBatch(nombre_archivo=archivo.filename, filas_recibidas=0,
                             filas_insertadas=0, estado="error", detalle=str(err))
        db.add(batch)
        db.commit()
        db.refresh(batch)
        raise HTTPException(status_code=422, detail=str(err)) from err
    except Exception as err:  # noqa: BLE001 - se reporta como error de importacion, no se filtra el detalle interno
        logger.exception("Fallo al leer el CSV importado")
        batch = ImportBatch(nombre_archivo=archivo.filename, filas_recibidas=0,
                             filas_insertadas=0, estado="error",
                             detalle="No se pudo leer el archivo como CSV valido.")
        db.add(batch)
        db.commit()
        db.refresh(batch)
        raise HTTPException(status_code=422, detail="No se pudo leer el archivo como CSV valido.") from err

    filas_recibidas = len(df)
    insertadas = insert_grades(db, df, origen="import")
    anios_afectados = sorted(df["anio"].astype(str).unique().tolist())

    recompute_risk_alerts(db, anios=anios_afectados)

    batch = ImportBatch(
        nombre_archivo=archivo.filename, filas_recibidas=filas_recibidas,
        filas_insertadas=insertadas, anios_afectados=", ".join(anios_afectados),
        estado="completado",
        detalle=f"Alertas recalculadas para: {', '.join(anios_afectados)}",
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    return ImportResult(
        id=batch.id, nombre_archivo=batch.nombre_archivo,
        filas_recibidas=filas_recibidas, filas_insertadas=insertadas,
        anios_afectados=anios_afectados, estado=batch.estado, detalle=batch.detalle,
    )
