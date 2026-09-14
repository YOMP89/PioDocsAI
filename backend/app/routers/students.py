from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import EstudianteDetalle
from app.services import get_student_detail

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/{anio}/{cod_estudiante}", response_model=EstudianteDetalle)
def detalle_estudiante(anio: str, cod_estudiante: int, db: Session = Depends(get_db)):
    detalle = get_student_detail(db, anio, cod_estudiante)
    if detalle is None:
        raise HTTPException(status_code=404, detail="No hay registros para ese estudiante en ese año.")
    return detalle
