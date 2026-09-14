from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.assistant.service import AssistantError, chat, explicar_prediccion
from app.database import get_db
from app.schemas import ChatRequest, ChatResponse, ExplicacionRequest, ExplicacionResponse

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    try:
        resultado = chat(db, payload.message, [t.model_dump() for t in payload.history])
    except AssistantError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    return resultado


@router.post("/explicar", response_model=ExplicacionResponse)
def explicar_endpoint(payload: ExplicacionRequest, db: Session = Depends(get_db)):
    try:
        resultado = explicar_prediccion(db, payload.anio, payload.cod_estudiante, payload.materia)
    except AssistantError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    return resultado
