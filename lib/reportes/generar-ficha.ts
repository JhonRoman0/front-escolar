import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { matriculasApi, type FichaMatricula } from "@/lib/api/matricula"
import { portalApi, type ColegioResponse } from "@/lib/api/portal"
import { edad, fechaCorta } from "./formato"

const AZUL: [number, number, number] = [0, 68, 151]
const DESTACADO: [number, number, number] = [223, 232, 248]
const GRIS: [number, number, number] = [110, 110, 120]
const MARGEN = 14
const FOTO = { ancho: 28, alto: 34 }
const LOGO = 20

export interface ImagenesFicha {
  logo: string | null
  foto: string | null
}

function ultimaY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function sexoTexto(sexo: string | null): string {
  if (!sexo) return "—"
  return sexo.charAt(0) + sexo.slice(1).toLowerCase()
}

/** Banda azul con el título de la sección; devuelve dónde sigue el contenido. */
function titulo(doc: jsPDF, texto: string, y: number): number {
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
function campos(doc: jsPDF, filas: [string, string, string, string][], y: number, margenDerecho = MARGEN): void {
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

function encabezado(doc: jsPDF, colegio: ColegioResponse | null, logo: string | null): number {
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
  doc.text("FICHA DE MATRÍCULA", doc.internal.pageSize.getWidth() / 2, 42, { align: "center" })
  return 47
}

function firmas(doc: jsPDF, ficha: FichaMatricula, desde: number): void {
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  let y = desde + 24
  if (y > altoPagina - 32) {
    doc.addPage()
    y = 40
  }
  const principal = ficha.apoderados.find((a) => a.principal) ?? ficha.apoderados[0]
  const ancho = 70
  const columnas: [number, string, string][] = [
    [MARGEN, "Apoderado(a)", principal ? `${principal.nombre}` : ""],
    [anchoPagina - MARGEN - ancho, "Responsable de matrícula", ficha.registradoPor],
  ]
  doc.setDrawColor(90)
  for (const [x, rol, nombre] of columnas) {
    doc.line(x, y, x + ancho, y)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.text(rol, x + ancho / 2, y + 4, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(nombre, x + ancho / 2, y + 8, { align: "center", maxWidth: ancho })
  }
}

/** Fecha de emisión y leyenda al pie de cada página. */
function pie(doc: jsPDF): void {
  const emitida = new Date().toLocaleString("es-PE")
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina)
    const y = doc.internal.pageSize.getHeight() - 10
    const centro = doc.internal.pageSize.getWidth() / 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text("Documento interno del colegio. No reemplaza a la FUM emitida por SIAGIE.", centro, y, { align: "center" })
    doc.text(`Emitida: ${emitida}`, centro, y + 4, { align: "center" })
    doc.setTextColor(0)
  }
}

export function generarPdfFicha(
  ficha: FichaMatricula,
  colegio: ColegioResponse | null,
  imagenes: ImagenesFicha
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const { alumno, matricula } = ficha

  let y = encabezado(doc, colegio, imagenes.logo)

  // Alumno
  y = titulo(doc, "DATOS DEL ALUMNO", y)
  const yAlumno = y
  const margenFoto = imagenes.foto ? MARGEN + FOTO.ancho + 3 : MARGEN
  const anios = edad(alumno.fechaNacimiento)
  campos(
    doc,
    [
      ["Nombres", alumno.nombre, "Código", alumno.codigo],
      ["DNI", alumno.documentoIdentidad ?? "—", "Sexo", sexoTexto(alumno.sexo)],
      [
        "Fecha de nac.",
        alumno.fechaNacimiento ? fechaCorta(alumno.fechaNacimiento) : "—",
        "Edad",
        anios != null ? `${anios} años` : "—",
      ],
      ["Dirección", alumno.direccion ?? "—", "Discapacidad", alumno.discapacidad ?? "No"],
    ],
    y,
    margenFoto
  )
  y = ultimaY(doc)
  if (imagenes.foto) {
    doc.addImage(imagenes.foto, "JPEG", anchoPagina - MARGEN - FOTO.ancho, yAlumno + 1, FOTO.ancho, FOTO.alto)
    y = Math.max(y, yAlumno + FOTO.alto + 1)
  }

  // Matrícula desde la que se descargó
  y = titulo(doc, `MATRÍCULA ${matricula.anio}`, y + 4)
  campos(
    doc,
    [
      ["Nivel", matricula.nivel, "Grado y sección", matricula.gradoSeccion],
      ["Turno", matricula.turno, "Estado", matricula.estado],
      ["Fecha", ficha.fechaRegistro ? fechaCorta(ficha.fechaRegistro) : "—", "Responsable", ficha.registradoPor],
    ],
    y
  )

  // Apoderados
  y = titulo(doc, "APODERADOS", ultimaY(doc) + 4)
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Nombre", "DNI", "Parentesco", "Celular", "Correo", "Dirección"]],
    body: ficha.apoderados.length
      ? ficha.apoderados.map((a) => [
          a.principal ? `${a.nombre} (principal)` : a.nombre,
          a.documentoIdentidad ?? "—",
          a.parentesco ?? "—",
          a.celular ?? "—",
          a.gmail ?? "—",
          a.direccion ?? "—",
        ])
      : [[{ content: "Sin apoderados registrados", colSpan: 6, styles: { halign: "center" as const } }]],
    styles: { fontSize: 7.5, cellPadding: 1.3, overflow: "linebreak" },
    headStyles: { fillColor: [235, 238, 245], textColor: 40, fontStyle: "bold" },
  })

  // Trayectoria: toda la escolaridad en el colegio, con el año elegido resaltado
  y = titulo(doc, "TRAYECTORIA EN EL COLEGIO", ultimaY(doc) + 4)
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Año", "Nivel", "Grado y sección", "Turno", "Estado"]],
    body: ficha.trayectoria.map((t) => [t.anio, t.nivel, t.gradoSeccion, t.turno, t.estado]),
    styles: { fontSize: 8, cellPadding: 1.3 },
    headStyles: { fillColor: [235, 238, 245], textColor: 40, fontStyle: "bold" },
    didParseCell: ({ section, row, cell }) => {
      if (section === "body" && ficha.trayectoria[row.index]?.idMatricula === matricula.idMatricula) {
        cell.styles.fillColor = DESTACADO
        cell.styles.fontStyle = "bold"
      }
    },
  })

  firmas(doc, ficha, ultimaY(doc))
  pie(doc)
  doc.save(`ficha-matricula-${alumno.codigo}-${matricula.anio}.pdf`)
}

/**
 * Pasa la imagen a JPEG sobre fondo blanco, al tamaño pedido: jsPDF no admite todos
 * los formatos y un PNG transparente saldría con fondo negro. Si falla, sin imagen.
 */
async function imagenParaPdf(
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

/** Sin colegio registrado la ficha sale igual, con el nombre del sistema. */
export async function descargarFicha(idMatricula: number): Promise<void> {
  const [ficha, colegio] = await Promise.all([
    matriculasApi.ficha(idMatricula),
    portalApi.colegio().catch(() => null),
  ])
  const [logo, foto] = await Promise.all([
    imagenParaPdf(colegio?.urlFoto, 240, 240, "contener"),
    imagenParaPdf(ficha.alumno.urlFoto, 336, 408, "cubrir"),
  ])
  generarPdfFicha(ficha, colegio, { logo, foto })
}
