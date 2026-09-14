from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DashboardSummary
from app.services import get_dashboard_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(anio: str | None = Query(None), db: Session = Depends(get_db)):
    return get_dashboard_summary(db, anio)
