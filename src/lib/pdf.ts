import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DatosActa } from './types'
import { compartirArchivo } from './share'

/** Genera el acta de la clase (asistencia + checklist EPP) y la comparte/descarga. */
export async function exportarActaPdf({
  taller,
  clase,
  docenteNombre,
  estudiantes,
  registros,
}: DatosActa) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const items = taller.epp_items

  // ---- Encabezado ----
  doc.setFontSize(16)
  doc.setTextColor('#073e85')
  doc.text('AIEP — Registro de EPP y Asistencia', 14, 16)

  doc.setFontSize(10)
  doc.setTextColor('#334155')
  const fecha = new Date(clase.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  doc.text(`Taller: ${taller.nombre}${taller.sede ? ` · Sede: ${taller.sede}` : ''}`, 14, 24)
  doc.text(`Fecha: ${fecha}`, 14, 29)
  doc.text(`Docente: ${docenteNombre}`, 14, 34)
  if (clase.tema) doc.text(`Tema: ${clase.tema}`, 14, 39)

  // ---- Tabla ----
  const head = [
    ['#', 'Estudiante', 'RUT', 'Asist.', ...items.map((i) => i.etiqueta), 'Autorizado', 'Observación'],
  ]

  const body = estudiantes.map((e, idx) => {
    const r = registros[e.id]
    const epp = r?.epp ?? {}
    return [
      String(idx + 1),
      e.nombre,
      e.rut ?? '',
      r?.presente ? 'Sí' : 'No',
      ...items.map((i) => (epp[i.clave] ? 'Sí' : 'No')),
      r?.autorizado_ingreso ? 'Sí' : 'No',
      r?.observacion ?? '',
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: clase.tema ? 44 : 39,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [7, 62, 133], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 8 } },
  })

  // ---- Pie con resumen y firma ----
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  const presentes = estudiantes.filter((e) => registros[e.id]?.presente).length
  const autorizados = estudiantes.filter((e) => registros[e.id]?.autorizado_ingreso).length

  doc.setFontSize(9)
  doc.setTextColor('#334155')
  doc.text(
    `Total estudiantes: ${estudiantes.length}   ·   Presentes: ${presentes}   ·   Autorizados a ingresar: ${autorizados}`,
    14,
    finalY,
  )
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 14, finalY + 5)
  doc.text('Firma docente: ______________________________', 14, finalY + 18)

  const filename = `acta_${slug(taller.nombre)}_${clase.fecha}.pdf`
  const blob = doc.output('blob')
  await compartirArchivo(blob, filename, {
    title: `Acta ${taller.nombre} — ${clase.fecha}`,
    text: `Registro de EPP y asistencia · ${taller.nombre} · ${fecha}`,
  })
}

function slug(s: string) {
  return s.replace(/\s+/g, '_').replace(/[^\w-]/g, '')
}
