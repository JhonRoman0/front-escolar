import jsPDF from "jspdf"
import autoTable, { type RowInput } from "jspdf-autotable"

import type { ColegioResponse } from "@/lib/api/colegio"
import type { CursoEvaluable, EvaluacionDetalle } from "@/lib/api/evaluaciones"
import { formatearFecha } from "@/lib/fechas"
import {
  AZUL,
  bandaTitulo,
  camposPdf,
  encabezadoInstitucional,
  GRIS,
  MARGEN,
  piePdf,
  ultimaY,
} from "./pdf-institucional"

function nombreCurso(curso: CursoEvaluable): string {
  return curso.area ? `${curso.curso} (${curso.area})` : curso.curso
}

function siguienteY(doc: jsPDF, desde: number, altoReservado: number): number {
  const limite = doc.internal.pageSize.getHeight() - MARGEN - 6
  if (desde + altoReservado > limite) {
    doc.addPage()
    return MARGEN + 2
  }
  return desde
}

export function generarPdfEvaluacion(
  detalle: EvaluacionDetalle,
  curso: CursoEvaluable,
  colegio: ColegioResponse | null,
  logo: string | null
): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const evaluacion = detalle.evaluacion
  const margenTabla = { left: MARGEN, right: MARGEN, bottom: MARGEN + 6 }

  let y = encabezadoInstitucional(doc, colegio, logo, "EVALUACIÓN")
  y = bandaTitulo(doc, "DATOS DE LA EVALUACIÓN", y)
  camposPdf(
    doc,
    [
      ["Evaluación", evaluacion.nombre, "Fecha", formatearFecha(evaluacion.fecha)],
      ["Curso", nombreCurso(curso), "Nivel", curso.nivel],
      ["Grado", curso.grado, "Sección", curso.seccion ?? "—"],
      ["Docente", curso.docente, "Periodo", `Periodo ${evaluacion.periodo}`],
    ],
    y
  )

  y = siguienteY(doc, ultimaY(doc) + 4, 14)
  y = bandaTitulo(doc, "COMPETENCIAS EVALUADAS", y)
  autoTable(doc, {
    startY: y,
    margin: margenTabla,
    theme: "plain",
    body: evaluacion.competencias.length
      ? evaluacion.competencias.map((c) => [`${c.codigo}. ${c.nombre}`])
      : [["—"]],
    styles: { fontSize: 8.5, cellPadding: 1, textColor: GRIS, overflow: "linebreak" },
  })

  y = siguienteY(doc, ultimaY(doc) + 4, 14)
  y = bandaTitulo(doc, "CALIFICACIONES", y)
  const cuerpo: RowInput[] = detalle.alumnos.length
    ? detalle.alumnos.map((alumno, i) => [i + 1, alumno.nombre, alumno.calificacion ?? "—"])
    : [[{ content: "No hay alumnos matriculados en esta sección.", colSpan: 3, styles: { halign: "center" } }]]
  autoTable(doc, {
    startY: y,
    margin: margenTabla,
    head: [["N.º", "Estudiante", "Calificación"]],
    body: cuerpo,
    styles: { fontSize: 8, cellPadding: 1.4, overflow: "linebreak" },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
  })

  piePdf(doc, "Documento interno del colegio.")
  const nombre = `evaluacion_${evaluacion.nombre}_${evaluacion.fecha}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
  doc.save(`${nombre}.pdf`)
  return nombre
}
