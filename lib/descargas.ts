/** Descarga un archivo ya generado (Excel, PDF…) con el nombre indicado. */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}
