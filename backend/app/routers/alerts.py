from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AlertasPage
from app.services import get_alerts

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
