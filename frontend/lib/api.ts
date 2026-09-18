// Cliente minimo para la API del backend (FastAPI + SQLite). Ver backend/app.
// NEXT_PUBLIC_API_URL se define en docker-compose.yml; en desarrollo local
// sin Docker, por defecto apunta a localhost:8000.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface DistribucionRiesgo {
  alto: number
  medio: number
  bajo: number
  alto_pct: number
  medio_pct: number
  bajo_pct: number
}

export interface MateriaResumen {
  materia: string
  area: string
  risk_pct: number
  estudiantes_en_riesgo: number
  estudiantes_evaluados: number
}

export interface CeldaMateriaGrado {
  materia: string
  grado: string
  risk_pct: number
  estudiantes_en_riesgo: number
  estudiantes_evaluados: number
}

export interface HeatmapMateriaGrado {
  materias: string[]
  grados: string[]
  celdas: CeldaMateriaGrado[]
}

export interface DashboardSummary {
  anio: string
  anios_disponibles: string[]
  estudiantes_evaluados: number
  estudiantes_en_riesgo_alto: number
  materias_priorizadas: number
  predicciones_totales: number
  distribucion: DistribucionRiesgo
  materias_top: MateriaResumen[]
}

export interface AlertaOut {
  id: number
  anio: string
  cod_estudiante: number
  curso: string
  seccion: number
  materia: string
  area: string
  sexo: number
  nota_reciente: number
  probabilidad: number
  riesgo: 'Alto' | 'Medio' | 'Bajo'
  tendencia: 'descendente' | 'estable' | 'mejora'
  recomendacion: string
}

export interface AlertasPage {
  total: number
  items: AlertaOut[]
}

export interface BinHistograma {
  desde: number
  hasta: number
  cantidad: number
}

export interface HistogramaProbabilidad {
  bins: BinHistograma[]
  total: number
  umbral_medio: number
  umbral_alto: number
}

export interface PeriodoNota {
  periodo: number
  valor: number
  estado: number
}

export interface MateriaEstudiante {
  materia: string
  area: string
  periodos: PeriodoNota[]
  probabilidad_riesgo: number | null
  nivel_riesgo: string | null
  recomendacion: string | null
}

export interface EstudianteDetalle {
  anio: string
  cod_estudiante: number
  curso: string
  seccion: number
  sexo: number
  promedio_general: number
  materias: MateriaEstudiante[]
}

export interface MatrizConfusion {
  verdaderos_negativos: number
  falsos_positivos: number
  falsos_negativos: number
  verdaderos_positivos: number
}

export interface PuntoROC {
  fpr: number
  tpr: number
}

export interface PuntoSHAP {
  valor_shap: number
  valor_normalizado: number // 0 (valor bajo de la variable) a 1 (valor alto), para el color del punto
}

export interface VariableSHAP {
  variable: string
  media_abs_shap: number
  puntos: PuntoSHAP[]
}

export interface ModelInfo {
  disponible: boolean
  fecha_entrenamiento: string | null
  auc_prueba: number | null
  umbral_alerta: number | null
  periodo_corte: number | null
  filas_entrenamiento: number | null
  features: string[]
  importancia_variables: Record<string, number> | null
  filas_prueba: number | null
  matriz_confusion: MatrizConfusion | null
  curva_roc: PuntoROC[] | null
  shap_variables: VariableSHAP[] | null
  shap_filas_muestreadas: number | null
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChartSeries {
  nombre: string
  valores: number[]
  valores_y?: number[] // solo 'dispersion': coordenadas Y (mismo tamaño que 'valores')
}

export interface ChartSpec {
  tipo: 'barra' | 'linea' | 'dona' | 'pastel' | 'dispersion'
  titulo: string
  etiquetas: string[]
  series: ChartSeries[]
  eje_x?: string | null
  eje_y?: string | null
}

export interface ChatResponse {
  reply: string
  chart: ChartSpec | null
}

export interface ImportResult {
  id: number
  nombre_archivo: string
  filas_recibidas: number
  filas_insertadas: number
  anios_afectados: string[]
  estado: string
  detalle: string
}

export interface ExplicacionPrediccion {
  descripcion: string
  recomendaciones: string[]
}

export const api = {
  dashboardSummary: (anio?: string) =>
    apiGet<DashboardSummary>(`/api/dashboard/summary${anio ? `?anio=${encodeURIComponent(anio)}` : ''}`),

  alerts: (params: { anio?: string; risk?: string; search?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.anio) qs.set('anio', params.anio)
    if (params.risk && params.risk !== 'Todos') qs.set('risk', params.risk)
    if (params.search) qs.set('search', params.search)
    qs.set('limit', String(params.limit ?? 20))
    return apiGet<AlertasPage>(`/api/alerts?${qs.toString()}`)
  },

  probabilityHistogram: (anio?: string, bins = 20) => {
    const qs = new URLSearchParams()
    if (anio) qs.set('anio', anio)
    qs.set('bins', String(bins))
    return apiGet<HistogramaProbabilidad>(`/api/alerts/histograma?${qs.toString()}`)
  },

  subjects: (anio?: string) =>
    apiGet<MateriaResumen[]>(`/api/subjects/summary${anio ? `?anio=${encodeURIComponent(anio)}` : ''}`),

  subjectGradeHeatmap: (anio?: string) =>
    apiGet<HeatmapMateriaGrado>(`/api/subjects/heatmap${anio ? `?anio=${encodeURIComponent(anio)}` : ''}`),

  student: (anio: string, codEstudiante: number) =>
    apiGet<EstudianteDetalle>(`/api/students/${encodeURIComponent(anio)}/${codEstudiante}`),

  modelInfo: () => apiGet<ModelInfo>('/api/model/info'),

  chat: async (message: string, history: ChatTurn[]): Promise<ChatResponse> => {
    const res = await fetch(`${API_URL}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })
    const body = await res.json()
    if (!res.ok) {
      throw new Error(body?.detail || `El asistente no pudo responder (HTTP ${res.status})`)
    }
    return body as ChatResponse
  },

  explicarPrediccion: async (anio: string, codEstudiante: number, materia: string): Promise<ExplicacionPrediccion> => {
    const res = await fetch(`${API_URL}/api/assistant/explicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anio, cod_estudiante: codEstudiante, materia }),
    })
    const body = await res.json()
    if (!res.ok) {
      throw new Error(body?.detail || `No se pudo generar la explicación (HTTP ${res.status})`)
    }
    return body as ExplicacionPrediccion
  },

  importCsv: async (file: File): Promise<ImportResult> => {
    const form = new FormData()
    form.append('archivo', file)
    const res = await fetch(`${API_URL}/api/import`, { method: 'POST', body: form })
    const body = await res.json()
    if (!res.ok) {
      throw new Error(body?.detail || `Error al importar (HTTP ${res.status})`)
    }
    return body as ImportResult
  },
}
