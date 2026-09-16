'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Loader2, Send, X } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, type ChartSpec, type ChatTurn } from '@/lib/api'

type Mensaje = ChatTurn & { chart?: ChartSpec | null; error?: boolean }

// Paleta academica vivida (azul institucional, coral, amarillo dorado) +
// esmeralda/violeta/turquesa auxiliares para series adicionales.
const COLORES = ['#1670FF', '#FB5072', '#FFBC2B', '#10b981', '#8b5cf6', '#14b8a6']

function chartAFilas(chart: ChartSpec) {
  return chart.etiquetas.map((etiqueta, i) => {
    const fila: Record<string, string | number> = { name: etiqueta }
    for (const serie of chart.series) fila[serie.nombre] = serie.valores[i] ?? 0
    return fila
  })
}

// 'dispersion' no usa 'etiquetas' como categorias: cada serie trae sus propios
// pares (x, y) en 'valores' / 'valores_y'.
function chartADispersion(chart: ChartSpec) {
  return chart.series.map((serie) => ({
    nombre: serie.nombre,
    puntos: serie.valores.map((x, i) => ({ x, y: serie.valores_y?.[i] ?? 0 })),
  }))
}

function GraficaDinamica({ chart }: { chart: ChartSpec }) {
  const filas = chartAFilas(chart)
  const esCircular = chart.tipo === 'dona' || chart.tipo === 'pastel'

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-600">{chart.titulo}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {esCircular ? (
            <PieChart>
              <Pie
                data={chart.etiquetas.map((etq, i) => ({ name: etq, value: chart.series[0]?.valores[i] ?? 0 }))}
                dataKey="value" nameKey="name"
                innerRadius={chart.tipo === 'dona' ? 45 : 0} outerRadius={75} paddingAngle={2}
              >
                {chart.etiquetas.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : chart.tipo === 'linea' ? (
            <LineChart data={filas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {chart.series.map((s, i) => (
                <Line key={s.nombre} type="monotone" dataKey={s.nombre} stroke={COLORES[i % COLORES.length]} strokeWidth={2} />
              ))}
            </LineChart>
          ) : chart.tipo === 'dispersion' ? (
            <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="x" name={chart.eje_x || undefined} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name={chart.eje_y || undefined} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {chartADispersion(chart).map((s, i) => (
                <Scatter key={s.nombre} name={s.nombre} data={s.puntos} fill={COLORES[i % COLORES.length]} />
              ))}
            </ScatterChart>
          ) : (
            <BarChart data={filas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {chart.series.map((s, i) => (
                <Bar key={s.nombre} dataKey={s.nombre} fill={COLORES[i % COLORES.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AssistantWidget() {
  const [abierto, setAbierto] = useState(false)
  const [avatarFalla, setAvatarFalla] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { role: 'assistant', content: 'Hola, soy Pío Docs, el asistente de PioDocsAI. Pregúntame sobre el riesgo académico de un curso, una materia o un estudiante, y puedo mostrarte una gráfica con los datos reales.' },
  ])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, abierto])

  async function enviar() {
    const texto = entrada.trim()
    if (!texto || enviando) return
    const historial: ChatTurn[] = mensajes.map(({ role, content }) => ({ role, content }))
    setMensajes((m) => [...m, { role: 'user', content: texto }])
    setEntrada('')
    setEnviando(true)
    try {
      const resp = await api.chat(texto, historial)
      setMensajes((m) => [...m, { role: 'assistant', content: resp.reply, chart: resp.chart }])
    } catch (err) {
      setMensajes((m) => [...m, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'No pude responder en este momento.',
        error: true,
      }])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {abierto && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[32rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-linear-to-r from-blue-600 to-blue-800 px-4 py-3 text-white">
            <BookOpen size={18} />
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">Pío Docs</p>
              <p className="text-[13px] leading-tight text-blue-100">Responde con tus datos reales</p>
            </div>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar Pío Docs" className="rounded-lg p-1 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-3">
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                  m.role === 'user' ? 'bg-linear-to-br from-blue-500 to-blue-700 text-white'
                  : m.error ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-white text-slate-700 border border-slate-200'
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.chart && <GraficaDinamica chart={m.chart} />}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Consultando los datos…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); enviar() }}
            className="flex items-center gap-2 border-t border-slate-100 p-2"
          >
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Ej: ¿cuáles son las materias con más riesgo?"
              disabled={enviando}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={enviando || !entrada.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30 transition hover:from-blue-600 hover:to-blue-800 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar Pío Docs' : 'Abrir Pío Docs'}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white transition hover:scale-105 ${abierto ? '' : 'animate-bot-bounce'}`}
      >
        {abierto ? (
          <X size={22} className="text-slate-700" />
        ) : avatarFalla ? (
          <BookOpen size={24} className="text-blue-600" />
        ) : (
          // Mismo logo que el favicon (public/icon.svg): libro abierto + grafica.
          <img
            src="/icon.svg"
            alt="Pío Docs"
            className="h-9 w-9 object-contain"
            onError={() => setAvatarFalla(true)}
          />
        )}
      </button>
    </>
  )
}
