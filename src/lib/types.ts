// Tipos del dominio — reflejan el esquema de Supabase (supabase/schema.sql)

export type Rol = 'docente' | 'coordinador'

export interface Profile {
  id: string
  nombre: string
  rol: Rol
  created_at: string
}

/** Definición de un item del checklist EPP (configurable por taller). */
export interface EppItem {
  clave: string
  etiqueta: string
  obligatorio: boolean
}

export interface Taller {
  id: string
  nombre: string
  sede: string | null
  docente_id: string
  epp_items: EppItem[]
  created_at: string
}

export interface Estudiante {
  id: string
  taller_id: string
  nombre: string
  rut: string | null
  created_at: string
}

export interface Clase {
  id: string
  taller_id: string
  fecha: string // YYYY-MM-DD
  tema: string | null
  docente_id: string
  created_at: string
}

/** Estado del checklist EPP de un registro: { [clave]: boolean } */
export type EppEstado = Record<string, boolean>

export interface Registro {
  id: string
  clase_id: string
  estudiante_id: string
  presente: boolean
  epp: EppEstado
  autorizado_ingreso: boolean
  observacion: string | null
  registrado_at: string
}

/** Datos necesarios para generar el acta (PDF o Excel) de una clase. */
export interface DatosActa {
  taller: Taller
  clase: Clase
  docenteNombre: string
  estudiantes: Estudiante[]
  registros: Record<string, Registro> // por estudiante_id
}

/** Checklist EPP por defecto al crear un taller. */
export const EPP_ITEMS_DEFAULT: EppItem[] = [
  { clave: 'zapato_seguridad', etiqueta: 'Zapato de seguridad', obligatorio: true },
  { clave: 'lentes', etiqueta: 'Lentes de seguridad', obligatorio: false },
  { clave: 'guantes', etiqueta: 'Guantes', obligatorio: false },
  { clave: 'casco', etiqueta: 'Casco', obligatorio: false },
]

/**
 * Genera una `clave` estable y única para un ítem de EPP a partir de su etiqueta.
 * La clave se crea una sola vez al agregar el ítem y NO cambia al renombrar la
 * etiqueta, para no romper los `registros.epp` ya guardados (indexados por clave).
 */
export function nuevaClaveEpp(etiqueta: string, existentes: string[]): string {
  const base =
    etiqueta
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `epp_${existentes.length + 1}`

  let clave = base
  let n = 2
  while (existentes.includes(clave)) {
    clave = `${base}_${n}`
    n++
  }
  return clave
}

/**
 * Un estudiante queda autorizado a ingresar si está presente y cumple
 * con todos los EPP marcados como obligatorios.
 */
export function calcularAutorizado(
  presente: boolean,
  epp: EppEstado,
  items: EppItem[],
): boolean {
  if (!presente) return false
  return items.filter((i) => i.obligatorio).every((i) => epp[i.clave] === true)
}
