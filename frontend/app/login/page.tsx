'use client'

import { useState } from 'react'
import { Eye, EyeOff, GraduationCap, Lock, LogIn, User } from 'lucide-react'

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)

  function manejarSubmit(e: React.FormEvent) {
    e.preventDefault()
  }

  return <div className="flex min-h-screen bg-[#F3F8FF] text-slate-900">
    <aside className="relative hidden w-[38%] max-w-lg shrink-0 flex-col justify-between overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-blue-500 px-10 py-12 lg:flex">
      <GraduationCap size={220} strokeWidth={1} className="pointer-events-none absolute -right-10 top-24 text-white/10" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-300/15 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md ring-2 ring-white/80">
          <img src="/escudo-pio-xii.png" alt="Escudo Colegio Franciscano Pío XII" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-[17px] font-bold tracking-tight text-white">PioDocs<span className="text-amber-300">AI</span></p>
          <p className="text-[12px] font-medium uppercase tracking-wider text-blue-200/80">Acompañamiento académico</p>
        </div>
      </div>

      <div className="relative">
        <h1 className="text-4xl font-extrabold leading-tight text-white">Bienvenido/a<br />al Panel de<br />Acompañamiento</h1>
        <div className="mt-4 h-1 w-12 rounded-full bg-blue-300" />
        <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100/90">Tu espacio para dar seguimiento a tu rendimiento académico.</p>
      </div>

      <div className="relative grid w-fit grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/25" />)}
      </div>
    </aside>

    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl lg:left-auto lg:-right-10" />

      <div className="absolute left-4 top-4 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-md ring-2 ring-blue-100">
          <img src="/escudo-pio-xii.png" alt="Escudo Colegio Franciscano Pío XII" className="h-full w-full object-contain" />
        </div>
        <p className="text-[15px] font-bold tracking-tight text-slate-900">PioDocs<span className="text-blue-600">AI</span></p>
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-900/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-md shadow-blue-600/25">
          <User size={28} />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900">Iniciar sesión</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-6 text-slate-500">Ingresa tus credenciales para acceder a tu panel de acompañamiento académico.</p>

        <form onSubmit={manejarSubmit} className="mt-7 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><User size={14} className="text-slate-400" /> Usuario</label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={14} className="text-slate-400" /> Contraseña</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900"
          >
            <LogIn size={16} /> Iniciar sesión
          </button>
        </form>

        <a href="#" className="mt-4 block text-center text-sm font-semibold text-blue-600 transition hover:text-blue-700">¿Olvidaste tu contraseña?</a>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-400">
          <GraduationCap size={14} className="text-slate-400" /> PioDocsAI · Acompañamiento Académico
        </div>
      </div>
    </main>
  </div>
}
