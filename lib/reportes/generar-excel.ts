import * as XLSX from "xlsx"

import type { AutorizacionRegistroResponse } from "@/lib/api/evaluacion"
import type {
  ReporteGeneralItem,
  NotaReporteItem,
  MatriculaReporteItem,
  AlumnoReporteItem,
  DocenteReporteItem,
  UsuarioReporteItem,
} from "@/lib/api/reportes"
import { formatearHora } from "@/lib/fechas"
import { fechaCorta, fechaHora } from "./formato"

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

// ── Matrícula ────────────────────────────────────────────────────────────

export function generarExcelMatriculas({
  datos,
  inicio,
  fin,
}: {
  datos: MatriculaReporteItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Alumno: d.alumno,
    Código: d.codigo,
    "Grado y sección": d.gradoSeccion,
    "Fecha pago": d.fechaPago ? fechaCorta(d.fechaPago) : "",
    Monto: d.montoPago ?? "",
    Registro: fechaCorta(d.fechaRegistro),
    "Registrado por": d.registradoPor,
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 22 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Matrícula")
  XLSX.writeFile(wb, `reporte-matricula-${inicio}_${fin}.xlsx`)
}

// ── Alumnos ──────────────────────────────────────────────────────────────

export function generarExcelAlumnos({
  datos,
  inicio,
  fin,
}: {
  datos: AlumnoReporteItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Código: d.codigo,
    Nombre: d.nombre,
    DNI: d.documentoIdentidad ?? "",
    "Grado y sección": d.gradoSeccion,
    Apoderado: d.apoderado,
    "Fecha ingreso": fechaCorta(d.fechaIngreso),
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 22 },
    { wch: 24 }, { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Alumnos")
  XLSX.writeFile(wb, `reporte-alumnos-${inicio}_${fin}.xlsx`)
}

// ── Docentes ─────────────────────────────────────────────────────────────

export function generarExcelDocentes({
  datos,
  inicio,
  fin,
}: {
  datos: DocenteReporteItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Código: d.codigo,
    Nombre: d.nombre,
    DNI: d.documentoIdentidad ?? "",
    Especialidad: d.especialidad ?? "",
    "Grado académico": d.gradoAcademico ?? "",
    "Tipo contrato": d.tipoContrato ?? "",
    "Fecha contratación": d.fechaContratacion ? fechaCorta(d.fechaContratacion) : "",
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 20 },
    { wch: 18 }, { wch: 16 }, { wch: 16 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Docentes")
  XLSX.writeFile(wb, `reporte-docentes-${inicio}_${fin}.xlsx`)
}

// ── Usuarios ─────────────────────────────────────────────────────────────

export function generarExcelUsuarios({
  datos,
  inicio,
  fin,
}: {
  datos: UsuarioReporteItem[]
  inicio: string
  fin: string
}): void {
  const filas = datos.map((d) => ({
    Código: d.codigo,
    Nombre: d.nombre,
    DNI: d.documentoIdentidad ?? "",
    Correo: d.gmail ?? "",
    "Fecha creación": fechaCorta(d.fechaCreacion),
    Roles: d.roles.join(", "),
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 24 },
    { wch: 14 }, { wch: 28 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios")
  XLSX.writeFile(wb, `reporte-usuarios-${inicio}_${fin}.xlsx`)
}
