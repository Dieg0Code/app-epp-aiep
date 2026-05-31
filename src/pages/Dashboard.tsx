import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, HardHat, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { EPP_ITEMS_DEFAULT, type EppItem, type Taller } from '../lib/types'
import { Button, Card, EmptyState, Spinner } from '../components/ui'
import EppEditor from '../components/EppEditor'

export default function Dashboard() {
  const { session } = useAuth()
  const [talleres, setTalleres] = useState<Taller[]>([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [sede, setSede] = useState('')
  const [eppItems, setEppItems] = useState<EppItem[]>(() => structuredClone(EPP_ITEMS_DEFAULT))
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const { data, error } = await supabase
      .from('talleres')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTalleres((data ?? []) as Taller[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function crearTaller(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !session?.user) return
    setError(null)
    const { error } = await supabase.from('talleres').insert({
      nombre: nombre.trim(),
      sede: sede.trim() || null,
      docente_id: session.user.id,
      epp_items: eppItems,
    })
    if (error) {
      setError(error.message)
      return
    }
    setNombre('')
    setSede('')
    setEppItems(structuredClone(EPP_ITEMS_DEFAULT))
    setCreando(false)
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Mis talleres</h1>
        <Button onClick={() => setCreando((v) => !v)}>
          {creando ? <X size={16} /> : <Plus size={16} />}
          {creando ? 'Cancelar' : 'Nuevo taller'}
        </Button>
      </div>

      {creando && (
        <Card className="p-4 mb-4">
          <form onSubmit={crearTaller} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Nombre del taller *</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Instalaciones Eléctricas"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Sede</span>
                <input
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  placeholder="Ej: Sede Bellavista"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <EppEditor items={eppItems} onChange={setEppItems} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Crear taller</Button>
          </form>
        </Card>
      )}

      {cargando ? (
        <Spinner label="Cargando talleres…" />
      ) : talleres.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Aún no tienes talleres"
            descripcion="Crea tu primer taller para empezar a registrar EPP y asistencia."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {talleres.map((t) => (
            <Link key={t.id} to={`/taller/${t.id}`}>
              <Card className="p-4 hover:shadow-md transition flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
                  <HardHat size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{t.nombre}</p>
                  {t.sede && <p className="text-sm text-slate-400 truncate">{t.sede}</p>}
                </div>
                <ChevronRight size={20} className="text-slate-300 shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
