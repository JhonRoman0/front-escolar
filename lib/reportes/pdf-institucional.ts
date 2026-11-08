import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import type { ColegioResponse } from "@/lib/api/portal"

/** Piezas comunes de los documentos del colegio en PDF: ficha de matrícula y boleta. */

export const AZUL: [number, number, number] = [0, 68, 151]
export const GRIS: [number, number, number] = [110, 110, 120]
export const DESTACADO: [number, number, number] = [223, 232, 248]
export const MARGEN = 14
const LOGO = 20

export function ultimaY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

/** Banda azul con el título de la sección; devuelve dónde sigue el contenido. */
export function bandaTitulo(doc: jsPDF, texto: string, y: number): number {
  const ancho = doc.internal.pageSize.getWidth() - MARGEN * 2
  doc.setFillColor(...AZUL)
  doc.rect(MARGEN, y, ancho, 6, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(255)
  doc.text(texto, MARGEN + 2, y + 4.2)
  doc.setTextColor(0)
  return y + 7
}

/** Pares etiqueta/valor en dos columnas. */
export function camposPdf(doc: jsPDF, filas: [string, string, string, string][], y: number, margenDerecho = MARGEN): void {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: margenDerecho },
    theme: "plain",
    body: filas,
    styles: { fontSize: 8.5, cellPadding: 1.1, overflow: "linebreak" },
    columnStyles: {
      0: { fontStyle: "bold", textColor: GRIS, cellWidth: 28 },
      2: { fontStyle: "bold", textColor: GRIS, cellWidth: 28 },
    },
  })
}

/** Logo y datos del colegio arriba, y el título del documento centrado. Devuelve dónde sigue. */
export function encabezadoInstitucional(
  doc: jsPDF,
  colegio: ColegioResponse | null,
  logo: string | null,
  tituloDocumento: string
): number {
  let x = MARGEN
  if (logo) {
    doc.addImage(logo, "JPEG", MARGEN, 12, LOGO, LOGO)
    x += LOGO + 4
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(colegio?.nombre ?? "Sistema Escolar", x, 17)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  const detalle = [
    colegio?.codigoColegio ? `Código: ${colegio.codigoColegio}` : null,
    colegio?.direccion,
    colegio?.telefono ? `Teléfono: ${colegio.telefono}` : null,
  ].filter((linea): linea is string => !!linea)
  detalle.forEach((linea, i) => doc.text(linea, x, 22 + i * 4))
  doc.setTextColor(0)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text(tituloDocumento, doc.internal.pageSize.getWidth() / 2, 42, { align: "center" })
  return 47
}

/** Líneas de firma repartidas a lo ancho; si no caben, van a una página nueva. */
export function firmasPdf(doc: jsPDF, desde: number, firmantes: { rol: string; nombre?: string }[]): void {
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  let y = desde + 24
  if (y > altoPagina - 32) {
    doc.addPage()
    y = 40
  }
  const separacion = 10
  const ancho = (anchoPagina - MARGEN * 2 - separacion * (firmantes.length - 1)) / firmantes.length
  doc.setDrawColor(90)
  firmantes.forEach(({ rol, nombre }, i) => {
    const x = MARGEN + i * (ancho + separacion)
    doc.line(x, y, x + ancho, y)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.text(rol, x + ancho / 2, y + 4, { align: "center" })
    if (nombre) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text(nombre, x + ancho / 2, y + 8, { align: "center", maxWidth: ancho })
    }
  })
}

/** Leyenda y fecha de emisión al pie de cada página. */
export function piePdf(doc: jsPDF, leyenda: string): void {
  const emitida = new Date().toLocaleString("es-PE")
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina)
    const y = doc.internal.pageSize.getHeight() - 10
    const centro = doc.internal.pageSize.getWidth() / 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(leyenda, centro, y, { align: "center" })
    doc.text(`Emitida: ${emitida}`, centro, y + 4, { align: "center" })
    doc.setTextColor(0)
  }
}

/**
 * Pasa la imagen a JPEG sobre fondo blanco, al tamaño pedido: jsPDF no admite todos
 * los formatos y un PNG transparente saldría con fondo negro. Si falla, sin imagen.
 */
export async function imagenParaPdf(
  url: string | null | undefined,
  ancho: number,
  alto: number,
  ajuste: "cubrir" | "contener"
): Promise<string | null> {
  if (!url) return null
  try {
    const respuesta = await fetch(url)
    if (!respuesta.ok) return null
    const imagen = await createImageBitmap(await respuesta.blob())
    const canvas = document.createElement("canvas")
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, ancho, alto)
    const escalas = [ancho / imagen.width, alto / imagen.height]
    const escala = ajuste === "cubrir" ? Math.max(...escalas) : Math.min(...escalas)
    const w = imagen.width * escala
    const h = imagen.height * escala
    ctx.drawImage(imagen, (ancho - w) / 2, (alto - h) / 2, w, h)
    return canvas.toDataURL("image/jpeg", 0.9)
  } catch {
    return null
  }
}

/** Logo del colegio listo para el PDF, o null si no hay. */
export function logoColegio(colegio: ColegioResponse | null): Promise<string | null> {
  return imagenParaPdf(colegio?.urlFoto, 240, 240, "contener")
}
