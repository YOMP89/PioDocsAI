from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MateriaResumen
from app.services import get_subjects_summary

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


@router.get("/summary", response_model=list[MateriaResumen])
def resumen_materias(anio: str | None = Query(None), db: Session = Depends(get_db)):
    return get_subjects_summary(db, anio)
