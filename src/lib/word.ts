import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { DatosActa } from './types'
import { compartirArchivo } from './share'

/** Genera el acta de la clase en formato Word (.docx) y la comparte/descarga. */
export async function exportarActaWord({
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

  const columnas = ['#', 'Estudiante', 'RUT', 'Asist.', ...items.map((i) => i.etiqueta), 'Autorizado', 'Obs.']

  const filaCabecera = new TableRow({
    tableHeader: true,
    children: columnas.map(
      (txt) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, fill: '073E85', color: 'auto' },
          children: [
            new Paragraph({ children: [new TextRun({ text: txt, bold: true, color: 'FFFFFF', size: 18 })] }),
          ],
        }),
    ),
  })

  const filasDatos = estudiantes.map((e, idx) => {
    const r = registros[e.id]
    const epp = r?.epp ?? {}
    const valores = [
      String(idx + 1),
      e.nombre,
      e.rut ?? '',
      r?.presente ? 'Sí' : 'No',
      ...items.map((i) => (epp[i.clave] ? 'Sí' : 'No')),
      r?.autorizado_ingreso ? 'Sí' : 'No',
      r?.observacion ?? '',
    ]
    return new TableRow({
      children: valores.map(
        (txt) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: txt, size: 18 })] })],
          }),
      ),
    })
  })

  const tabla = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [filaCabecera, ...filasDatos],
  })

  const presentes = estudiantes.filter((e) => registros[e.id]?.presente).length
  const autorizados = estudiantes.filter((e) => registros[e.id]?.autorizado_ingreso).length

  const linea = (text: string, bold = false) =>
    new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'AIEP — Registro de EPP y Asistencia', bold: true, size: 30, color: '073E85' }),
            ],
          }),
          linea(`Taller: ${taller.nombre}${taller.sede ? ` · Sede: ${taller.sede}` : ''}`),
          linea(`Fecha: ${fecha}`),
          linea(`Docente: ${docenteNombre}`),
          ...(clase.tema ? [linea(`Tema: ${clase.tema}`)] : []),
          new Paragraph({ text: '' }),
          tabla,
          new Paragraph({ text: '' }),
          linea(
            `Total estudiantes: ${estudiantes.length}  ·  Presentes: ${presentes}  ·  Autorizados a ingresar: ${autorizados}`,
            true,
          ),
          linea(`Generado: ${new Date().toLocaleString('es-CL')}`),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'Firma docente: ______________________________', size: 20 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `acta_${slug(taller.nombre)}_${clase.fecha}.docx`
  await compartirArchivo(blob, filename, {
    title: `Acta ${taller.nombre} — ${clase.fecha}`,
    text: `Registro de EPP y asistencia · ${taller.nombre} · ${fecha}`,
  })
}

function slug(s: string) {
  return s.replace(/\s+/g, '_').replace(/[^\w-]/g, '')
}
