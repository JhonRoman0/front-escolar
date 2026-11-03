import * as XLSX from "xlsx"

import type { AutorizacionRegistroResponse } from "@/lib/api/evaluacion"
import type {
  ReporteGeneralItem,
  NotaReporteItem,
} from "@/lib/api/reportes"
import { formatearHora } from "@/lib/fechas"
import { fechaCorta, fechaHora, type TablaReporte } from "./formato"

// ── Asistencia general ───────────────────────────────────────────────────

export function generarExcelAsistencia({
  datos,
  inicio,
  fin,
}: {
  datos: ReporteGeneralItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Fecha: fechaCorta(d.fecha),
    Hora: formatearHora(d.horaEntrada),
    Código: d.codigo ?? "",
    Alumno: d.alumno,
    "Grado y sección": d.gradoSeccion,
    Estado: d.estado,
    Justificación: d.justificacion ?? "",
    "Registrado por": d.registradoPor ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 22 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
  XLSX.writeFile(wb, `reporte-asistencia-${inicio}_${fin}.xlsx`)
}

// ── Auditoría de códigos de autorización ─────────────────────────────────

export function generarExcelAutorizaciones({
  datos,
}: {
  datos: AutorizacionRegistroResponse[]
}): void {
  const filas = datos.map((d) => ({
    Código: d.codigo ?? "",
    Emisor: d.emisor,
    Destinatario: d.destinatario,
    Asignado: fechaHora(d.fechaAsignacion),
    Generado: fechaHora(d.fechaGeneracion),
    Vence: fechaHora(d.fechaExpiracion),
    Estado: d.estado,
    Consumidor: d.consumidor ?? "",
    Usado: fechaHora(d.fechaUso),
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 17 }, { wch: 17 }, { wch: 17 }, { wch: 10 }, { wch: 24 }, { wch: 17 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Autorizaciones")
  XLSX.writeFile(
    wb,
    `auditoria-autorizaciones-${new Date().toISOString().slice(0, 10)}.xlsx`
  )
}

// ── Notas ────────────────────────────────────────────────────────────────

export function generarExcelNotas({
  datos,
  inicio,
  fin,
}: {
  datos: NotaReporteItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Fecha: fechaCorta(d.fecha),
    Alumno: d.alumno,
    Código: d.codigo,
    Curso: d.curso,
    Competencia: d.competencia,
    Bimestre: d.bimestre,
    Calificación: d.calificacion,
    Docente: d.docente,
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 22 },
    { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 24 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Notas")
  XLSX.writeFile(wb, `reporte-notas-${inicio}_${fin}.xlsx`)
}

// ── Usuarios, docentes, alumnos y matrícula ──────

export function generarExcelTabla(tabla: TablaReporte): void {
  const cabecera = [[tabla.titulo], ...tabla.encabezado.map((linea) => [linea]), []]
  const ws = XLSX.utils.aoa_to_sheet([
    ...cabecera,
    tabla.columnas.map((c) => c.titulo),
    ...tabla.filas.map((fila) => fila.map((valor) => valor ?? "")),
  ])
  ws["!cols"] = tabla.columnas.map((c) => ({ wch: c.ancho }))

  // Los montos quedan como número para poder sumarlos en Excel.
  tabla.filas.forEach((fila, f) => {
    tabla.columnas.forEach((columna, c) => {
      if (columna.tipo !== "monto" || fila[c] == null) return
      const celda = ws[XLSX.utils.encode_cell({ r: cabecera.length + 1 + f, c })]
      if (celda) {
        celda.t = "n"
        celda.v = Number(fila[c])
        celda.z = "#,##0.00"
      }
    })
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, tabla.hoja)
  XLSX.writeFile(wb, `${tabla.archivo}.xlsx`)
}
