import { useState, type FormEvent } from 'react'
import { Mail, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { Button, Card } from '../components/ui'

// El botón de Google se muestra solo cuando el proveedor está configurado.
// Para activarlo: define VITE_ENABLE_GOOGLE=true en .env.local (y las credenciales en Supabase).
const googleHabilitado = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

export default function Login() {
  // 'magic' = enlace por correo (principal); 'password' = correo + contraseña (secundario)
  const [vista, setVista] = useState<'magic' | 'password'>('magic')
  const [modo, setModo] = useState<'ingresar' | 'registrar'>('ingresar')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  function limpiar() {
    setError(null)
    setMensaje(null)
  }

  async function enviarMagicLink(e: FormEvent) {
    e.preventDefault()
    limpiar()
    setCargando(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setCargando(false)
    if (error) setError(error.message)
    else
      setMensaje(
        `Te enviamos un enlace de acceso a ${email}. Ábrelo desde este mismo dispositivo para entrar.`,
      )
  }

  async function conPassword(e: FormEvent) {
    e.preventDefault()
    limpiar()
    setCargando(true)
    try {
      if (modo === 'ingresar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre } },
        })
        if (error) throw error
        if (!data.session) {
          setMensaje('Cuenta creada. Revisa tu correo para confirmar y luego ingresa.')
          setModo('ingresar')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setCargando(false)
    }
  }

  async function ingresarConGoogle() {
    limpiar()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-full grid place-items-center px-4 py-10 bg-gradient-to-b from-brand-600 to-brand-700">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-white text-brand-600 mb-3">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-bold">Registro EPP — AIEP</h1>
          <p className="text-white/80 text-sm mt-1">Control de seguridad y asistencia en talleres</p>
        </div>

        <Card className="p-6">
          {!supabaseConfigurado && (
            <p className="mb-4 text-sm bg-amber-50 text-amber-700 rounded-lg p-3">
              Falta configurar Supabase. Copia <code>.env.example</code> a{' '}
              <code>.env.local</code> con tus credenciales.
            </p>
          )}

          {googleHabilitado && (
            <>
              <button
                type="button"
                onClick={ingresarConGoogle}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <GoogleIcon />
                Continuar con Google
              </button>
              <div className="flex items-center gap-3 my-4 text-xs text-slate-400">
                <span className="flex-1 h-px bg-slate-200" />o
                <span className="flex-1 h-px bg-slate-200" />
              </div>
            </>
          )}

          {vista === 'magic' ? (
            <form onSubmit={enviarMagicLink} className="space-y-3">
              <Field
                label="Correo"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="docente@aiep.cl"
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {mensaje && <p className="text-sm text-green-600">{mensaje}</p>}
              <Button type="submit" disabled={cargando} className="w-full">
                <Mail size={16} />
                {cargando ? 'Enviando…' : 'Enviarme enlace de acceso'}
              </Button>
              <p className="text-center text-sm text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setVista('password')
                    limpiar()
                  }}
                  className="text-brand-600 hover:underline"
                >
                  Prefiero usar contraseña
                </button>
              </p>
            </form>
          ) : (
            <>
              <div className="flex rounded-lg bg-slate-100 p-1 mb-4 text-sm font-medium">
                <button
                  onClick={() => setModo('ingresar')}
                  className={`flex-1 rounded-md py-1.5 transition ${
                    modo === 'ingresar' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'
                  }`}
                >
                  Ingresar
                </button>
                <button
                  onClick={() => setModo('registrar')}
                  className={`flex-1 rounded-md py-1.5 transition ${
                    modo === 'registrar' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <form onSubmit={conPassword} className="space-y-3">
                {modo === 'registrar' && (
                  <Field
                    label="Nombre completo"
                    value={nombre}
                    onChange={setNombre}
                    placeholder="Ej: Rosario Pérez"
                    required
                  />
                )}
                <Field
                  label="Correo"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="docente@aiep.cl"
                  required
                />
                <Field
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {mensaje && <p className="text-sm text-green-600">{mensaje}</p>}
                <Button type="submit" disabled={cargando} className="w-full">
                  {cargando ? 'Procesando…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-400 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setVista('magic')
                    limpiar()
                  }}
                  className="text-brand-600 hover:underline"
                >
                  Entrar con enlace por correo
                </button>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </label>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.98 8.98 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
