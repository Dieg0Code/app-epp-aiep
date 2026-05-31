import { useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { EPP_ITEMS_DEFAULT, nuevaClaveEpp, type EppItem } from '../lib/types'
import { Button } from './ui'

/**
 * Editor controlado del checklist EPP de un taller.
 * No persiste nada: el componente padre decide cuándo guardar.
 */
export default function EppEditor({
  items,
  onChange,
}: {
  items: EppItem[]
  onChange: (items: EppItem[]) => void
}) {
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [nuevoObligatorio, setNuevoObligatorio] = useState(false)

  function editarEtiqueta(idx: number, etiqueta: string) {
    onChange(items.map((it, i) => (i === idx ? { ...it, etiqueta } : it)))
  }

  function toggleObligatorio(idx: number) {
    onChange(items.map((it, i) => (i === idx ? { ...it, obligatorio: !it.obligatorio } : it)))
  }

  function eliminar(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function agregar() {
    const etiqueta = nuevaEtiqueta.trim()
    if (!etiqueta) return
    const clave = nuevaClaveEpp(
      etiqueta,
      items.map((it) => it.clave),
    )
    onChange([...items, { clave, etiqueta, obligatorio: nuevoObligatorio }])
    setNuevaEtiqueta('')
    setNuevoObligatorio(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Checklist de EPP</span>
        <button
          type="button"
          onClick={() => onChange(structuredClone(EPP_ITEMS_DEFAULT))}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 transition"
        >
          <RotateCcw size={13} />
          Restaurar por defecto
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-slate-400">Sin ítems. Agrega al menos uno abajo.</p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.clave} className="flex items-center gap-2">
            <input
              value={item.etiqueta}
              onChange={(e) => editarEtiqueta(idx, e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={item.obligatorio}
                onChange={() => toggleObligatorio(idx)}
                className="w-4 h-4 accent-brand-600"
              />
              Obligatorio<span className="text-accent-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => eliminar(idx)}
              className="text-slate-300 hover:text-accent-500 transition shrink-0"
              aria-label="Eliminar EPP"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Agregar nuevo EPP */}
      <div className="flex items-center gap-2 pt-1">
        <input
          value={nuevaEtiqueta}
          onChange={(e) => setNuevaEtiqueta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          placeholder="Nuevo EPP (ej: Protector auditivo)"
          className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={nuevoObligatorio}
            onChange={(e) => setNuevoObligatorio(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          Obligatorio<span className="text-accent-500">*</span>
        </label>
        <Button type="button" variant="secondary" onClick={agregar} className="shrink-0">
          <Plus size={16} />
        </Button>
      </div>
    </div>
  )
}
