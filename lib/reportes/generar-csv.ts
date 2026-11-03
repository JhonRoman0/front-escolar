import type { AutorizacionRegistroResponse } from "@/lib/api/evaluacion"
import type {
  ReporteGeneralItem,
  NotaReporteItem,
} from "@/lib/api/reportes"
import { formatearHora } from "@/lib/fechas"
import { fechaCorta, fechaHora, type ColumnaReporte, type TablaReporte } from "./formato"

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

function descargarCsv(encabezados: string[], filas: string[][], nombre: string, previas: string[][] = []) {
  const lineas = [...previas, encabezados, ...filas]
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

// ── Usuarios, docentes, alumnos y matrícula ──────

/** Excel convierte "0000123" en 123 al abrir un CSV; ="..." lo mantiene como texto. */
function valorCsv(valor: string | number | null, columna: ColumnaReporte): string {
  if (valor == null || valor === "") return ""
  if (columna.tipo === "monto") return Number(valor).toFixed(2)
  if (columna.tipo === "codigo") return `="${valor}"`
  return String(valor)
}

export function generarCsvTabla(tabla: TablaReporte): void {
  const lineas = [[tabla.titulo], ...tabla.encabezado.map((linea) => [linea]), [""]]
  descargarCsv(
    tabla.columnas.map((c) => c.titulo),
    tabla.filas.map((fila) => fila.map((valor, i) => valorCsv(valor, tabla.columnas[i]))),
    `${tabla.archivo}.csv`,
    lineas
  )
}
