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

// CSV con separador ";" (Excel es-PE lo abre en columnas sin pasos extra)
// y BOM UTF-8 para que los acentos no se rompan.

const SEPARADOR = ";"

function celda(valor: string | null | undefined): string {
  const texto = valor ?? ""
  if (
    texto.includes(SEPARADOR) ||
    texto.includes('"') ||
    texto.includes("\n")
  ) {
    return `"${texto.replaceAll('"', '""')}"`
  }
  return texto
}

function descargarCsv(encabezados: string[], filas: string[][], nombre: string) {
  const lineas = [encabezados, ...filas]
    .map((fila) => fila.map(celda).join(SEPARADOR))
    .join("\r\n")

  const blob = new Blob([`\uFEFF${lineas}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

// ── Asistencia general ───────────────────────────────────────────────────

export function generarCsvAsistencia({
  datos,
  inicio,
  fin,
}: {
  datos: ReporteGeneralItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Fecha",
      "Hora",
      "Código",
      "Alumno",
      "Grado y sección",
      "Estado",
      "Justificación",
      "Registrado por",
    ],
    datos.map((d) => [
      fechaCorta(d.fecha),
      formatearHora(d.horaEntrada),
      d.codigo ?? "",
      d.alumno,
      d.gradoSeccion,
      d.estado,
      d.justificacion ?? "",
      d.registradoPor ?? "",
    ]),
    `reporte-asistencia-${inicio}_${fin}.csv`
  )
}

// ── Auditoría de códigos de autorización ─────────────────────────────────

export function generarCsvAutorizaciones({
  datos,
}: {
  datos: AutorizacionRegistroResponse[]
}): void {
  descargarCsv(
    [
      "Código",
      "Emisor",
      "Destinatario",
      "Asignado",
      "Generado",
      "Vence",
      "Estado",
      "Consumidor",
      "Usado",
    ],
    datos.map((d) => [
      d.codigo ?? "",
      d.emisor,
      d.destinatario,
      fechaHora(d.fechaAsignacion),
      fechaHora(d.fechaGeneracion),
      fechaHora(d.fechaExpiracion),
      d.estado,
      d.consumidor ?? "",
      fechaHora(d.fechaUso),
    ]),
    `auditoria-autorizaciones-${new Date().toISOString().slice(0, 10)}.csv`
  )
}

// ── Notas ────────────────────────────────────────────────────────────────

export function generarCsvNotas({
  datos,
  inicio,
  fin,
}: {
  datos: NotaReporteItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Fecha",
      "Alumno",
      "Código",
      "Curso",
      "Competencia",
      "Bimestre",
      "Calificación",
      "Docente",
    ],
    datos.map((d) => [
      fechaCorta(d.fecha),
      d.alumno,
      d.codigo,
      d.curso,
      d.competencia,
      String(d.bimestre),
      d.calificacion,
      d.docente,
    ]),
    `reporte-notas-${inicio}_${fin}.csv`
  )
}

// ── Matrícula ────────────────────────────────────────────────────────────

export function generarCsvMatriculas({
  datos,
  inicio,
  fin,
}: {
  datos: MatriculaReporteItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Alumno",
      "Código",
      "Grado y sección",
      "Fecha pago",
      "Monto",
      "Registro",
      "Registrado por",
    ],
    datos.map((d) => [
      d.alumno,
      d.codigo,
      d.gradoSeccion,
      d.fechaPago ? fechaCorta(d.fechaPago) : "",
      d.montoPago != null ? `S/ ${d.montoPago.toFixed(2)}` : "",
      fechaCorta(d.fechaRegistro),
      d.registradoPor,
    ]),
    `reporte-matricula-${inicio}_${fin}.csv`
  )
}

// ── Alumnos ──────────────────────────────────────────────────────────────

export function generarCsvAlumnos({
  datos,
  inicio,
  fin,
}: {
  datos: AlumnoReporteItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Código",
      "Nombre",
      "DNI",
      "Grado y sección",
      "Apoderado",
      "Fecha ingreso",
    ],
    datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "",
      d.gradoSeccion,
      d.apoderado,
      fechaCorta(d.fechaIngreso),
    ]),
    `reporte-alumnos-${inicio}_${fin}.csv`
  )
}

// ── Docentes ─────────────────────────────────────────────────────────────

export function generarCsvDocentes({
  datos,
  inicio,
  fin,
}: {
  datos: DocenteReporteItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Código",
      "Nombre",
      "DNI",
      "Especialidad",
      "Grado académico",
      "Tipo contrato",
      "Fecha contratación",
    ],
    datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "",
      d.especialidad ?? "",
      d.gradoAcademico ?? "",
      d.tipoContrato ?? "",
      d.fechaContratacion ? fechaCorta(d.fechaContratacion) : "",
    ]),
    `reporte-docentes-${inicio}_${fin}.csv`
  )
}

// ── Usuarios ─────────────────────────────────────────────────────────────

export function generarCsvUsuarios({
  datos,
  inicio,
  fin,
}: {
  datos: UsuarioReporteItem[]
  inicio: string
  fin: string
}): void {
  descargarCsv(
    [
      "Código",
      "Nombre",
      "DNI",
      "Correo",
      "Fecha creación",
      "Roles",
    ],
    datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "",
      d.gmail ?? "",
      fechaCorta(d.fechaCreacion),
      d.roles.join(", "),
    ]),
    `reporte-usuarios-${inicio}_${fin}.csv`
  )
}
