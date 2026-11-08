import jsPDF from "jspdf"
import autoTable, { type RowInput } from "jspdf-autotable"

import type { Boleta, AlumnoBoleta } from "@/lib/api/notas-finales"
import type { ColegioResponse } from "@/lib/api/portal"
import {
  bandaTitulo,
  camposPdf,
  DESTACADO,
  encabezadoInstitucional,
  firmasPdf,
  GRIS,
  MARGEN,
  piePdf,
  ultimaY,
} from "./pdf-institucional"

const LEYENDA_LITERAL = "AD: Logro destacado · A: Logro esperado · B: En proceso · C: En inicio"
const LEYENDA_VIGESIMAL = "Escala vigesimal: de 0 a 20"

/** "1.° bim." o "2.° trim." */
function columnaPeriodo(boleta: Boleta, numero: number): string {
  return `${numero}.° ${boleta.tipoPeriodo === "TRIMESTRE" ? "trim." : "bim."}`
}

function paginaAlumno(doc: jsPDF, boleta: Boleta, alumno: AlumnoBoleta, colegio: ColegioResponse | null, logo: string | null) {
  const { seccion } = boleta
  const actual = boleta.periodos.find((p) => p.numero === boleta.periodo)
  let y = encabezadoInstitucional(doc, colegio, logo, "BOLETA DE NOTAS")

  y = bandaTitulo(doc, "DATOS DEL ESTUDIANTE", y)
  camposPdf(
    doc,
    [
      ["Nombres", alumno.nombre, "Código", alumno.codigo],
      ["DNI", alumno.documentoIdentidad ?? "—", "Año escolar", seccion.anio],
      ["Nivel", seccion.nivel, "Grado y sección", `${seccion.grado}${seccion.seccion ? ` ${seccion.seccion}` : ""}`],
      ["Turno", seccion.turno, "Periodo", actual?.nombre ?? ""],
    ],
    y
  )

  // Una fila por área (franja) y debajo sus competencias con la nota de cada periodo.
  y = bandaTitulo(doc, "CALIFICACIONES", ultimaY(doc) + 4)
  const cuerpo: RowInput[] = []
  for (const area of boleta.areas) {
    cuerpo.push([
      {
        content: area.transversal ? `${area.nombre} (competencia transversal)` : area.nombre,
        colSpan: 1 + boleta.periodos.length,
        styles: { fillColor: [235, 238, 245], fontStyle: "bold" },
      },
    ])
    for (const c of area.competencias) {
      const notas = alumno.notas[c.idCompetencia] ?? {}
      cuerpo.push([`${c.codigo}. ${c.nombre}`, ...boleta.periodos.map((p) => notas[p.numero] ?? "—")])
    }
  }
  const columnaActual = boleta.periodos.findIndex((p) => p.numero === boleta.periodo) + 1
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Competencia", ...boleta.periodos.map((p) => columnaPeriodo(boleta, p.numero))]],
    body: cuerpo,
    styles: { fontSize: 7.5, cellPadding: 1.3, overflow: "linebreak" },
    headStyles: { fillColor: [235, 238, 245], textColor: 40, fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      boleta.periodos.map((_, i) => [i + 1, { cellWidth: 17, halign: "center" as const }])
    ),
    didParseCell: ({ section, column, cell }) => {
      if (section === "body" && column.index === columnaActual && cell.raw !== undefined && typeof cell.raw !== "object") {
        cell.styles.fillColor = DESTACADO
        cell.styles.fontStyle = "bold"
      }
    },
  })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text(boleta.escala === "LITERAL" ? LEYENDA_LITERAL : LEYENDA_VIGESIMAL, MARGEN, ultimaY(doc) + 4)
  doc.setTextColor(0)

  // Conclusiones del periodo de la boleta.
  y = bandaTitulo(doc, `CONCLUSIONES DESCRIPTIVAS · ${(actual?.nombre ?? "").toUpperCase()}`, ultimaY(doc) + 8)
  const conclusiones = boleta.areas.flatMap((area) =>
    area.competencias
      .filter((c) => alumno.conclusiones[c.idCompetencia])
      .map((c) => [`${area.nombre} · ${c.codigo}`, alumno.conclusiones[c.idCompetencia]])
  )
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    theme: "plain",
    body: conclusiones.length ? conclusiones : [[{ content: "Sin conclusiones descriptivas en este periodo.", colSpan: 2 }]],
    styles: { fontSize: 7.5, cellPadding: 1.2, overflow: "linebreak" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, textColor: GRIS } },
  })

  y = bandaTitulo(doc, `ASISTENCIA · ${(actual?.nombre ?? "").toUpperCase()}`, ultimaY(doc) + 4)
  const { puntual, tardanza, justificada, inasistencia } = alumno.asistencia
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Asistencias", "Tardanzas", "Faltas justificadas", "Faltas injustificadas"]],
    body: [[String(puntual), String(tardanza), String(justificada), String(inasistencia)]],
    styles: { fontSize: 8, cellPadding: 1.3, halign: "center" },
    headStyles: { fillColor: [235, 238, 245], textColor: 40, fontStyle: "bold" },
  })

  firmasPdf(doc, ultimaY(doc), [{ rol: "Tutor(a)" }, { rol: "Dirección" }, { rol: "Padre, madre o apoderado" }])
}

/** Una página (o más) por alumno; sin idMatricula, toda la sección en un solo PDF. */
export function generarPdfBoletas(
  boleta: Boleta,
  colegio: ColegioResponse | null,
  logo: string | null,
  idMatricula: number | null
): string {
  const alumnos = idMatricula ? boleta.alumnos.filter((a) => a.idMatricula === idMatricula) : boleta.alumnos
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  alumnos.forEach((alumno, i) => {
    if (i > 0) doc.addPage()
    paginaAlumno(doc, boleta, alumno, colegio, logo)
  })
  piePdf(doc, "Documento interno del colegio.")
  const { seccion } = boleta
  const sufijo = `${seccion.grado}_${seccion.seccion ?? "UNICA"}_${boleta.tipoPeriodo === "TRIMESTRE" ? "T" : "B"}${boleta.periodo}_${seccion.anio}`
  const nombre = (alumnos.length === 1 ? `boleta_${alumnos[0].codigo}_${sufijo}` : `boletas_${sufijo}`)
    .normalize("NFD")
    .replace(/[^A-Za-z0-9_.-]/g, "")
  doc.save(`${nombre}.pdf`)
  return nombre
}
