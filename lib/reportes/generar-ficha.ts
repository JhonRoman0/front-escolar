import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { matriculasApi, type FichaMatricula } from "@/lib/api/matricula"
import { portalApi, type ColegioResponse } from "@/lib/api/portal"
import { edad, fechaCorta } from "./formato"
import {
  bandaTitulo as titulo,
  camposPdf as campos,
  DESTACADO,
  encabezadoInstitucional,
  firmasPdf,
  imagenParaPdf,
  logoColegio,
  MARGEN,
  piePdf,
  ultimaY,
} from "./pdf-institucional"

const FOTO = { ancho: 28, alto: 34 }

export interface ImagenesFicha {
  logo: string | null
  foto: string | null
}

function sexoTexto(sexo: string | null): string {
  if (!sexo) return "—"
  return sexo.charAt(0) + sexo.slice(1).toLowerCase()
}

export function generarPdfFicha(
  ficha: FichaMatricula,
  colegio: ColegioResponse | null,
  imagenes: ImagenesFicha
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const { alumno, matricula } = ficha

  let y = encabezadoInstitucional(doc, colegio, imagenes.logo, "FICHA DE MATRÍCULA")

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

  const principal = ficha.apoderados.find((a) => a.principal) ?? ficha.apoderados[0]
  firmasPdf(doc, ultimaY(doc), [
    { rol: "Apoderado(a)", nombre: principal?.nombre ?? "" },
    { rol: "Responsable de matrícula", nombre: ficha.registradoPor },
  ])
  piePdf(doc, "Documento interno del colegio. No reemplaza a la FUM emitida por SIAGIE.")
  doc.save(`ficha-matricula-${alumno.codigo}-${matricula.anio}.pdf`)
}

/** Sin colegio registrado la ficha sale igual, con el nombre del sistema. */
export async function descargarFicha(idMatricula: number): Promise<void> {
  const [ficha, colegio] = await Promise.all([
    matriculasApi.ficha(idMatricula),
    portalApi.colegio().catch(() => null),
  ])
  const [logo, foto] = await Promise.all([
    logoColegio(colegio),
    imagenParaPdf(ficha.alumno.urlFoto, 336, 408, "cubrir"),
  ])
  generarPdfFicha(ficha, colegio, { logo, foto })
}
