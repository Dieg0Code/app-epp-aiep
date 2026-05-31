import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const enInicio = pathname === '/'

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-brand-600 text-white sticky top-0 z-10 shadow">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
          {!enInicio && (
            <Link to="/" className="text-white/90 hover:text-white" aria-label="Volver al inicio">
              <ArrowLeft size={20} />
            </Link>
          )}
          <Link to="/" className="font-semibold tracking-tight flex items-center gap-2">
            <span className="inline-grid w-6 h-6 rounded-md bg-white text-brand-600 place-items-center">
              <ShieldCheck size={16} />
            </span>
            Registro EPP
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {profile && (
              <span className="hidden sm:inline text-white/90">
                {profile.nombre}
                <span className="ml-1 text-white/60">({profile.rol})</span>
              </span>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-3 py-1.5 transition"
            >
              <LogOut size={15} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-5">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        AIEP · Control de EPP y asistencia en talleres
      </footer>
    </div>
  )
}
