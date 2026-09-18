"""Esquemas Pydantic para las respuestas de la API. Los nombres de campo se
eligieron para que el frontend (PioDocsAI) los pueda consumir casi
directamente en lugar de sus arreglos de datos de ejemplo."""
from pydantic import BaseModel, ConfigDict


class DistribucionRiesgo(BaseModel):
    alto: int
    medio: int
    bajo: int
    alto_pct: float
    medio_pct: float
    bajo_pct: float


class MateriaResumen(BaseModel):
    materia: str
    area: str
    risk_pct: float
    estudiantes_en_riesgo: int
    estudiantes_evaluados: int


class DashboardSummary(BaseModel):
    anio: str
    anios_disponibles: list[str]
    estudiantes_evaluados: int
    estudiantes_en_riesgo_alto: int
    materias_priorizadas: int
    predicciones_totales: int
    distribucion: DistribucionRiesgo
    materias_top: list[MateriaResumen]


class AlertaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    anio: str
    cod_estudiante: int
    curso: str
    seccion: int
    materia: str
    area: str
    sexo: int
    nota_reciente: float
    probabilidad: float  # 0-100
    riesgo: str
    tendencia: str  # descendente | estable | mejora
    recomendacion: str


class AlertasPage(BaseModel):
    total: int
    items: list[AlertaOut]


class BinHistograma(BaseModel):
    desde: float  # probabilidad (0-1)
    hasta: float
    cantidad: int


class HistogramaProbabilidad(BaseModel):
    bins: list[BinHistograma]
    total: int
    umbral_medio: float
    umbral_alto: float


class PeriodoNota(BaseModel):
    periodo: int
    valor: float
    estado: int


class MateriaEstudiante(BaseModel):
    materia: str
    area: str
    periodos: list[PeriodoNota]
    probabilidad_riesgo: float | None = None
    nivel_riesgo: str | None = None
    recomendacion: str | None = None


class EstudianteDetalle(BaseModel):
    anio: str
    cod_estudiante: int
    curso: str
    seccion: int
    sexo: int
    promedio_general: float
    materias: list[MateriaEstudiante]


class MatrizConfusion(BaseModel):
    verdaderos_negativos: int
    falsos_positivos: int
    falsos_negativos: int
    verdaderos_positivos: int


class PuntoROC(BaseModel):
    fpr: float
    tpr: float


class PuntoSHAP(BaseModel):
    valor_shap: float  # impacto de esa variable, en ese caso, sobre la probabilidad de reprobar
    valor_normalizado: float  # 0 (valor bajo de la variable) a 1 (valor alto), para el color del punto


class VariableSHAP(BaseModel):
    variable: str
    media_abs_shap: float  # magnitud promedio del impacto (para ordenar de mas a menos influyente)
    puntos: list[PuntoSHAP]


class ModelInfo(BaseModel):
    disponible: bool
    fecha_entrenamiento: str | None = None
    auc_prueba: float | None = None
    umbral_alerta: float | None = None
    periodo_corte: int | None = None
    filas_entrenamiento: int | None = None
    features: list[str] = []
    importancia_variables: dict[str, float] | None = None
    filas_prueba: int | None = None
    matriz_confusion: MatrizConfusion | None = None
    curva_roc: list[PuntoROC] | None = None
    shap_variables: list[VariableSHAP] | None = None
    shap_filas_muestreadas: int | None = None


class ImportResult(BaseModel):
    id: int
    nombre_archivo: str
    filas_recibidas: int
    filas_insertadas: int
    anios_afectados: list[str]
    estado: str
    detalle: str


class ChatTurn(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


class ChartSeries(BaseModel):
    nombre: str
    valores: list[float]  # dispersion: coordenadas X. Los demas tipos: un valor por etiqueta.
    valores_y: list[float] | None = None  # solo dispersion: coordenadas Y (misma longitud que 'valores')


class ChartSpec(BaseModel):
    tipo: str  # barra | linea | dona | pastel | dispersion
    titulo: str
    etiquetas: list[str] = []  # categorias del eje X o segmentos (dispersion no las necesita)
    series: list[ChartSeries]
    eje_x: str | None = None  # etiqueta descriptiva del eje X (util sobre todo en dispersion)
    eje_y: str | None = None  # etiqueta descriptiva del eje Y (util sobre todo en dispersion)


class ChatResponse(BaseModel):
    reply: str
    chart: ChartSpec | None = None


class ExplicacionRequest(BaseModel):
    anio: str
    cod_estudiante: int
    materia: str


class ExplicacionResponse(BaseModel):
    descripcion: str
    recomendaciones: list[str]


class ImportBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_archivo: str
    filas_recibidas: int
    filas_insertadas: int
    anios_afectados: str
    estado: str
    detalle: str
