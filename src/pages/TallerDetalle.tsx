import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Clase, EppItem, Estudiante, Taller } from '../lib/types'
import { Button, Card, EmptyState, Spinner } from '../components/ui'
import EppEditor from '../components/EppEditor'
import { formatearRut, validarRut } from '../lib/rut'

export default function TallerDetalle() {
  const { tallerId } = useParams<{ tallerId: string }>()
  const { session } = useAuth()
  const [taller, setTaller] = useState<Taller | null>(null)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [clases, setClases] = useState<Clase[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!tallerId) return
    const [t, e, c] = await Promise.all([
      supabase.from('talleres').select('*').eq('id', tallerId).maybeSingle(),
      supabase.from('estudiantes').select('*').eq('taller_id', tallerId).order('nombre'),
      supabase.from('clases').select('*').eq('taller_id', tallerId).order('fecha', { ascending: false }),
    ])
    setTaller(t.data as Taller | null)
    setEstudiantes((e.data ?? []) as Estudiante[])
    setClases((c.data ?? []) as Clase[])
    setCargando(false)
  }, [tallerId])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (cargando) return <Spinner label="Cargando taller…" />
  if (!taller) return <EmptyState titulo="Taller no encontrado" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{taller.nombre}</h1>
        {taller.sede && <p className="text-sm text-slate-400">{taller.sede}</p>}
      </div>

      <SeccionEpp taller={taller} onCambio={cargar} />

      <SeccionClases
        tallerId={taller.id}
        docenteId={session!.user.id}
        clases={clases}
        hayEstudiantes={estudiantes.length > 0}
        onCambio={cargar}
      />

      <SeccionEstudiantes tallerId={taller.id} estudiantes={estudiantes} onCambio={cargar} />
    </div>
  )
}

/* ----------------------------- EPP del taller ----------------------------- */
function SeccionEpp({ taller, onCambio }: { taller: Taller; onCambio: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<EppItem[]>(taller.epp_items)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrir() {
    setItems(structuredClone(taller.epp_items))
    setError(null)
    setAbierto(true)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const { error } = await supabase
      .from('talleres')
      .update({ epp_items: items })
      .eq('id', taller.id)
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setAbierto(false)
    onCambio()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-700">
          <ShieldCheck size={18} className="text-brand-600" />
          EPP del taller
        </h2>
        {!abierto && (
          <Button variant="ghost" onClick={abrir}>
            Configurar
          </Button>
        )}
      </div>

      {abierto ? (
        <Card className="p-4">
          <EppEditor items={items} onChange={setItems} />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button variant="secondary" onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-3">
          <div className="flex flex-wrap gap-2">
            {taller.epp_items.map((item) => (
              <span
                key={item.clave}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {item.etiqueta}
                {item.obligatorio && <span className="text-accent-500">*</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            <span className="text-accent-500">*</span> obligatorio para autorizar el ingreso.
          </p>
        </Card>
      )}
    </section>
  )
}

/* ------------------------------- Clases ------------------------------- */
function SeccionClases({
  tallerId,
  docenteId,
  clases,
  hayEstudiantes,
  onCambio,
}: {
  tallerId: string
  docenteId: string
  clases: Clase[]
  hayEstudiantes: boolean
  onCambio: () => void
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tema, setTema] = useState('')
  const [abierto, setAbierto] = useState(false)

  async function crearClase(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('clases')
      .insert({ taller_id: tallerId, fecha, tema: tema.trim() || null, docente_id: docenteId })
    if (!error) {
      setTema('')
      setAbierto(false)
      onCambio()
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700">Clases</h2>
        <Button variant="ghost" onClick={() => setAbierto((v) => !v)} disabled={!hayEstudiantes}>
          {abierto ? <X size={16} /> : <Plus size={16} />}
          {abierto ? 'Cancelar' : 'Nueva clase'}
        </Button>
      </div>

      {!hayEstudiantes && (
        <p className="text-sm text-slate-400 mb-2">
          Primero agrega estudiantes para poder crear una clase.
        </p>
      )}

      {abierto && (
        <Card className="p-4 mb-3">
          <form onSubmit={crearClase} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-medium text-slate-600">Tema (opcional)</span>
              <input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ej: Medición con multímetro"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <Button type="submit">Crear</Button>
          </form>
        </Card>
      )}

      {clases.length === 0 ? (
        <Card>
          <EmptyState titulo="Sin clases registradas" />
        </Card>
      ) : (
        <div className="grid gap-2">
          {clases.map((c) => (
            <Link key={c.id} to={`/clase/${c.id}`}>
              <Card className="p-3 hover:shadow-md transition flex items-center gap-3">
                <CalendarDays size={20} className="text-brand-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">
                    {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {c.tema && <p className="text-sm text-slate-400 truncate">{c.tema}</p>}
                </div>
                <span className="flex items-center gap-1 text-sm text-brand-600 font-medium shrink-0">
                  <ClipboardCheck size={16} />
                  Pasar lista
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

/* ----------------------------- Estudiantes ---------------------------- */
function SeccionEstudiantes({
  tallerId,
  estudiantes,
  onCambio,
}: {
  tallerId: string
  estudiantes: Estudiante[]
  onCambio: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const nombreRef = useRef<HTMLInputElement>(null)

  // Agrega un estudiante a la vez; el formulario queda listo para el siguiente.
  async function agregar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) return
    if (!validarRut(rut)) {
      setError('Ingresa un RUT válido (ej: 12.345.678-5)')
      return
    }
    setGuardando(true)
    const { error } = await supabase
      .from('estudiantes')
      .insert({ taller_id: tallerId, nombre: nombre.trim(), rut: formatearRut(rut) })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setNombre('')
    setRut('')
    nombreRef.current?.focus()
    onCambio()
  }

  async function eliminar(id: string) {
    await supabase.from('estudiantes').delete().eq('id', id)
    onCambio()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700">Estudiantes ({estudiantes.length})</h2>
        <Button variant="ghost" onClick={() => setAbierto((v) => !v)}>
          {abierto ? <X size={16} /> : <Plus size={16} />}
          {abierto ? 'Cancelar' : 'Agregar'}
        </Button>
      </div>

      {abierto && (
        <Card className="p-4 mb-3">
          <form onSubmit={agregar} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Nombre completo *</span>
                <input
                  ref={nombreRef}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">RUT *</span>
                <input
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  onBlur={(e) => {
                    if (validarRut(e.target.value)) setRut(formatearRut(e.target.value))
                  }}
                  placeholder="Ej: 12.345.678-5"
                  required
                  inputMode="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={guardando}>
                <Plus size={16} />
                {guardando ? 'Agregando…' : 'Agregar estudiante'}
              </Button>
              <span className="text-xs text-slate-400">
                Se agrega uno y el formulario queda listo para el siguiente.
              </span>
            </div>
          </form>
        </Card>
      )}

      {estudiantes.length === 0 ? (
        <Card>
          <EmptyState titulo="Sin estudiantes" descripcion="Agrega la lista del taller." />
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {estudiantes.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-slate-800">{e.nombre}</p>
                {e.rut && <p className="text-xs text-slate-400">{e.rut}</p>}
              </div>
              <button
                onClick={() => eliminar(e.id)}
                className="text-slate-300 hover:text-accent-500 transition"
                aria-label="Eliminar estudiante"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </section>
  )
}
