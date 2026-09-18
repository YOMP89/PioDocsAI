from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import HeatmapMateriaGrado, MateriaResumen
from app.services import get_subject_grade_heatmap, get_subjects_summary

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


@router.get("/summary", response_model=list[MateriaResumen])
def resumen_materias(anio: str | None = Query(None), db: Session = Depends(get_db)):
    return get_subjects_summary(db, anio)


@router.get("/heatmap", response_model=HeatmapMateriaGrado)
def heatmap_materia_grado(anio: str | None = Query(None), db: Session = Depends(get_db)):
    return get_subject_grade_heatmap(db, anio)
