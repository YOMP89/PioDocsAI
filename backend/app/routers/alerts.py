from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AlertasPage, HistogramaProbabilidad
from app.services import get_alerts, get_probability_histogram

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertasPage)
def listar_alertas(
    anio: str | None = Query(None),
    risk: str = Query("Todos", pattern="^(Todos|Alto|Medio|Bajo)$"),
    search: str = Query(""),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total, items = get_alerts(db, anio=anio, risk=risk, search=search, limit=limit, offset=offset)
    return AlertasPage(total=total, items=items)


@router.get("/histograma", response_model=HistogramaProbabilidad)
def histograma_probabilidad(
    anio: str | None = Query(None),
    bins: int = Query(20, ge=5, le=50),
    db: Session = Depends(get_db),
):
    return HistogramaProbabilidad(**get_probability_histogram(db, anio=anio, bins=bins))
