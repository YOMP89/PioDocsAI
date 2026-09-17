'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
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

// Badges pastel para listas de etiquetas informativas (campos del CSV,
// variables del modelo): un tono suave y distinto por item, ciclico, para
// que la lista se sienta viva sin competir con el contenido principal.
const TAG_TONES = [
  'bg-blue-50 text-blue-700',
  'bg-emerald-50 text-emerald-700',
  'bg-violet-50 text-violet-700',
  'bg-teal-50 text-teal-700',
  'bg-amber-50 text-amber-800',
  'bg-rose-50 text-rose-700',
]

// Estudiante seleccionado para la ficha individual: hace falta el año ademas
// del codigo porque el mismo codigo numerico puede repetirse entre años
// (ver la nota de codificacion en la hoja 'Diccionario' del dataset).
type SeleccionEstudiante = { anio: string; cod: number }

function RiskPill({ risk }: { risk: string }) {
  const styles = risk === 'Alto' ? 'bg-linear-to-r from-rose-500 to-rose-700 shadow-rose-600/18' : risk === 'Medio' ? 'bg-linear-to-r from-amber-500 to-amber-700 shadow-amber-600/18' : 'bg-linear-to-r from-emerald-500 to-emerald-700 shadow-emerald-600/18'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${styles}`}><span className="h-1.5 w-1.5 rounded-full bg-white/80" />{risk}</span>
}

function MetricCard({ title, value, helper, icon: Icon, tone = 'blue', trend }: { title: string; value: string; helper: string; icon: typeof Users; tone?: string; trend?: string }) {
  // Cada KPI tiene su propia identidad cromatica (azul electrico, coral,
  // esmeralda, violeta, turquesa): fondo muy claro + degradado abstracto
  // sutil (el "blob" difuminado en la esquina) + icono circular en color
  // vivo. El numero grande se mantiene siempre oscuro/neutro por legibilidad.
  const tones: Record<string, { border: string; wash: string; blob: string; chip: string; dot: string }> = {
    blue: { border: 'border-blue-100', wash: 'from-blue-50 via-blue-50/40 to-white', blob: 'from-blue-300/35 to-teal-200/20', chip: 'bg-linear-to-br from-blue-400 to-blue-600 shadow-blue-600/20', dot: 'bg-blue-500' },
    rose: { border: 'border-rose-100', wash: 'from-rose-50 via-rose-50/40 to-white', blob: 'from-rose-300/35 to-amber-200/20', chip: 'bg-linear-to-br from-rose-400 to-rose-600 shadow-rose-500/20', dot: 'bg-rose-500' },
    emerald: { border: 'border-emerald-100', wash: 'from-emerald-50 via-emerald-50/40 to-white', blob: 'from-emerald-300/35 to-teal-200/20', chip: 'bg-linear-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20', dot: 'bg-emerald-500' },
    violet: { border: 'border-violet-100', wash: 'from-violet-50 via-violet-50/40 to-white', blob: 'from-violet-300/35 to-blue-200/20', chip: 'bg-linear-to-br from-violet-400 to-violet-600 shadow-violet-600/20', dot: 'bg-violet-500' },
    teal: { border: 'border-teal-100', wash: 'from-teal-50 via-teal-50/40 to-white', blob: 'from-teal-300/35 to-emerald-200/20', chip: 'bg-linear-to-br from-teal-400 to-teal-600 shadow-teal-500/20', dot: 'bg-teal-500' },
    orange: { border: 'border-orange-100', wash: 'from-orange-50 via-orange-50/40 to-white', blob: 'from-orange-300/35 to-amber-200/20', chip: 'bg-linear-to-br from-orange-400 to-orange-600 shadow-orange-500/20', dot: 'bg-orange-500' },
  }
  const t = tones[tone] ?? tones.blue
  return <div className={`relative overflow-hidden rounded-2xl border ${t.border} bg-linear-to-br ${t.wash} p-5 shadow-sm shadow-slate-100/80`}>
    <div className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-linear-to-br blur-2xl ${t.blob}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />{title}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      </div>
      <div className={`rounded-full p-2.5 text-white shadow-sm ${t.chip}`}><Icon size={19} strokeWidth={2} /></div>
    </div>
    <div className="relative mt-4 flex items-center gap-1.5 text-xs text-slate-500">{trend && <span className="flex items-center font-semibold text-emerald-600"><ArrowUpRight size={13} /> {trend}</span>}{helper}</div>
  </div>
}

function CargandoPanel({ label = 'Cargando datos del backend…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-sm">
    <Loader2 size={16} className="animate-spin" /> {label}
  </div>
}

function ErrorPanel({ mensaje }: { mensaje: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-400 to-rose-600 text-white shadow-sm shadow-rose-500/18"><AlertTriangle size={17} /></div>
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
  const conic = `conic-gradient(var(--color-rose-500) 0 ${d.alto_pct}%, var(--color-amber-500) ${d.alto_pct}% ${d.alto_pct + d.medio_pct}%, var(--color-emerald-500) ${d.alto_pct + d.medio_pct}% 100%)`

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 via-cyan-50 to-emerald-50 p-6 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-600" /> Vista institucional</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Resumen académico</h1><p className="mt-1 text-sm text-slate-500">Seguimiento preventivo · Año lectivo {summary.anio} · periodos 1-3</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/18 transition hover:bg-blue-700 active:bg-blue-800"><Download size={16} /> Exportar reporte</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Estudiantes evaluados" value={String(summary.estudiantes_evaluados)} helper="con periodos 1 a 3 completos" icon={Users} tone="blue" />
      <MetricCard title="En riesgo alto" value={String(summary.estudiantes_en_riesgo_alto)} helper="requieren seguimiento" icon={AlertTriangle} tone="rose" />
      <MetricCard title="Materias priorizadas" value={String(summary.materias_priorizadas)} helper="con al menos una alerta" icon={BookOpen} tone="emerald" />
      <MetricCard title="Predicciones" value={summary.predicciones_totales.toLocaleString('es-CO')} helper="combinaciones estudiante-materia" icon={Activity} tone="violet" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/60 via-white to-white p-5 shadow-sm"><div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-linear-to-br from-blue-300/35 to-violet-200/20 blur-3xl" /><div className="relative flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Distribución del riesgo</h2><p className="mt-1 text-sm text-slate-500">Estudiantes según probabilidad estimada</p></div><button aria-label="Más opciones" className="rounded-full p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><MoreHorizontal size={18} /></button></div><div className="relative mt-6 flex items-center gap-8"><div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: conic }}><div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.35),transparent_55%)]" /><div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-extrabold text-slate-900">{summary.estudiantes_evaluados}</span><span className="text-xs text-slate-500">estudiantes</span></div></div><div className="flex flex-1 flex-col gap-4"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-linear-to-br from-rose-400 to-rose-600" /> Alto</span><b className="text-slate-900">{d.alto} <span className="font-normal text-slate-400">({d.alto_pct}%)</span></b></div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-linear-to-br from-amber-400 to-amber-600" /> Medio</span><b className="text-slate-900">{d.medio} <span className="font-normal text-slate-400">({d.medio_pct}%)</span></b></div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600" /> Bajo</span><b className="text-slate-900">{d.bajo} <span className="font-normal text-slate-400">({d.bajo_pct}%)</span></b></div></div></div></section>
      <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-linear-to-br from-violet-50/60 via-white to-white p-5 shadow-sm"><div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-linear-to-br from-violet-300/35 to-blue-200/20 blur-3xl" /><div className="relative flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Materias prioritarias</h2><p className="mt-1 text-sm text-slate-500">Porcentaje en riesgo alto o medio</p></div></div><div className="relative mt-5 flex flex-col gap-4">{summary.materias_top.length === 0 && <p className="text-sm text-slate-400">Sin materias en riesgo para este año.</p>}{summary.materias_top.map((subject) => <div key={subject.materia}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{subject.materia}</span><span className="font-bold text-slate-900">{subject.risk_pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-linear-to-r from-blue-400 to-blue-600" style={{ width: `${subject.risk_pct}%` }} /></div></div>)}</div></section>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-slate-900">Alertas para acompañamiento</h2><p className="mt-1 text-sm text-slate-500">Revisa los casos que necesitan una conversación oportuna.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-1 shadow-sm transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/15 hover:border-teal-300"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-white"><Filter size={12} /></div><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg bg-transparent py-2 pl-1 pr-3 text-sm font-medium text-slate-700 outline-none"><option>Todos</option><option>Alto</option><option>Medio</option><option>Bajo</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Estudiante</th><th className="px-5 py-3 font-semibold">Curso</th><th className="px-5 py-3 font-semibold">Materia</th><th className="px-5 py-3 font-semibold">Nota reciente</th><th className="px-5 py-3 font-semibold">Probabilidad</th><th className="px-5 py-3 font-semibold">Riesgo</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{alerts.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No hay alertas de nivel "{filter}" para este año.</td></tr>}{alerts.map((alerta) => <tr key={alerta.id} className="transition hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initialesDe(alerta.cod_estudiante)}</div><div><p className="font-semibold text-slate-800">EST-{alerta.cod_estudiante}</p><p className="text-xs text-slate-400">Tendencia {alerta.tendencia}</p></div></div></td><td className="px-5 py-4 text-slate-600">{alerta.curso}° · Sección {alerta.seccion}</td><td className="px-5 py-4 font-medium text-slate-700">{alerta.materia}</td><td className="px-5 py-4 font-semibold text-slate-800">{alerta.nota_reciente.toFixed(1)} <span className="font-normal text-slate-400">/ 5.0</span></td><td className="px-5 py-4 font-semibold text-slate-800">{Math.round(alerta.probabilidad)}%</td><td className="px-5 py-4"><RiskPill risk={alerta.riesgo} /></td><td className="px-5 py-4"><button onClick={() => onStudent({ anio: alerta.anio, cod: alerta.cod_estudiante })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">Ver detalle <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div></section>
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

  const volver = <button onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100">← Volver a alertas</button>

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
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-medium text-slate-500">Ficha individual</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">EST-{detalle.cod_estudiante}</h1><p className="mt-1 text-sm text-slate-500">Curso {detalle.curso}° · Sección {detalle.seccion} · Año lectivo {detalle.anio}</p></div>{materiaPrincipal && <button onClick={generarEstrategia} disabled={generando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-br from-violet-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/18 transition hover:from-violet-600 hover:to-blue-700 active:from-violet-700 active:to-blue-800 disabled:opacity-60">{generando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {generando ? 'Generando con IA…' : 'Generar estrategia de apoyo'}</button>}</div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/60 via-white to-white p-5"><div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-blue-300/30 to-teal-200/15 blur-2xl" /><p className="relative text-sm text-slate-500">Promedio general</p><p className="relative mt-2 text-2xl font-extrabold text-slate-900">{detalle.promedio_general.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 5.0</span></p></div><div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-linear-to-br from-rose-50/60 via-white to-white p-5"><div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-rose-300/30 to-amber-200/15 blur-2xl" /><p className="relative text-sm text-slate-500">Riesgo en {materiaPrincipal?.materia ?? '—'}</p><p className="relative mt-2 text-2xl font-extrabold text-rose-600">{materiaPrincipal?.probabilidad_riesgo != null ? `${Math.round(materiaPrincipal.probabilidad_riesgo)}%` : '—'}</p></div><div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/60 via-white to-white p-5"><div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-emerald-300/30 to-teal-200/15 blur-2xl" /><p className="relative text-sm text-slate-500">Materias cursadas</p><p className="relative mt-2 text-2xl font-extrabold text-slate-900">{detalle.materias.length}</p></div></div>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/50 via-white to-white p-5"><div className="pointer-events-none absolute -left-12 -bottom-14 h-48 w-48 rounded-full bg-teal-200/20 blur-3xl" /><div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl" /><h2 className="relative font-bold text-slate-900">Evolución de calificaciones</h2><p className="relative mt-1 text-sm text-slate-500">{materiaPrincipal ? `${materiaPrincipal.materia} · promedio por periodo` : 'Sin materias registradas'}</p><div className="relative mt-7 flex h-48 items-end gap-5 border-b border-l border-slate-200 px-4 pb-0 pt-4"><div className="flex h-full flex-1 items-end gap-3">{puntos.map((p) => <div key={p.periodo} className="group flex h-full flex-1 flex-col justify-end gap-2"><div className="relative w-full rounded-t-md bg-linear-to-t from-blue-600 to-blue-400 transition hover:from-blue-700 hover:to-blue-500" style={{ height: `${(p.valor / maxValor) * 100}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100">{p.valor.toFixed(1)}</span></div><span className="text-center text-xs text-slate-400">P{p.periodo}</span></div>)}</div></div></section>
      <section className="relative overflow-hidden rounded-2xl border border-amber-100 bg-linear-to-br from-amber-50/50 via-white to-white p-5"><div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-linear-to-br from-amber-300/30 to-rose-200/15 blur-3xl" /><div className="relative flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-sm shadow-blue-600/18"><ShieldCheck size={16} /></div><h2 className="font-bold text-slate-900">¿Por qué esta alerta?</h2></div><p className="relative mt-1 text-sm text-slate-500">Factores asociados, no determinantes.</p>{materiaPrincipal ? <div className="relative mt-5 flex flex-col gap-4"><div><div className="flex justify-between text-sm"><span className="text-slate-600">Última calificación</span><b className="text-slate-800">{ultimaNota.toFixed(1)}</b></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-linear-to-r from-rose-400 to-rose-500" style={{ width: `${Math.min(100, (ultimaNota / 5) * 100)}%` }} /></div></div><div><div className="flex justify-between text-sm"><span className="text-slate-600">Promedio en la materia</span><b className="text-slate-800">{promedioMateria.toFixed(1)}</b></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500" style={{ width: `${Math.min(100, (promedioMateria / 5) * 100)}%` }} /></div></div><div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-600">Recomendación del modelo</span><span className="max-w-[55%] text-right text-xs font-medium text-slate-500">{materiaPrincipal.recomendacion || 'Sin alerta activa en esta materia.'}</span></div></div> : <p className="relative mt-5 text-sm text-slate-400">No hay materias en riesgo para este estudiante.</p>}</section>
    </div>
    {errorEstrategia && <ErrorPanel mensaje={errorEstrategia} />}
    {estrategia && materiaPrincipal && <section className="relative overflow-hidden rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50/70 via-blue-50/40 to-white p-5"><div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-linear-to-br from-violet-300/35 to-blue-200/20 blur-3xl" /><div className="relative flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white shadow-sm shadow-violet-600/18"><Sparkles size={18} /></div><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Estrategia generada por IA · a partir de la predicción del modelo</p><h2 className="mt-1 font-bold text-slate-900">Acompañamiento en {materiaPrincipal.materia}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{estrategia.descripcion}</p><ul className="mt-4 space-y-2">{estrategia.recomendaciones.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{r}</li>)}</ul></div></div></section>}
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
    <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/50 via-white to-white p-8 shadow-sm">
      <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-linear-to-br from-emerald-300/30 to-teal-200/20 blur-3xl" />
      <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30">
        <input type="file" accept=".csv" className="hidden" disabled={subiendo} onChange={(e) => manejarArchivo(e.target.files?.[0])} />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm transition group-hover:bg-linear-to-br group-hover:from-emerald-400 group-hover:to-emerald-600 group-hover:text-white group-hover:shadow-emerald-500/18">{subiendo ? <Loader2 size={26} className="animate-spin" /> : <FileSpreadsheet size={26} />}</div>
        <h2 className="mt-4 font-bold text-slate-900">{subiendo ? 'Importando y recalculando alertas…' : 'Arrastra tu archivo aquí'}</h2>
        <p className="mt-1 text-sm text-slate-500">o haz clic para seleccionar un archivo CSV con las mismas columnas del consolidado</p>
        <span className="mt-5 inline-block rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition group-hover:from-emerald-600 group-hover:to-emerald-700">Seleccionar archivo</span>
      </label>
      {resultado && <div className="relative mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-500/18"><FileSpreadsheet size={17} /></div><div><p className="text-sm font-semibold text-emerald-900">{resultado.nombre}</p><p className="text-xs text-emerald-700">{resultado.filas.toLocaleString('es-CO')} registros insertados · alertas recalculadas para {resultado.anios.join(', ')}</p></div></div><button onClick={() => setResultado(null)} aria-label="Cerrar aviso" className="rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-100"><X size={18} /></button></div>}
      {error && <div className="relative mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-400 to-rose-600 text-white shadow-sm shadow-rose-500/18"><AlertTriangle size={15} /></div><span className="mt-1">{error}</span></div>}
    </section>
    <section className="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/40 via-white to-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Campos esperados</h2><p className="mt-1 text-sm text-slate-500">El sistema reconoce variaciones en los nombres de columna (con o sin tildes).</p></div></div><div className="mt-5 flex flex-wrap gap-2">{['Año', 'Periodo', 'Código del estudiante', 'Sexo', 'Curso', 'Sección', 'Área académica', 'Materia', 'Valor', 'Nota', 'Estado', 'Observación'].map((field, i) => <span key={field} className={`rounded-lg px-3 py-2 text-xs font-medium ${TAG_TONES[i % TAG_TONES.length]}`}>{field}</span>)}</div></section>
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
    <section className="relative overflow-hidden rounded-2xl border border-teal-100 bg-linear-to-br from-teal-50/50 via-white to-white p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-linear-to-br from-teal-300/30 to-blue-200/20 blur-3xl" />
      <h2 className="relative font-bold text-slate-900">Riesgo por materia</h2>
      <p className="relative mt-1 text-sm text-slate-500">Las {top.length} materias con mayor porcentaje de estudiantes en riesgo.</p>
      <div className="relative mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
            <defs>
              <linearGradient id="gradienteRiesgoMateria" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5CB3FF" />
                <stop offset="100%" stopColor="#1670FF" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="materia" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Riesgo']} />
            <Bar dataKey="risk_pct" fill="url(#gradienteRiesgoMateria)" radius={[0, 4, 4, 0]} />
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
    <section className="relative overflow-hidden rounded-2xl border border-rose-100 bg-linear-to-br from-rose-50/40 via-white to-white p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-linear-to-br from-rose-300/25 to-amber-200/15 blur-3xl" />
      <h2 className="relative font-bold text-slate-900">Alertas por curso</h2>
      <div className="relative mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataCurso}>
            <defs>
              <linearGradient id="gradienteAlertasCurso" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF7A94" />
                <stop offset="100%" stopColor="#FB5072" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="curso" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" name="Alertas" fill="url(#gradienteAlertasCurso)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div><h2 className="font-bold text-slate-900">Listado de alertas</h2><p className="mt-1 text-sm text-slate-500">Haz clic en un estudiante para ver su ficha.</p></div>
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por materia o código..." className="w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-400/15" />
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
  if (!info.disponible) return <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/18"><AlertTriangle size={22} /></div>No hay un modelo entrenado disponible en el backend (falta modelo_riesgo_academico.joblib).</div>

  return <div className="mx-auto max-w-3xl space-y-6">
    <div><p className="text-sm font-medium text-blue-600">Modelo de clasificación</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Modelo ML</h1><p className="mt-2 text-sm leading-6 text-slate-500">Bosque aleatorio entrenado sobre el consolidado 2020-2025 (ver Proceso_ML_1_Clasificacion.ipynb, Fase 6 a 9).</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><MetricCard title="AUC (prueba)" value={info.auc_prueba != null ? info.auc_prueba.toFixed(3) : '—'} helper="capacidad de ordenar el riesgo" icon={Gauge} tone="violet" /><MetricCard title="Umbral de alerta" value={info.umbral_alerta != null ? info.umbral_alerta.toFixed(2) : '—'} helper="probabilidad minima para alertar" icon={BrainCircuit} tone="blue" /><MetricCard title="Filas de entrenamiento" value={info.filas_entrenamiento?.toLocaleString('es-CO') ?? '—'} helper="combinaciones estudiante-materia" icon={Database} tone="orange" /><MetricCard title="Entrenado" value={info.fecha_entrenamiento ?? '—'} helper={`periodo de corte: ${info.periodo_corte ?? '—'}`} icon={Activity} tone="rose" /></div>
    {info.importancia_variables && <section className="relative overflow-hidden rounded-2xl border border-amber-100 bg-linear-to-br from-amber-50/50 via-white to-white p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-linear-to-br from-amber-300/30 to-rose-200/15 blur-3xl" />
      <h2 className="relative font-bold text-slate-900">Importancia de variables</h2>
      <p className="relative mt-1 text-sm text-slate-500">Cuánto pesa cada variable en las predicciones del modelo (impureza Gini).</p>
      <div className="relative mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={Object.entries(info.importancia_variables).map(([variable, importancia]) => ({ variable, importancia }))} layout="vertical" margin={{ left: 8, right: 24 }}>
            <defs>
              <linearGradient id="gradienteImportanciaVariable" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFD152" />
                <stop offset="100%" stopColor="#F5A300" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="variable" width={160} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toFixed(3)} />
            <Bar dataKey="importancia" fill="url(#gradienteImportanciaVariable)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>}
    <section className="rounded-2xl border border-violet-100 bg-linear-to-br from-violet-50/40 via-white to-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Variables que usa el modelo</h2><div className="mt-4 flex flex-wrap gap-2">{info.features.map((f, i) => <span key={f} className={`rounded-lg px-3 py-2 text-xs font-medium ${TAG_TONES[i % TAG_TONES.length]}`}>{f}</span>)}</div></section>
  </div>
}

export default function Page() {
  const [activeNav, setActiveNav] = useState('Resumen general')
  const [selectedStudent, setSelectedStudent] = useState<SeleccionEstudiante | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const currentTitle = activeNav === 'Resumen general' ? 'Panel de acompañamiento' : activeNav
  const content = selectedStudent
    ? <StudentDetail seleccion={selectedStudent} onBack={() => setSelectedStudent(null)} />
    : activeNav === 'Resumen general' ? <Dashboard onStudent={setSelectedStudent} />
    : activeNav === 'Estudiantes' ? <EstudiantesView onStudent={setSelectedStudent} />
    : activeNav === 'Materias' ? <MateriasView />
    : activeNav === 'Importar datos' ? <DataImport />
    : <ModeloMLView />
  return <div className="min-h-screen bg-[#F3F8FF] text-slate-900"><aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-linear-to-b from-blue-800 via-blue-700 to-blue-500 shadow-xl transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-20 items-center justify-between border-b border-white/10 px-5"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md ring-2 ring-white/80"><img src="/escudo-pio-xii.png" alt="Escudo Colegio Franciscano Pío XII" className="h-full w-full object-contain" /></div><div><p className="text-[17px] font-bold tracking-tight text-white">PioDocs<span className="text-amber-300">AI</span></p><p className="text-[12px] font-medium uppercase tracking-wider text-blue-200/80">Acompañamiento académico</p></div></div><button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-blue-200/80 lg:hidden"><X size={18} /></button></div><nav className="flex flex-1 flex-col gap-1 px-3 py-6"><p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-widest text-blue-200/70">Navegación principal</p>{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setSelectedStudent(null); setMobileOpen(false) }} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${activeNav === label ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}><Icon size={18} className={activeNav === label ? 'text-blue-600' : 'text-blue-300 group-hover:text-white'} />{label}</button>)}<div className="my-5 border-t border-white/10" /><p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-widest text-blue-200/70">Sistema</p><button className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"><Settings size={18} className="text-blue-300" />Configuración</button><button className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"><CircleHelp size={18} className="text-blue-300" />Centro de ayuda</button></nav></aside><div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 lg:hidden"><Menu size={20} /></button><div><p className="text-xs text-slate-400">Colegio Franciscano Pío XII</p><h2 className="mt-0.5 text-base font-bold text-slate-900">{currentTitle}</h2></div></div><div className="flex items-center gap-2"><div className="relative hidden md:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudiante..." className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15" /></div><div className="ml-1 hidden h-8 w-px bg-slate-200 sm:block" /><div className="relative hidden sm:block"><button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-blue-50"><div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm shadow-blue-600/18 ring-1 ring-blue-100"><img src="/administrador.png" alt="Administrador" className="h-full w-full object-cover" /></div><ChevronDown size={15} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} /></button>{profileOpen && <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-blue-900/10">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-blue-100"><img src="/administrador.png" alt="Administrador" className="h-full w-full object-cover" /></div>
                    <div>
                      <p className="text-sm font-bold leading-tight text-slate-900">Administrador</p>
                      <p className="text-xs leading-tight text-slate-400">Cuenta institucional</p>
                    </div>
                  </div>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><Settings size={15} className="text-slate-400" />Configuración</button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><CircleHelp size={15} className="text-slate-400" />Centro de ayuda</button>
                </div>
              </>}</div></div></header><main className="p-4 md:p-8">{content}<div className="mt-8 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck size={14} className="shrink-0 text-blue-500" />Las predicciones son probabilísticas y no sustituyen el criterio profesional ni la conversación con cada estudiante.</div></main></div></div>
}
