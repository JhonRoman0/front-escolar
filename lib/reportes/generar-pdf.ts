import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import type { AutorizacionRegistroResponse } from "@/lib/api/evaluacion"
import type {
  ReporteGeneralItem,
  NotaReporteItem,
  MatriculaReporteItem,
  AlumnoReporteItem,
  DocenteReporteItem,
  UsuarioReporteItem,
} from "@/lib/api/reportes"
import type {
  DistribucionGrado,
  TendenciaDia,
} from "@/lib/api/dashboard"
import type { EstadisticasResponse } from "@/lib/api/asistencia"
import { formatearFecha, formatearHora } from "@/lib/fechas"
import { contarEstados, fechaCorta, fechaHora } from "./formato"

// Paleta institucional (§6.1 de AGENTS.md): azul #004497 para encabezados.
const AZUL: [number, number, number] = [0, 68, 151]
const FILA_ALTERNA: [number, number, number] = [245, 247, 252]

type Orientacion = "portrait" | "landscape"

function nuevoDoc(orientacion: Orientacion): jsPDF {
  return new jsPDF({ orientation: orientacion, unit: "mm", format: "a4" })
}

function escribirEncabezado(
  doc: jsPDF,
  titulo: string,
  lineas: string[]
): number {
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(titulo, 14, 15)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  lineas.forEach((linea, i) => {
    doc.text(linea, 14, 22 + i * 5)
  })
  // Y donde puede empezar la tabla.
  return 26 + lineas.length * 5
}

function generarAhora(): string {
  return new Date().toLocaleString("es-PE")
}

// ── Asistencia general ───────────────────────────────────────────────────

export interface PdfAsistenciaOpciones {
  datos: ReporteGeneralItem[]
  inicio: string
  fin: string
  nombreColegio?: string
}

export function generarPdfAsistencia({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: PdfAsistenciaOpciones): void {
  const doc = nuevoDoc("landscape")
  const c = contarEstados(datos)

  const startY = escribirEncabezado(doc, "Reporte de Asistencia", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Puntuales: ${c.puntual} · Tardanzas: ${c.tardanza} · Justificadas: ${c.justificada} · Inasistencias: ${c.inasistencia}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
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
    ],
    body: datos.map((d) => [
      fechaCorta(d.fecha),
      formatearHora(d.horaEntrada),
      d.codigo ?? "—",
      d.alumno,
      d.gradoSeccion,
      d.estado,
      d.justificacion ?? "—",
      d.registradoPor ?? "—",
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-asistencia-${inicio}_${fin}.pdf`)
}

// ── Auditoría de códigos de autorización ─────────────────────────────────

export function generarPdfAutorizaciones({
  datos,
  nombreColegio = "Sistema Escolar",
}: {
  datos: AutorizacionRegistroResponse[]
  nombreColegio?: string
}): void {
  const doc = nuevoDoc("landscape")

  const usados = datos.filter((d) => d.estado === "USADA").length
  const activas = datos.filter((d) => d.estado === "ACTIVA").length

  const startY = escribirEncabezado(doc, "Auditoría de Códigos de Autorización", [
    nombreColegio,
    `Total de códigos: ${datos.length} (activos: ${activas}, usados: ${usados})`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
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
    ],
    body: datos.map((d) => [
      d.codigo ?? "—",
      d.emisor,
      d.destinatario || "—",
      fechaHora(d.fechaAsignacion),
      fechaHora(d.fechaGeneracion),
      fechaHora(d.fechaExpiracion),
      d.estado,
      d.consumidor ?? "—",
      fechaHora(d.fechaUso),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`auditoria-autorizaciones-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Resumen ejecutivo del panel ──────────────────────────────────────────

export interface PdfResumenOpciones {
  fecha: string
  estadisticas?: EstadisticasResponse
  tendencia?: TendenciaDia[]
  distribucion?: DistribucionGrado[]
  nombreColegio?: string
}

export function generarPdfResumen({
  fecha,
  estadisticas,
  tendencia,
  distribucion,
  nombreColegio = "Sistema Escolar",
}: PdfResumenOpciones): void {
  const doc = nuevoDoc("portrait")

  let startY = escribirEncabezado(doc, "Resumen Ejecutivo", [
    nombreColegio,
    `Fecha: ${fechaCorta(fecha)}`,
    `Generado: ${generarAhora()}`,
  ])

  // Sección 1: asistencia de hoy.
  if (estadisticas) {
    autoTable(doc, {
      startY,
      head: [["Asistencia de hoy", "Valor"]],
      body: [
        ["% de asistencia", `${estadisticas.porcentajeAsistencia}%`],
        ["Puntuales", String(estadisticas.presentes)],
        ["Tardanzas", String(estadisticas.tardanzas)],
        ["Justificadas", String(estadisticas.justificados)],
        ["Inasistencias", String(estadisticas.inasistencias)],
        ["Total esperado", String(estadisticas.totalEsperado)],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: FILA_ALTERNA },
      columnStyles: { 1: { halign: "right" } },
    })
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Sección 2: tendencia semanal.
  if (tendencia?.length) {
    autoTable(doc, {
      startY,
      head: [["Tendencia semanal", "Fecha", "% Asistencia"]],
      body: tendencia.map((t) => [
        t.dia,
        formatearFecha(t.fecha),
        t.porcentaje == null ? "sin clase" : `${t.porcentaje}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: FILA_ALTERNA },
      columnStyles: { 2: { halign: "right" } },
    })
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Sección 3: alumnos por grado.
  if (distribucion?.length) {
    autoTable(doc, {
      startY,
      head: [["Grado", "Alumnos matriculados"]],
      body: distribucion.map((d) => [d.grado, String(d.alumnos)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: FILA_ALTERNA },
      columnStyles: { 1: { halign: "right" } },
    })
  }

  doc.save(`resumen-ejecutivo-${fecha}.pdf`)
}

// ── Reportes nuevos (Fase 10 completa) ────────────────────────────────────

interface OpcionesReporte {
  inicio: string
  fin: string
  nombreColegio?: string
}

// ── Notas ────────────────────────────────────────────────────────────────

export function generarPdfNotas({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: OpcionesReporte & { datos: NotaReporteItem[] }): void {
  const doc = nuevoDoc("landscape")

  const startY = escribirEncabezado(doc, "Reporte de Notas", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
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
    ],
    body: datos.map((d) => [
      fechaCorta(d.fecha),
      d.alumno,
      d.codigo,
      d.curso,
      d.competencia,
      String(d.bimestre),
      d.calificacion,
      d.docente,
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-notas-${inicio}_${fin}.pdf`)
}

// ── Matrícula ────────────────────────────────────────────────────────────

export function generarPdfMatriculas({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: OpcionesReporte & { datos: MatriculaReporteItem[] }): void {
  const doc = nuevoDoc("landscape")

  const startY = escribirEncabezado(doc, "Reporte de Matrícula", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
      [
        "Alumno",
        "Código",
        "Grado y sección",
        "Fecha pago",
        "Monto",
        "Registro",
        "Registrado por",
      ],
    ],
    body: datos.map((d) => [
      d.alumno,
      d.codigo,
      d.gradoSeccion,
      d.fechaPago ? fechaCorta(d.fechaPago) : "—",
      d.montoPago != null ? `S/ ${d.montoPago.toFixed(2)}` : "—",
      fechaCorta(d.fechaRegistro),
      d.registradoPor,
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-matricula-${inicio}_${fin}.pdf`)
}

// ── Alumnos ──────────────────────────────────────────────────────────────

export function generarPdfAlumnos({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: OpcionesReporte & { datos: AlumnoReporteItem[] }): void {
  const doc = nuevoDoc("landscape")

  const startY = escribirEncabezado(doc, "Reporte de Alumnos", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
      [
        "Código",
        "Nombre",
        "DNI",
        "Grado y sección",
        "Apoderado",
        "Fecha ingreso",
      ],
    ],
    body: datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "—",
      d.gradoSeccion,
      d.apoderado,
      fechaCorta(d.fechaIngreso),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-alumnos-${inicio}_${fin}.pdf`)
}

// ── Docentes ─────────────────────────────────────────────────────────────

export function generarPdfDocentes({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: OpcionesReporte & { datos: DocenteReporteItem[] }): void {
  const doc = nuevoDoc("landscape")

  const startY = escribirEncabezado(doc, "Reporte de Docentes", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
      [
        "Código",
        "Nombre",
        "DNI",
        "Especialidad",
        "Grado académico",
        "Tipo contrato",
        "Fecha contratación",
      ],
    ],
    body: datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "—",
      d.especialidad ?? "—",
      d.gradoAcademico ?? "—",
      d.tipoContrato ?? "—",
      d.fechaContratacion ? fechaCorta(d.fechaContratacion) : "—",
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-docentes-${inicio}_${fin}.pdf`)
}

// ── Usuarios ─────────────────────────────────────────────────────────────

export function generarPdfUsuarios({
  datos,
  inicio,
  fin,
  nombreColegio = "Sistema Escolar",
}: OpcionesReporte & { datos: UsuarioReporteItem[] }): void {
  const doc = nuevoDoc("landscape")

  const startY = escribirEncabezado(doc, "Reporte de Usuarios", [
    nombreColegio,
    `Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`,
    `Total de registros: ${datos.length}`,
    `Generado: ${generarAhora()}`,
  ])

  autoTable(doc, {
    startY,
    head: [
      [
        "Código",
        "Nombre",
        "DNI",
        "Correo",
        "Fecha creación",
        "Roles",
      ],
    ],
    body: datos.map((d) => [
      d.codigo,
      d.nombre,
      d.documentoIdentidad ?? "—",
      d.gmail ?? "—",
      fechaCorta(d.fechaCreacion),
      d.roles.join(", "),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`reporte-usuarios-${inicio}_${fin}.pdf`)
}

// ── Horario Académico (grilla visual) ──────────────────────────────────

// Colores RGB para el PDF (mismos que la paleta web)
const COLORES_PDF: [number, number, number][] = [
  [219, 234, 254],   // blue-100
  [209, 250, 229],   // emerald-100
  [254, 243, 199],   // amber-100
  [254, 226, 226],   // rose-100
  [237, 233, 254],   // violet-100
  [207, 250, 254],   // cyan-100
  [255, 237, 213],   // orange-100
  [204, 251, 241],   // teal-100
]

function hashCursoPdf(nombre: string): number {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = ((hash << 5) - hash + nombre.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % COLORES_PDF.length
}

function aMinutosPdf(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function minutosAHoraPdf(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

interface HorarioPdfItem {
  diaSemana: number
  horaInicio: string
  horaFin: string
  curso: string
  docente: string
  aula: string
}

export function generarPdfHorario(
  horarios: HorarioPdfItem[],
  titulo: string,
  nombreColegio = "Sistema Escolar"
): void {
  const doc = nuevoDoc("landscape")
  const MINUTOS_SLOT = 30
  const NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

  // Calcular rango de horas
  let minMin = Infinity
  let maxMin = 0
  for (const h of horarios) {
    const ini = aMinutosPdf(h.horaInicio)
    const fin = aMinutosPdf(h.horaFin)
    if (ini < minMin) minMin = ini
    if (fin > maxMin) maxMin = fin
  }
  minMin = Math.floor(minMin / MINUTOS_SLOT) * MINUTOS_SLOT

  const slots: number[] = []
  for (let m = minMin; m < maxMin; m += MINUTOS_SLOT) slots.push(m)

  // Dimensiones del PDF (landscape A4: 297 x 210 mm)
  const MARGIN = 14
  const COL_HORA_W = 22
  const PAGE_W = 297
  const COL_DIA_W = (PAGE_W - MARGIN * 2 - COL_HORA_W) / 5
  const ROW_H = 14

  // Encabezado
  let y = escribirEncabezado(doc, "Horario Semanal", [
    nombreColegio,
    titulo,
    `Generado: ${generarAhora()}`,
  ])

  // Header de días
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  for (let i = 0; i < 5; i++) {
    const x = MARGIN + COL_HORA_W + i * COL_DIA_W
    doc.setFillColor(...AZUL)
    doc.rect(x, y, COL_DIA_W, 7, "F")
    doc.setTextColor(255, 255, 255)
    doc.text(NOMBRES[i], x + COL_DIA_W / 2, y + 5, { align: "center" })
  }
  // Celda "Hora"
  doc.setFillColor(...AZUL)
  doc.rect(MARGIN, y, COL_HORA_W, 7, "F")
  doc.setTextColor(255, 255, 255)
  doc.text("Hora", MARGIN + COL_HORA_W / 2, y + 5, { align: "center" })
  y += 7

  // Slots de tiempo
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)

  for (const slotMin of slots) {
    const slotY = y + (slotMin - minMin) / MINUTOS_SLOT * ROW_H

    // Columna hora
    doc.setFillColor(245, 247, 252)
    doc.rect(MARGIN, slotY, COL_HORA_W, ROW_H, "F")
    doc.setDrawColor(200, 200, 200)
    doc.rect(MARGIN, slotY, COL_HORA_W, ROW_H, "S")
    doc.setTextColor(100, 100, 100)
    doc.text(minutosAHoraPdf(slotMin), MARGIN + COL_HORA_W / 2, slotY + ROW_H / 2 + 1, {
      align: "center",
    })

    // Celdas de días
    for (let d = 0; d < 5; d++) {
      const x = MARGIN + COL_HORA_W + d * COL_DIA_W
      doc.setDrawColor(220, 220, 220)
      doc.rect(x, slotY, COL_DIA_W, ROW_H, "S")
    }
  }

  // Bloques de horarios
  for (const h of horarios) {
    if (h.diaSemana > 5) continue
    const diaIdx = h.diaSemana - 1

    const iniMin = aMinutosPdf(h.horaInicio)
    const finMin = aMinutosPdf(h.horaFin)
    const rowStart = Math.floor((iniMin - minMin) / MINUTOS_SLOT)
    const rowSpan = Math.round((finMin - iniMin) / MINUTOS_SLOT)

    const x = MARGIN + COL_HORA_W + diaIdx * COL_DIA_W
    const blockY = y + rowStart * ROW_H
    const blockH = rowSpan * ROW_H

    const colorIdx = hashCursoPdf(h.curso)
    const color = COLORES_PDF[colorIdx]

    // Fondo
    doc.setFillColor(...color)
    doc.roundedRect(x + 0.5, blockY + 0.5, COL_DIA_W - 1, blockH - 1, 2, 2, "F")

    // Borde
    doc.setDrawColor(color[0] - 30, color[1] - 30, color[2] - 30)
    doc.roundedRect(x + 0.5, blockY + 0.5, COL_DIA_W - 1, blockH - 1, 2, 2, "S")

    // Texto
    doc.setTextColor(30, 30, 30)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text(h.curso, x + 3, blockY + 4)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.text(h.docente, x + 3, blockY + 8)

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(5.5)
    doc.text(h.aula, x + 3, blockY + 11)
  }

  doc.save(`horario-semanal-${new Date().toISOString().slice(0, 10)}.pdf`)
}
