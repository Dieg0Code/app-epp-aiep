/**
 * Comparte (mobile) o descarga (desktop) un archivo generado.
 *
 * En móvil con soporte de Web Share API nivel 2, abre el menú nativo para
 * enviar el archivo por WhatsApp, correo, Drive, etc. Si no hay soporte
 * (o el navegador no permite compartir archivos), cae a una descarga normal.
 */
export async function compartirArchivo(
  blob: Blob,
  filename: string,
  meta: { title: string; text?: string },
): Promise<void> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }

  // Solo usamos el menú de compartir nativo en dispositivos táctiles (móvil/tablet).
  // En desktop, compartir abriría el diálogo de Windows ("conectar tu teléfono"),
  // que no es lo que se espera: ahí preferimos una descarga directa.
  const esTactil =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  if (esTactil && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text })
      return
    } catch (err) {
      // El usuario canceló el menú de compartir: no es un error a mostrar.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Cualquier otro problema: caemos a descarga.
    }
  }

  descargar(blob, filename)
}

function descargar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
