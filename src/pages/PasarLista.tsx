import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  calcularAutorizado,
  type Clase,
  type DatosActa,
  type EppEstado,
  type Estudiante,
  type Registro,
  type Taller,
} from '../lib/types'
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui'

type Formato = 'excel' | 'pdf' | 'word'

/** Estado editable en memoria de un registro. */
type RegEstado = Pick<Registro, 'presente' | 'epp' | 'autorizado_ingreso' | 'observacion'>

export default function PasarLista() {
  const { claseId } = useParams<{ claseId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [clase, setClase] = useState<Clase | null>(null)
  const [taller, setTaller] = useState<Taller | null>(null)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [registros, setRegistros] = useState<Record<string, RegEstado>>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!claseId) return
    const claseRes = await supabase.from('clases').select('*').eq('id', claseId).maybeSingle()
    const cl = claseRes.data as Clase | null
    if (!cl) {
      setCargando(false)
      return
    }
    const [t, es, regs] = await Promise.all([
      supabase.from('talleres').select('*').eq('id', cl.taller_id).maybeSingle(),
      supabase.from('estudiantes').select('*').eq('taller_id', cl.taller_id).order('nombre'),
      supabase.from('registros').select('*').eq('clase_id', claseId),
    ])
    setClase(cl)
    setTaller(t.data as Taller | null)
    setEstudiantes((es.data ?? []) as Estudiante[])

    const map: Record<string, RegEstado> = {}
    for (const r of (regs.data ?? []) as Registro[]) {
      map[r.estudiante_id] = {
        presente: r.presente,
        epp: r.epp ?? {},
        autorizado_ingreso: r.autorizado_ingreso,
        observacion: r.observacion,
      }
    }
    setRegistros(map)
    setCargando(false)
  }, [claseId])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Aplica un cambio a un estudiante, recalcula "autorizado" y persiste (upsert).
  const actualizar = useCallback(
    async (estudianteId: string, patch: Partial<RegEstado>) => {
      if (!taller || !claseId) return
      const actual: RegEstado =
        registros[estudianteId] ??
        { presente: false, epp: {}, autorizado_ingreso: false, observacion: null }
      const fusionado: RegEstado = { ...actual, ...patch }
      fusionado.autorizado_ingreso = calcularAutorizado(
        fusionado.presente,
        fusionado.epp,
        taller.epp_items,
      )

      setRegistros((prev) => ({ ...prev, [estudianteId]: fusionado }))
      setGuardando(estudianteId)
      await supabase.from('registros').upsert(
        {
          clase_id: claseId,
          estudiante_id: estudianteId,
          presente: fusionado.presente,
          epp: fusionado.epp,
          autorizado_ingreso: fusionado.autorizado_ingreso,
          observacion: fusionado.observacion,
        },
        { onConflict: 'clase_id,estudiante_id' },
      )
      setGuardando(null)
    },
    [taller, claseId, registros],
  )

  const resumen = useMemo(() => {
    const vals = Object.values(registros)
    return {
      presentes: vals.filter((r) => r.presente).length,
      autorizados: vals.filter((r) => r.autorizado_ingreso).length,
    }
  }, [registros])

  const [exportando, setExportando] = useState<Formato | null>(null)

  function datosActa(): DatosActa | null {
    if (!taller || !clase) return null
    const regs: Record<string, Registro> = {}
    for (const e of estudiantes) {
      const r = registros[e.id]
      if (r) {
        regs[e.id] = {
          id: '',
          clase_id: clase.id,
          estudiante_id: e.id,
          presente: r.presente,
          epp: r.epp,
          autorizado_ingreso: r.autorizado_ingreso,
          observacion: r.observacion,
          registrado_at: '',
        }
      }
    }
    return { taller, clase, docenteNombre: profile?.nombre ?? '', estudiantes, registros: regs }
  }

  // Los generadores se cargan bajo demanda (dynamic import) para no pesar al inicio.
  async function exportar(formato: Formato) {
    const datos = datosActa()
    if (!datos) return
    setExportando(formato)
    try {
      if (formato === 'pdf') {
        const { exportarActaPdf } = await import('../lib/pdf')
        await exportarActaPdf(datos)
      } else if (formato === 'excel') {
        const { exportarActaExcel } = await import('../lib/excel')
        await exportarActaExcel(datos)
      } else {
        const { exportarActaWord } = await import('../lib/word')
        await exportarActaWord(datos)
      }
    } finally {
      setExportando(null)
    }
  }

  if (cargando) return <Spinner label="Cargando lista…" />
  if (!clase || !taller) return <EmptyState titulo="Clase no encontrada" />

  const fechaTxt = new Date(clase.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-brand-600 font-medium">{taller.nombre}</p>
        <h1 className="text-xl font-bold text-slate-800 capitalize">{fechaTxt}</h1>
        {clase.tema && <p className="text-sm text-slate-400">{clase.tema}</p>}
      </div>

      <Card className="p-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex gap-4">
          <span>
            Presentes: <strong>{resumen.presentes}</strong>/{estudiantes.length}
          </span>
          <span className="text-green-600">
            Autorizados: <strong>{resumen.autorizados}</strong>
          </span>
        </div>
        <ExportMenu
          disabled={estudiantes.length === 0}
          exportando={exportando}
          onExport={exportar}
        />
      </Card>

      {estudiantes.length === 0 ? (
        <Card>
          <EmptyState titulo="Este taller no tiene estudiantes" />
        </Card>
      ) : (
        <div className="space-y-3">
          {estudiantes.map((e) => (
            <FilaEstudiante
              key={e.id}
              estudiante={e}
              eppItems={taller.epp_items}
              estado={
                registros[e.id] ?? {
                  presente: false,
                  epp: {},
                  autorizado_ingreso: false,
                  observacion: null,
                }
              }
              guardando={guardando === e.id}
              onChange={(patch) => actualizar(e.id, patch)}
            />
          ))}
        </div>
      )}

      <div className="pt-2">
        <p className="text-center text-xs text-slate-400 mb-2">
          Los cambios se guardan automáticamente.
        </p>
        <Button className="w-full" onClick={() => navigate(`/taller/${taller.id}`)}>
          <CheckCircle2 size={18} />
          Listo, volver al taller
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------ Menú de export ----------------------------- */
function ExportMenu({
  disabled,
  exportando,
  onExport,
}: {
  disabled: boolean
  exportando: Formato | null
  onExport: (f: Formato) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const opciones = [
    { f: 'excel' as const, label: 'Excel (.xlsx)', Icon: FileSpreadsheet, color: 'text-green-600' },
    { f: 'pdf' as const, label: 'PDF (.pdf)', Icon: FileText, color: 'text-accent-600' },
    { f: 'word' as const, label: 'Word (.docx)', Icon: FileType2, color: 'text-brand-600' },
  ]

  return (
    <div className="relative">
      <Button
        variant="secondary"
        disabled={disabled || exportando !== null}
        onClick={() => setAbierto((v) => !v)}
      >
        {exportando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Exportar
      </Button>
      {abierto && !exportando && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => setAbierto(false)}
          />
          <div className="absolute right-0 mt-1 z-20 w-44 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            {opciones.map(({ f, label, Icon, color }) => (
              <button
                key={f}
                onClick={() => {
                  setAbierto(false)
                  onExport(f)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <Icon size={18} className={color} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* --------------------------- Fila de estudiante --------------------------- */
function FilaEstudiante({
  estudiante,
  eppItems,
  estado,
  guardando,
  onChange,
}: {
  estudiante: Estudiante
  eppItems: Taller['epp_items']
  estado: RegEstado
  guardando: boolean
  onChange: (patch: Partial<RegEstado>) => void
}) {
  function toggleEpp(clave: string) {
    const epp: EppEstado = { ...estado.epp, [clave]: !estado.epp[clave] }
    onChange({ epp })
  }

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        {/* Presente */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={estado.presente}
            onChange={(ev) => onChange({ presente: ev.target.checked })}
            className="w-5 h-5 accent-brand-600"
          />
        </label>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{estudiante.nombre}</p>
          {estudiante.rut && <p className="text-xs text-slate-400">{estudiante.rut}</p>}
        </div>

        {guardando ? (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" />
            guardando…
          </span>
        ) : estado.presente ? (
          estado.autorizado_ingreso ? (
            <Badge ok>
              <ShieldCheck size={13} />
              Puede ingresar
            </Badge>
          ) : (
            <Badge ok={false}>
              <ShieldAlert size={13} />
              No autorizado
            </Badge>
          )
        ) : (
          <span className="text-xs text-slate-400">ausente</span>
        )}
      </div>

      {estado.presente && (
        <div className="mt-3 pl-8 space-y-2">
          <div className="flex flex-wrap gap-2">
            {eppItems.map((item) => {
              const activo = estado.epp[item.clave] === true
              return (
                <button
                  key={item.clave}
                  type="button"
                  onClick={() => toggleEpp(item.clave)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition ${
                    activo
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-white border-slate-300 text-slate-500'
                  }`}
                >
                  {activo && <Check size={13} />}
                  {item.etiqueta}
                  {item.obligatorio && <span className="text-accent-500">*</span>}
                </button>
              )
            })}
          </div>
          <input
            defaultValue={estado.observacion ?? ''}
            onBlur={(ev) => {
              const v = ev.target.value.trim()
              if (v !== (estado.observacion ?? '')) onChange({ observacion: v || null })
            }}
            placeholder="Observación (opcional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
      )}
    </Card>
  )
}
