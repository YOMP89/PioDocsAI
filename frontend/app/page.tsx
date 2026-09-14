'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  Gauge,
  LayoutDashboard,
  Loader2,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  api,
  type AlertaOut,
  type DashboardSummary,
  type EstudianteDetalle,
  type ExplicacionPrediccion,
  type MateriaResumen,
  type ModelInfo,
} from '@/lib/api'

const navItems = [
  { label: 'Resumen general', icon: LayoutDashboard },
  { label: 'Estudiantes', icon: Users },
  { label: 'Materias', icon: BookOpen },
  { label: 'Importar datos', icon: UploadCloud },
  { label: 'Modelo ML', icon: BrainCircuit },
]

// Estudiante seleccionado para la ficha individual: hace falta el año ademas
// del codigo porque el mismo codigo numerico puede repetirse entre años
// (ver la nota de codificacion en la hoja 'Diccionario' del dataset).
type SeleccionEstudiante = { anio: string; cod: number }

function RiskPill({ risk }: { risk: string }) {
  const styles = risk === 'Alto' ? 'bg-linear-to-r from-rose-500 to-rose-700 shadow-rose-600/30' : risk === 'Medio' ? 'bg-linear-to-r from-amber-500 to-amber-700 shadow-amber-600/30' : 'bg-linear-to-r from-emerald-500 to-emerald-700 shadow-emerald-600/30'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${styles}`}><span className="h-1.5 w-1.5 rounded-full bg-white/80" />{risk}</span>
}

function MetricCard({ title, value, helper, icon: Icon, tone = 'blue', trend }: { title: string; value: string; helper: string; icon: typeof Users; tone?: string; trend?: string }) {
  const tones: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', rose: 'bg-rose-50 text-rose-600', orange: 'bg-orange-50 text-orange-600', violet: 'bg-indigo-50 text-indigo-600' }
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/80">
    <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={19} strokeWidth={2} /></div></div>
    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">{trend && <span className="flex items-center font-semibold text-emerald-600"><ArrowUpRight size={13} /> {trend}</span>}{helper}</div>
  </div>
}

function CargandoPanel({ label = 'Cargando datos del backend…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-sm">
    <Loader2 size={16} className="animate-spin" /> {label}
  </div>
}

function ErrorPanel({ mensaje }: { mensaje: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
    <div><p className="font-semibold">No se pudo cargar la informacion del backend.</p><p className="mt-1 text-rose-600">{mensaje}</p></div>
  </div>
}

function initialesDe(cod: number) {
  return String(cod).slice(-2).padStart(2, '0')
}

function Dashboard({ onStudent }: { onStudent: (sel: SeleccionEstudiante) => void }) {
  const [filter, setFilter] = useState('Todos')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [alerts, setAlerts] = useState<AlertaOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const resumen = await api.dashboardSummary()
        const pagina = await api.alerts({ anio: resumen.anio, risk: filter, limit: 20 })
        if (cancelado) return
        setSummary(resumen)
        setAlerts(pagina.items)
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => { cancelado = true }
  }, [filter])

  if (loading && !summary) return <CargandoPanel label="Calculando el panel institucional…" />
  if (error) return <ErrorPanel mensaje={error} />
  if (!summary) return null

  const d = summary.distribucion
  const conic = `conic-gradient(#8B1A2B 0 ${d.alto_pct}%, #C9A227 ${d.alto_pct}% ${d.alto_pct + d.medio_pct}%, #10b981 ${d.alto_pct + d.medio_pct}% 100%)`

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-600" /> Vista institucional</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Resumen académico</h1><p className="mt-1 text-sm text-slate-500">Seguimiento preventivo · Año lectivo {summary.anio} · periodos 1-3</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"><Download size={16} /> Exportar reporte</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Estudiantes evaluados" value={String(summary.estudiantes_evaluados)} helper="con periodos 1 a 3 completos" icon={Users} tone="blue" />
      <MetricCard title="En riesgo alto" value={String(summary.estudiantes_en_riesgo_alto)} helper="requieren seguimiento" icon={AlertTriangle} tone="rose" />
      <MetricCard title="Materias priorizadas" value={String(summary.materias_priorizadas)} helper="con al menos una alerta" icon={BookOpen} tone="orange" />
      <MetricCard title="Predicciones" value={summary.predicciones_totales.toLocaleString('es-CO')} helper="combinaciones estudiante-materia" icon={Activity} tone="violet" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Distribución del riesgo</h2><p className="mt-1 text-sm text-slate-500">Estudiantes según probabilidad estimada</p></div><button aria-label="Más opciones" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><MoreHorizontal size={18} /></button></div><div className="mt-6 flex items-center gap-8"><div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: conic }}><div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-bold text-slate-900">{summary.estudiantes_evaluados}</span><span className="text-xs text-slate-500">estudiantes</span></div></div><div className="flex flex-1 flex-col gap-4"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Alto</span><b className="text-slate-900">{d.alto} <span className="font-normal text-slate-400">({d.alto_pct}%)</span></b></div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medio</span><b className="text-slate-900">{d.medio} <span className="font-normal text-slate-400">({d.medio_pct}%)</span></b></div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Bajo</span><b className="text-slate-900">{d.bajo} <span className="font-normal text-slate-400">({d.bajo_pct}%)</span></b></div></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Materias prioritarias</h2><p className="mt-1 text-sm text-slate-500">Porcentaje en riesgo alto o medio</p></div></div><div className="mt-5 flex flex-col gap-4">{summary.materias_top.length === 0 && <p className="text-sm text-slate-400">Sin materias en riesgo para este año.</p>}{summary.materias_top.map((subject) => <div key={subject.materia}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{subject.materia}</span><span className="font-bold text-slate-900">{subject.risk_pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${subject.risk_pct}%` }} /></div></div>)}</div></section>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-slate-900">Alertas para acompañamiento</h2><p className="mt-1 text-sm text-slate-500">Revisa los casos que necesitan una conversación oportuna.</p></div><div className="flex items-center gap-2"><Filter size={15} className="text-slate-400" /><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"><option>Todos</option><option>Alto</option><option>Medio</option><option>Bajo</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Estudiante</th><th className="px-5 py-3 font-semibold">Curso</th><th className="px-5 py-3 font-semibold">Materia</th><th className="px-5 py-3 font-semibold">Nota reciente</th><th className="px-5 py-3 font-semibold">Probabilidad</th><th className="px-5 py-3 font-semibold">Riesgo</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{alerts.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No hay alertas de nivel "{filter}" para este año.</td></tr>}{alerts.map((alerta) => <tr key={alerta.id} className="transition hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initialesDe(alerta.cod_estudiante)}</div><div><p className="font-semibold text-slate-800">EST-{alerta.cod_estudiante}</p><p className="text-xs text-slate-400">Tendencia {alerta.tendencia}</p></div></div></td><td className="px-5 py-4 text-slate-600">{alerta.curso}° · Sección {alerta.seccion}</td><td className="px-5 py-4 font-medium text-slate-700">{alerta.materia}</td><td className="px-5 py-4 font-semibold text-slate-800">{alerta.nota_reciente.toFixed(1)} <span className="font-normal text-slate-400">/ 5.0</span></td><td className="px-5 py-4 font-semibold text-slate-800">{Math.round(alerta.probabilidad)}%</td><td className="px-5 py-4"><RiskPill risk={alerta.riesgo} /></td><td className="px-5 py-4"><button onClick={() => onStudent({ anio: alerta.anio, cod: alerta.cod_estudiante })} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">Ver detalle <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div></section>
  </div>
}

function StudentDetail({ seleccion, onBack }: { seleccion: SeleccionEstudiante; onBack: () => void }) {
  const [detalle, setDetalle] = useState<EstudianteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estrategia, setEstrategia] = useState<ExplicacionPrediccion | null>(null)
  const [generando, setGenerando] = useState(false)
  const [errorEstrategia, setErrorEstrategia] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)
    setEstrategia(null)
    setErrorEstrategia(null)
    api.student(seleccion.anio, seleccion.cod)
      .then((d) => { if (!cancelado) setDetalle(d) })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [seleccion.anio, seleccion.cod])

  const volver = <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">← Volver a alertas</button>

  if (loading) return <div className="space-y-6">{volver}<CargandoPanel label="Cargando la ficha del estudiante…" /></div>
  if (error || !detalle) return <div className="space-y-6">{volver}<ErrorPanel mensaje={error ?? 'Estudiante no encontrado.'} /></div>

  // La materia con mayor riesgo (la lista ya viene ordenada por probabilidad
  // desde el backend) es la que se explica en el panel de la derecha.
  const materiaPrincipal = detalle.materias[0]
  const puntos = materiaPrincipal?.periodos ?? []
  const maxValor = Math.max(5, ...puntos.map((p) => p.valor))
  const ultimaNota = puntos.at(-1)?.valor ?? 0
  const promedioMateria = puntos.length ? puntos.reduce((s, p) => s + p.valor, 0) / puntos.length : 0

  async function generarEstrategia() {
    if (!materiaPrincipal || generando) return
    setGenerando(true)
    setErrorEstrategia(null)
    try {
      const resultado = await api.explicarPrediccion(seleccion.anio, seleccion.cod, materiaPrincipal.materia)
      setEstrategia(resultado)
    } catch (err) {
      setErrorEstrategia(err instanceof Error ? err.message : 'No se pudo generar la estrategia.')
    } finally {
      setGenerando(false)
    }
  }

  return <div className="space-y-6">
    {volver}
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-medium text-slate-500">Ficha individual</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">EST-{detalle.cod_estudiante}</h1><p className="mt-1 text-sm text-slate-500">Curso {detalle.curso}° · Sección {detalle.seccion} · Año lectivo {detalle.anio}</p></div>{materiaPrincipal && <button onClick={generarEstrategia} disabled={generando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:from-blue-600 hover:to-blue-800 disabled:opacity-60">{generando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {generando ? 'Generando con IA…' : 'Generar estrategia de apoyo'}</button>}</div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Promedio general</p><p className="mt-2 text-2xl font-bold text-slate-900">{detalle.promedio_general.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 5.0</span></p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Riesgo en {materiaPrincipal?.materia ?? '—'}</p><p className="mt-2 text-2xl font-bold text-rose-600">{materiaPrincipal?.probabilidad_riesgo != null ? `${Math.round(materiaPrincipal.probabilidad_riesgo)}%` : '—'}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Materias cursadas</p><p className="mt-2 text-2xl font-bold text-slate-900">{detalle.materias.length}</p></div></div>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Evolución de calificaciones</h2><p className="mt-1 text-sm text-slate-500">{materiaPrincipal ? `${materiaPrincipal.materia} · promedio por periodo` : 'Sin materias registradas'}</p><div className="mt-7 flex h-48 items-end gap-5 border-b border-l border-slate-200 px-4 pb-0 pt-4"><div className="flex h-full flex-1 items-end gap-3">{puntos.map((p) => <div key={p.periodo} className="group flex h-full flex-1 flex-col justify-end gap-2"><div className="relative w-full rounded-t-md bg-blue-500 transition hover:bg-blue-600" style={{ height: `${(p.valor / maxValor) * 100}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100">{p.valor.toFixed(1)}</span></div><span className="text-center text-xs text-slate-400">P{p.periodo}</span></div>)}</div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="text-blue-600" size={19} /><h2 className="font-bold text-slate-900">¿Por qué esta alerta?</h2></div><p className="mt-1 text-sm text-slate-500">Factores asociados, no determinantes.</p>{materiaPrincipal ? <div className="mt-5 flex flex-col gap-4"><div><div className="flex justify-between text-sm"><span className="text-slate-600">Última calificación</span><b className="text-slate-800">{ultimaNota.toFixed(1)}</b></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(100, (ultimaNota / 5) * 100)}%` }} /></div></div><div><div className="flex justify-between text-sm"><span className="text-slate-600">Promedio en la materia</span><b className="text-slate-800">{promedioMateria.toFixed(1)}</b></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (promedioMateria / 5) * 100)}%` }} /></div></div><div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-600">Recomendación del modelo</span><span className="max-w-[55%] text-right text-xs font-medium text-slate-500">{materiaPrincipal.recomendacion || 'Sin alerta activa en esta materia.'}</span></div></div> : <p className="mt-5 text-sm text-slate-400">No hay materias en riesgo para este estudiante.</p>}</section>
    </div>
    {errorEstrategia && <ErrorPanel mensaje={errorEstrategia} />}
    {estrategia && materiaPrincipal && <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-linear-to-br from-blue-500 to-blue-700 p-2 text-white shadow-sm shadow-blue-600/30"><Sparkles size={18} /></div><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Estrategia generada por IA · a partir de la predicción del modelo</p><h2 className="mt-1 font-bold text-slate-900">Acompañamiento en {materiaPrincipal.materia}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{estrategia.descripcion}</p><ul className="mt-4 space-y-2">{estrategia.recomendaciones.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{r}</li>)}</ul></div></div></section>}
  </div>
}

function DataImport() {
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState<{ nombre: string; filas: number; anios: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function manejarArchivo(file: File | undefined) {
    if (!file) return
    setSubiendo(true)
    setError(null)
    setResultado(null)
    try {
      const r = await api.importCsv(file)
      setResultado({ nombre: r.nombre_archivo, filas: r.filas_insertadas, anios: r.anios_afectados })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubiendo(false)
    }
  }

  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm font-medium text-blue-600">Fuentes de información</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Importar datos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Carga registros históricos para actualizar las predicciones. Las alertas se recalculan automáticamente para los años del archivo cargado.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center transition hover:border-blue-400 hover:bg-blue-50/30">
        <input type="file" accept=".csv" className="hidden" disabled={subiendo} onChange={(e) => manejarArchivo(e.target.files?.[0])} />
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">{subiendo ? <Loader2 size={26} className="animate-spin" /> : <FileSpreadsheet size={26} />}</div>
        <h2 className="mt-4 font-bold text-slate-900">{subiendo ? 'Importando y recalculando alertas…' : 'Arrastra tu archivo aquí'}</h2>
        <p className="mt-1 text-sm text-slate-500">o haz clic para seleccionar un archivo CSV con las mismas columnas del consolidado</p>
        <span className="mt-5 inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">Seleccionar archivo</span>
      </label>
      {resultado && <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><FileSpreadsheet size={18} /></div><div><p className="text-sm font-semibold text-emerald-900">{resultado.nombre}</p><p className="text-xs text-emerald-700">{resultado.filas.toLocaleString('es-CO')} registros insertados · alertas recalculadas para {resultado.anios.join(', ')}</p></div></div><button onClick={() => setResultado(null)} aria-label="Cerrar aviso" className="text-emerald-700"><X size={18} /></button></div>}
      {error && <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Campos esperados</h2><p className="mt-1 text-sm text-slate-500">El sistema reconoce variaciones en los nombres de columna (con o sin tildes).</p></div></div><div className="mt-5 flex flex-wrap gap-2">{['Año', 'Periodo', 'Código del estudiante', 'Sexo', 'Curso', 'Sección', 'Área académica', 'Materia', 'Valor', 'Nota', 'Estado', 'Observación'].map((field) => <span key={field} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">{field}</span>)}</div></section>
  </div>
}

function MateriasView() {
  const [materias, setMaterias] = useState<MateriaResumen[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    api.subjects()
      .then((data) => { if (!cancelado) setMaterias(data) })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : String(err)) })
    return () => { cancelado = true }
  }, [])

  if (error) return <ErrorPanel mensaje={error} />
  if (!materias) return <CargandoPanel label="Calculando el riesgo por materia…" />

  // El CSV trae el mismo nombre de materia bajo areas distintas entre años
  // (ej. "Inglés" vs "Idioma Extranjero: Inglés") — para el grafico se
  // combinan por nombre de materia, asi el eje no repite la misma etiqueta.
  const combinadas = new Map<string, { total: number; riesgo: number }>()
  for (const m of materias) {
    const acc = combinadas.get(m.materia) ?? { total: 0, riesgo: 0 }
    acc.total += m.estudiantes_evaluados
    acc.riesgo += m.estudiantes_en_riesgo
    combinadas.set(m.materia, acc)
  }
  const top = Array.from(combinadas, ([materia, { total, riesgo }]) => ({
    materia, risk_pct: total ? Math.round((1000 * riesgo) / total) / 10 : 0,
  })).sort((a, b) => b.risk_pct - a.risk_pct).slice(0, 12)

  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-blue-600">Consolidado académico 2020-2025</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Materias</h1><p className="mt-2 text-sm leading-6 text-slate-500">Porcentaje de estudiantes en riesgo (alto o medio) por materia, calculado sobre acumulado_desde_2020_al_2025_datos.csv.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Riesgo por materia</h2>
      <p className="mt-1 text-sm text-slate-500">Las {top.length} materias con mayor porcentaje de estudiantes en riesgo.</p>
      <div className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="materia" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Riesgo']} />
            <Bar dataKey="risk_pct" fill="#1337A2" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Todas las materias</h2><p className="mt-1 text-sm text-slate-500">{materias.length} materias evaluadas por el modelo.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Materia</th><th className="px-5 py-3 font-semibold">Área</th><th className="px-5 py-3 font-semibold">Riesgo</th><th className="px-5 py-3 font-semibold">En riesgo</th><th className="px-5 py-3 font-semibold">Evaluados</th></tr></thead><tbody className="divide-y divide-slate-100">{materias.map((m) => <tr key={`${m.materia}-${m.area}`} className="transition hover:bg-slate-50/60"><td className="px-5 py-3 font-medium text-slate-700">{m.materia}</td><td className="px-5 py-3 text-slate-500">{m.area}</td><td className="px-5 py-3 font-semibold text-slate-800">{m.risk_pct}%</td><td className="px-5 py-3 text-slate-600">{m.estudiantes_en_riesgo}</td><td className="px-5 py-3 text-slate-600">{m.estudiantes_evaluados}</td></tr>)}</tbody></table></div>
    </section>
  </div>
}

function EstudiantesView({ onStudent }: { onStudent: (sel: SeleccionEstudiante) => void }) {
  const [alerts, setAlerts] = useState<AlertaOut[] | null>(null)
  const [anio, setAnio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const resumen = await api.dashboardSummary()
        const pagina = await api.alerts({ anio: resumen.anio, risk: 'Todos', limit: 200 })
        if (!cancelado) { setAnio(resumen.anio); setAlerts(pagina.items) }
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => { cancelado = true }
  }, [])

  if (error) return <ErrorPanel mensaje={error} />
  if (!alerts) return <CargandoPanel label="Cargando estudiantes en riesgo…" />

  const porCurso = new Map<string, number>()
  for (const a of alerts) porCurso.set(a.curso, (porCurso.get(a.curso) ?? 0) + 1)
  const dataCurso = Array.from(porCurso.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([curso, total]) => ({ curso: `${curso}°`, total }))

  const filtrados = filtro.trim()
    ? alerts.filter((a) => a.materia.toLowerCase().includes(filtro.trim().toLowerCase()) || String(a.cod_estudiante).includes(filtro.trim()))
    : alerts

  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-blue-600">Año lectivo {anio}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Estudiantes en riesgo</h1><p className="mt-2 text-sm leading-6 text-slate-500">{alerts.length} alertas activas (riesgo alto o medio), calculadas sobre acumulado_desde_2020_al_2025_datos.csv.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Alertas por curso</h2>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataCurso}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="curso" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" name="Alertas" fill="#8B1A2B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div><h2 className="font-bold text-slate-900">Listado de alertas</h2><p className="mt-1 text-sm text-slate-500">Haz clic en un estudiante para ver su ficha.</p></div>
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por materia o código..." className="w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white" />
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Estudiante</th><th className="px-5 py-3 font-semibold">Curso</th><th className="px-5 py-3 font-semibold">Materia</th><th className="px-5 py-3 font-semibold">Nota reciente</th><th className="px-5 py-3 font-semibold">Probabilidad</th><th className="px-5 py-3 font-semibold">Riesgo</th></tr></thead><tbody className="divide-y divide-slate-100">{filtrados.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">Sin resultados para "{filtro}".</td></tr>}{filtrados.map((a) => <tr key={a.id} onClick={() => onStudent({ anio: a.anio, cod: a.cod_estudiante })} className="cursor-pointer transition hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initialesDe(a.cod_estudiante)}</div><p className="font-semibold text-slate-800">EST-{a.cod_estudiante}</p></div></td><td className="px-5 py-4 text-slate-600">{a.curso}° · Sección {a.seccion}</td><td className="px-5 py-4 font-medium text-slate-700">{a.materia}</td><td className="px-5 py-4 font-semibold text-slate-800">{a.nota_reciente.toFixed(1)} <span className="font-normal text-slate-400">/ 5.0</span></td><td className="px-5 py-4 font-semibold text-slate-800">{Math.round(a.probabilidad)}%</td><td className="px-5 py-4"><RiskPill risk={a.riesgo} /></td></tr>)}</tbody></table></div>
    </section>
  </div>
}

function ModeloMLView() {
  const [info, setInfo] = useState<ModelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.modelInfo().then(setInfo).catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) return <ErrorPanel mensaje={error} />
  if (!info) return <CargandoPanel label="Consultando el modelo entrenado…" />
  if (!info.disponible) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800">No hay un modelo entrenado disponible en el backend (falta modelo_riesgo_academico.joblib).</div>

  return <div className="mx-auto max-w-3xl space-y-6">
    <div><p className="text-sm font-medium text-blue-600">Modelo de clasificación</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Modelo ML</h1><p className="mt-2 text-sm leading-6 text-slate-500">Bosque aleatorio entrenado sobre el consolidado 2020-2025 (ver Proceso_ML_1_Clasificacion.ipynb, Fase 6 a 9).</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><MetricCard title="AUC (prueba)" value={info.auc_prueba != null ? info.auc_prueba.toFixed(3) : '—'} helper="capacidad de ordenar el riesgo" icon={Gauge} tone="violet" /><MetricCard title="Umbral de alerta" value={info.umbral_alerta != null ? info.umbral_alerta.toFixed(2) : '—'} helper="probabilidad minima para alertar" icon={BrainCircuit} tone="blue" /><MetricCard title="Filas de entrenamiento" value={info.filas_entrenamiento?.toLocaleString('es-CO') ?? '—'} helper="combinaciones estudiante-materia" icon={Database} tone="orange" /><MetricCard title="Entrenado" value={info.fecha_entrenamiento ?? '—'} helper={`periodo de corte: ${info.periodo_corte ?? '—'}`} icon={Activity} tone="rose" /></div>
    {info.importancia_variables && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Importancia de variables</h2>
      <p className="mt-1 text-sm text-slate-500">Cuánto pesa cada variable en las predicciones del modelo (impureza Gini).</p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={Object.entries(info.importancia_variables).map(([variable, importancia]) => ({ variable, importancia }))} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="variable" width={160} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toFixed(3)} />
            <Bar dataKey="importancia" fill="#C9A227" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Variables que usa el modelo</h2><div className="mt-4 flex flex-wrap gap-2">{info.features.map((f) => <span key={f} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">{f}</span>)}</div></section>
  </div>
}

export default function Page() {
  const [activeNav, setActiveNav] = useState('Resumen general')
  const [selectedStudent, setSelectedStudent] = useState<SeleccionEstudiante | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const currentTitle = activeNav === 'Resumen general' ? 'Panel de acompañamiento' : activeNav
  const content = selectedStudent
    ? <StudentDetail seleccion={selectedStudent} onBack={() => setSelectedStudent(null)} />
    : activeNav === 'Resumen general' ? <Dashboard onStudent={setSelectedStudent} />
    : activeNav === 'Estudiantes' ? <EstudiantesView onStudent={setSelectedStudent} />
    : activeNav === 'Materias' ? <MateriasView />
    : activeNav === 'Importar datos' ? <DataImport />
    : <ModeloMLView />
  return <div className="min-h-screen bg-[#F7F3EC] text-slate-900"><aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-20 items-center justify-between border-b border-slate-100 px-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm shadow-blue-200 ring-1 ring-slate-100"><img src="/escudo-pio-xii.png" alt="Escudo Colegio Franciscano Pío XII" className="h-full w-full object-contain" /></div><div><p className="text-[17px] font-bold tracking-tight text-slate-900">PioDocs<span className="text-blue-600">AI</span></p><p className="text-[12px] font-medium uppercase tracking-wider text-slate-400">Acompañamiento académico</p></div></div><button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-slate-400 lg:hidden"><X size={18} /></button></div><nav className="flex flex-1 flex-col gap-1 px-3 py-6"><p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">Navegación principal</p>{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setSelectedStudent(null); setMobileOpen(false) }} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${activeNav === label ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} className={activeNav === label ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />{label}</button>)}<div className="my-5 border-t border-slate-100" /><p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">Sistema</p><button className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"><Settings size={18} className="text-slate-400" />Configuración</button><button className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"><CircleHelp size={18} className="text-slate-400" />Centro de ayuda</button></nav></aside><div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><div><p className="text-xs text-slate-400">Colegio Franciscano Pío XII</p><h2 className="mt-0.5 text-base font-bold text-slate-900">{currentTitle}</h2></div></div><div className="flex items-center gap-2"><div className="relative hidden md:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudiante..." className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white" /></div><button aria-label="Notificaciones" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button><div className="ml-1 hidden h-8 w-px bg-slate-200 sm:block" /><button className="hidden items-center gap-2 rounded-xl px-2 py-1.5 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">MR</div><ChevronDown size={15} className="text-slate-400" /></button></div></header><main className="p-4 md:p-8">{content}<div className="mt-8 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck size={14} className="shrink-0 text-blue-500" />Las predicciones son probabilísticas y no sustituyen el criterio profesional ni la conversación con cada estudiante.</div></main></div></div>
}
