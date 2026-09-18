"""Modelos SQLAlchemy. Reflejan el diccionario de datos del consolidado
academico (ver hoja 'Diccionario' del Excel de origen y el notebook
Proceso_ML_1_Clasificacion.ipynb)."""
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Grade(Base):
    """Una fila = una calificacion de un estudiante, en una materia, en un
    periodo de un año lectivo. Es el equivalente en base de datos del CSV
    'acumulado_desde_2020_al_2025_datos.csv', sin alterar su contenido."""

    __tablename__ = "grades"
    __table_args__ = (
        Index("ix_grades_anio_estudiante_materia", "anio", "cod_estudiante", "materia"),
        Index("ix_grades_anio_periodo", "anio", "periodo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    anio: Mapped[str] = mapped_column(String(16), index=True)
    periodo: Mapped[int] = mapped_column(Integer)
    cod_estudiante: Mapped[int] = mapped_column(Integer, index=True)
    sexo: Mapped[int] = mapped_column(Integer)
    curso: Mapped[str] = mapped_column(String(4))  # texto: conserva 01/02/03 de preescolar
    seccion: Mapped[int] = mapped_column(Integer)
    area: Mapped[str] = mapped_column(String(120))
    materia: Mapped[str] = mapped_column(String(120), index=True)
    valor: Mapped[float] = mapped_column(Float)
    nota: Mapped[str] = mapped_column(String(60))
    estado: Mapped[int] = mapped_column(Integer)  # 1 = aprobado, 2 = no aprobado
    observacion: Mapped[str] = mapped_column(String(4000), default="")
    origen: Mapped[str] = mapped_column(String(20), default="seed")  # 'seed' | 'import'

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class RiskAlert(Base):
    """Resultado (materializado) de aplicar el modelo de clasificacion a una
    combinacion (año, estudiante, materia) usando los periodos 1..CUTOFF.
    Se recalcula con recompute_risk_alerts() tras cada carga de datos."""

    __tablename__ = "risk_alerts"
    __table_args__ = (
        UniqueConstraint("anio", "cod_estudiante", "materia", name="uq_alert_anio_estudiante_materia"),
        Index("ix_alerts_anio_riesgo", "anio", "nivel_riesgo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    anio: Mapped[str] = mapped_column(String(16), index=True)
    cod_estudiante: Mapped[int] = mapped_column(Integer, index=True)
    curso: Mapped[str] = mapped_column(String(4))
    seccion: Mapped[int] = mapped_column(Integer)
    sexo: Mapped[int] = mapped_column(Integer)
    materia: Mapped[str] = mapped_column(String(120))
    area: Mapped[str] = mapped_column(String(120))

    valor_p1: Mapped[float] = mapped_column(Float)
    valor_p2: Mapped[float] = mapped_column(Float)
    valor_p3: Mapped[float] = mapped_column(Float)
    promedio_propio: Mapped[float] = mapped_column(Float)
    minimo_propio: Mapped[float] = mapped_column(Float)
    tendencia: Mapped[float] = mapped_column(Float)
    promedio_otras_materias: Mapped[float] = mapped_column(Float)
    veces_no_aprobado: Mapped[int] = mapped_column(Integer)

    probabilidad_riesgo: Mapped[float] = mapped_column(Float, index=True)
    nivel_riesgo: Mapped[str] = mapped_column(String(10))  # Alto | Medio | Bajo
    recomendacion: Mapped[str] = mapped_column(String(500), default="")

    generado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class User(Base):
    """Cuentas de acceso al panel. Rol es texto libre por ahora (no hay logica
    de permisos por rol todavia, solo se guarda para mostrarlo en el perfil)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(160))
    rol: Mapped[str] = mapped_column(String(40))  # superadministrador | coordinacion_academica | orientacion_escolar
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ImportBatch(Base):
    """Historial de archivos importados desde la pantalla 'Importar datos'."""

    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_archivo: Mapped[str] = mapped_column(String(255))
    filas_recibidas: Mapped[int] = mapped_column(Integer, default=0)
    filas_insertadas: Mapped[int] = mapped_column(Integer, default=0)
    anios_afectados: Mapped[str] = mapped_column(String(200), default="")
    estado: Mapped[str] = mapped_column(String(20), default="completado")  # completado | error
    detalle: Mapped[str] = mapped_column(String(2000), default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
