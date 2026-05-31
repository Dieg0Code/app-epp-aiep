import * as XLSX from 'xlsx'
import type { DatosActa } from './types'
import { compartirArchivo } from './share'

/** Genera el acta de la clase en formato Excel (.xlsx) y la comparte/descarga. */
export async function exportarActaExcel({
  taller,
  clase,
  docenteNombre,
  estudiantes,
  registros,
}: DatosActa) {
  const items = taller.epp_items
  const fecha = new Date(clase.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Cada línea de info va en una sola celda (col A): se desborda sobre las
  // columnas vacías de al lado, sin pelear con el ancho del "#" de la tabla.
  const encabezado: (string | number)[][] = [
    ['AIEP — Registro de EPP y Asistencia'],
    [`Taller: ${taller.nombre}${taller.sede ? ` · Sede: ${taller.sede}` : ''}`],
    [`Fecha: ${fecha}`],
    [`Docente: ${docenteNombre}`],
    ...(clase.tema ? [[`Tema: ${clase.tema}`]] : []),
    [],
  ]

  const header = [
    '#',
    'Estudiante',
    'RUT',
    'Asistió',
    ...items.map((i) => i.etiqueta),
    'Autorizado',
    'Observación',
  ]

  const filas = estudiantes.map((e, idx) => {
    const r = registros[e.id]
    const epp = r?.epp ?? {}
    return [
      idx + 1,
      e.nombre,
      e.rut ?? '',
      r?.presente ? 'Sí' : 'No',
      ...items.map((i) => (epp[i.clave] ? 'Sí' : 'No')),
      r?.autorizado_ingreso ? 'Sí' : 'No',
      r?.observacion ?? '',
    ]
  })

  const presentes = estudiantes.filter((e) => registros[e.id]?.presente).length
  const autorizados = estudiantes.filter((e) => registros[e.id]?.autorizado_ingreso).length
  const pie: (string | number)[][] = [
    [],
    [`Total estudiantes: ${estudiantes.length}`],
    [`Presentes: ${presentes}`],
    [`Autorizados a ingresar: ${autorizados}`],
    [`Generado: ${new Date().toLocaleString('es-CL')}`],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...encabezado, header, ...filas, ...pie])
  ws['!cols'] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 14 },
    { wch: 8 },
    ...items.map(() => ({ wch: 16 })),
    { wch: 11 },
    { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filename = `acta_${slug(taller.nombre)}_${clase.fecha}.xlsx`
  await compartirArchivo(blob, filename, {
    title: `Acta ${taller.nombre} — ${clase.fecha}`,
    text: `Registro de EPP y asistencia · ${taller.nombre} · ${fecha}`,
  })
}

function slug(s: string) {
  return s.replace(/\s+/g, '_').replace(/[^\w-]/g, '')
}
