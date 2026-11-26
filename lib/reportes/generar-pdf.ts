import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import type {
  ReporteGeneralItem,
  NotaReporteItem,
} from "@/lib/api/reportes"
import {
  MOTIVO_ASISTENCIA_TEXTO,
  type DistribucionGrado,
  type TendenciaDia,
} from "@/lib/api/dashboard"
import type { EstadisticasResponse } from "@/lib/api/asistencia"
import { dateAIso, formatearFecha, formatearHora } from "@/lib/fechas"
import { NOMBRE_SISTEMA } from "@/lib/navegacion"
import {
  MINUTOS_SLOT,
  NOMBRES_DIAS,
  aMinutos,
  agruparRecreos,
  camposTarjeta,
  colorCurso,
  diasHorarioVisibles,
  esDiaVisible,
  formatearRango,
  limitesHorario,
  minutosAHora,
  seleccionarLineasTarjeta,
  ticksHorario,
  type BloqueTemporal,
  type DatosClase,
  type FranjaRecreo,
  type LineaTarjeta,
  type PesoTexto,
} from "@/lib/horario"
import { celdaTexto, contarEstados, fechaCorta, type TablaReporte } from "./formato"
import { AZUL, GRIS, MARGEN, ultimaY } from "./pdf-institucional"

const FILA_ALTERNA: [number, number, number] = [245, 247, 252]
const TEXTO_CURSO_PDF: [number, number, number] = [30, 30, 30]
const COLOR_TICKS_GRILLA: [number, number, number] = [210, 210, 210]
const COLOR_LINEAS_GRILLA: [number, number, number] = [220, 220, 220]
const COLOR_FONDO_RECREO: [number, number, number] = [229, 231, 235]
const COLOR_TEXTO_RECREO: [number, number, number] = [90, 90, 90]
const ALTO_LINEA_PDF = 2.3
const SEPARACION_LINEAS_PDF = 0.15
const PADDING_X_PDF = 1.6
const PADDING_Y_PDF = 0.8
const TAMANO_CURSO_PDF = 6.5
const TAMANO_DETALLE_PDF = 5.5
const TAMANO_CURSO_AMPLIO_PDF = 7
const TAMANO_DETALLE_AMPLIO_PDF = 6.1
const ALTO_LINEA_AMPLIA_PDF = 2.7
const SEPARACION_LINEAS_AMPLIA_PDF = 0.2
const UMBRAL_ALTO_TARJETA_AMPLIA_PDF = 14
const TAMANO_HORA_PDF = 6.5
const DESPLAZAMIENTO_HORA_PDF = 0.5
const PADDING_DERECHA_HORA_PDF = 2
const ESPACIO_MINIMO_DETALLE_PDF = 30

interface EstiloTextoTarjetaPdf {
  tamanoCurso: number
  tamanoDetalle: number
  alturaLinea: number
  separacion: number
}

const ESTILO_TARJETA_COMPACTO_PDF: EstiloTextoTarjetaPdf = {
  tamanoCurso: TAMANO_CURSO_PDF,
  tamanoDetalle: TAMANO_DETALLE_PDF,
  alturaLinea: ALTO_LINEA_PDF,
  separacion: SEPARACION_LINEAS_PDF,
}

const ESTILO_TARJETA_AMPLIO_PDF: EstiloTextoTarjetaPdf = {
  tamanoCurso: TAMANO_CURSO_AMPLIO_PDF,
  tamanoDetalle: TAMANO_DETALLE_AMPLIO_PDF,
  alturaLinea: ALTO_LINEA_AMPLIA_PDF,
  separacion: SEPARACION_LINEAS_AMPLIA_PDF,
}

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
  doc.text(titulo, MARGEN, 15)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  lineas.forEach((linea, i) => {
    doc.text(linea, MARGEN, 22 + i * 5)
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
  nombreColegio = NOMBRE_SISTEMA,
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

// ── Resumen ejecutivo del panel ──────────────────────────────────────────

export interface PdfResumenOpciones {
  fecha: string
  anioEscolar?: string
  estadisticas?: EstadisticasResponse
  tendencia?: TendenciaDia[]
  distribucion?: DistribucionGrado[]
  nombreColegio?: string
}

export function generarPdfResumen({
  fecha,
  anioEscolar,
  estadisticas,
  tendencia,
  distribucion,
  nombreColegio = NOMBRE_SISTEMA,
}: PdfResumenOpciones): void {
  const doc = nuevoDoc("portrait")

  const lineasEncabezado = [nombreColegio, `Fecha: ${fechaCorta(fecha)}`]
  if (anioEscolar) lineasEncabezado.push(`Año escolar: ${anioEscolar}`)
  lineasEncabezado.push(`Generado: ${generarAhora()}`)
  let startY = escribirEncabezado(doc, "Resumen Ejecutivo", lineasEncabezado)

  // Sección 1: asistencia de hoy.
  if (estadisticas) {
    autoTable(doc, {
      startY,
      head: [["Asistencia de hoy", "Valor"]],
      body: [
        [
          "% de asistencia",
          estadisticas.totalEsperado > 0
            ? `${estadisticas.porcentajeAsistencia}%`
            : MOTIVO_ASISTENCIA_TEXTO["sin-datos"],
        ],
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
    startY = ultimaY(doc) + 10
  }

  // Sección 2: tendencia semanal.
  if (tendencia?.length) {
    autoTable(doc, {
      startY,
      head: [["Tendencia semanal", "Fecha", "% Asistencia"]],
      body: tendencia.map((t) => [
        t.dia,
        formatearFecha(t.fecha),
        t.motivo
          ? MOTIVO_ASISTENCIA_TEXTO[t.motivo]
          : `${t.porcentaje}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: FILA_ALTERNA },
      columnStyles: { 2: { halign: "right" } },
    })
    startY = ultimaY(doc) + 10
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
  nombreColegio = NOMBRE_SISTEMA,
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

// ── Usuarios, docentes, alumnos y matrícula ──────

export function generarPdfTabla(tabla: TablaReporte): void {
  const doc = nuevoDoc("landscape")
  const startY = escribirEncabezado(doc, tabla.titulo, tabla.encabezado)
  const anchoUtil = doc.internal.pageSize.getWidth() - MARGEN * 2
  const total = tabla.columnas.reduce((suma, c) => suma + c.ancho, 0)

  autoTable(doc, {
    startY,
    margin: { left: MARGEN, right: MARGEN },
    head: [tabla.columnas.map((c) => c.titulo)],
    body: tabla.filas.map((fila) => fila.map((valor, i) => celdaTexto(valor, tabla.columnas[i]))),
    columnStyles: Object.fromEntries(
      tabla.columnas.map((c, i) => [
        i,
        {
          cellWidth: (c.ancho / total) * anchoUtil,
          halign: c.tipo === "monto" ? ("right" as const) : ("left" as const),
        },
      ])
    ),
    // Con muchas columnas la letra baja para que los nombres no se partan tanto.
    styles: { fontSize: tabla.columnas.length > 10 ? 6.5 : 7.5, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
  })

  doc.save(`${tabla.archivo}.pdf`)
}

// ── Horario Académico (grilla visual) ──────────────────────────────────

export interface PaginaHorarioPdf {
  titulo: string
  horarios: readonly DatosClase[]
  recreos?: readonly BloqueTemporal[]
  vista?: "seccion" | "docente"
  horaEntrada?: string
  horaSalida?: string
}

interface GeometriaPdf {
  pageW: number
  pageH: number
  colHoraW: number
  colDiaW: number
}

interface CajaBloquePdf {
  x: number
  y: number
  ancho: number
  alto: number
}

interface BandaPdf {
  desde: number
  hasta: number
}

export function construirPdfHorario(paginas: readonly PaginaHorarioPdf[], nombreColegio = NOMBRE_SISTEMA): jsPDF {
  const doc = nuevoDoc("landscape")
  paginas.forEach((pagina, i) => {
    if (i > 0) doc.addPage()
    dibujarHorario(doc, pagina, nombreColegio)
  })
  return doc
}

export function generarPdfHorario(paginas: readonly PaginaHorarioPdf[], nombreColegio = NOMBRE_SISTEMA): void {
  construirPdfHorario(paginas, nombreColegio).save(`horario-semanal-${dateAIso(new Date())}.pdf`)
}

function fuentePorPeso(peso: PesoTexto): "bold" | "normal" {
  return peso === 700 ? "bold" : "normal"
}

function tamanoPorPeso(peso: PesoTexto, estilo: EstiloTextoTarjetaPdf = ESTILO_TARJETA_COMPACTO_PDF): number {
  return peso === 700 ? estilo.tamanoCurso : estilo.tamanoDetalle
}

function medirLineasPdf(
  doc: jsPDF,
  texto: string,
  ancho: number,
  peso: PesoTexto,
  estilo: EstiloTextoTarjetaPdf = ESTILO_TARJETA_COMPACTO_PDF,
): string[] {
  if (!texto) return []
  doc.setFont("helvetica", fuentePorPeso(peso))
  doc.setFontSize(tamanoPorPeso(peso, estilo))
  return doc.splitTextToSize(texto, Math.max(1, ancho)) as string[]
}

function truncarTextoPdf(
  doc: jsPDF,
  texto: string,
  ancho: number,
  peso: PesoTexto,
  estilo: EstiloTextoTarjetaPdf = ESTILO_TARJETA_COMPACTO_PDF,
): string {
  if (!texto) return texto
  doc.setFont("helvetica", fuentePorPeso(peso))
  doc.setFontSize(tamanoPorPeso(peso, estilo))
  const anchoUtil = Math.max(1, ancho)
  if (doc.getTextWidth(texto) <= anchoUtil) return texto

  const elipsis = "…"
  let resultado = ""
  for (const caracter of Array.from(texto)) {
    if (doc.getTextWidth(resultado + caracter + elipsis) > anchoUtil) break
    resultado += caracter
  }
  return `${resultado}${elipsis}`
}

function dibujarLineasBloquePdf(
  doc: jsPDF,
  lineas: readonly LineaTarjeta[],
  caja: CajaBloquePdf,
  estilo: EstiloTextoTarjetaPdf,
): void {
  if (!lineas.length) return

  const altoLineas = lineas.length * estilo.alturaLinea + Math.max(0, lineas.length - 1) * estilo.separacion
  const x = caja.x + PADDING_X_PDF
  let y = caja.y + Math.max(PADDING_Y_PDF, (caja.alto - altoLineas) / 2) + estilo.alturaLinea * 0.85

  for (const linea of lineas) {
    doc.setFont("helvetica", fuentePorPeso(linea.peso))
    doc.setFontSize(tamanoPorPeso(linea.peso, estilo))
    doc.setTextColor(...(linea.tipo === "curso" ? TEXTO_CURSO_PDF : GRIS))
    doc.text(linea.texto, x, y)
    y += estilo.alturaLinea + estilo.separacion
  }
}

function dibujarHorario(doc: jsPDF, pagina: PaginaHorarioPdf, nombreColegio: string): void {
  const { horarios, titulo, vista = "seccion" } = pagina
  const recreos = pagina.recreos ?? []
  const limites = limitesHorario(horarios, recreos, pagina.horaEntrada, pagina.horaSalida)
  if (!limites) return

  const diasVisibles = diasHorarioVisibles(horarios, recreos)
  const geometria: GeometriaPdf = {
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
    colHoraW: 22,
    colDiaW: 0,
  }
  geometria.colDiaW = (geometria.pageW - MARGEN * 2 - geometria.colHoraW) / diasVisibles.length

  const ordenados = [...horarios].sort((a, b) =>
    a.diaSemana - b.diaSemana ||
    aMinutos(a.horaInicio) - aMinutos(b.horaInicio) ||
    a.curso.localeCompare(b.curso),
  )
  const franjas = agruparRecreos(recreos)

  let y = escribirEncabezado(doc, "Horario Semanal", [
    nombreColegio,
    titulo,
    `Generado: ${generarAhora()}`,
  ])

  const altoParaBanda = geometria.pageH - MARGEN - y - 7 - 12
  const slotsPorBanda = Math.max(1, Math.floor(altoParaBanda / 5))
  const pasoBanda = MINUTOS_SLOT * slotsPorBanda
  const bandas: BandaPdf[] = []
  for (let desde = limites.min; desde < limites.max; desde += pasoBanda) {
    bandas.push({ desde, hasta: Math.min(limites.max, desde + pasoBanda) })
  }

  bandas.forEach((banda, idx) => {
    if (idx > 0) {
      doc.addPage()
      y = escribirEncabezado(doc, "Horario Semanal", [
        nombreColegio,
        titulo,
        `Continuación · ${formatearRango(banda.desde, banda.hasta)}`,
      ])
    }
    y = dibujarBanda(doc, banda, limites, ordenados, vista, franjas, diasVisibles, y, geometria)
  })

  const espacioRestante = geometria.pageH - MARGEN - y
  if (espacioRestante < ESPACIO_MINIMO_DETALLE_PDF) {
    doc.addPage()
    y = escribirEncabezado(doc, "Detalle del Horario", [nombreColegio, titulo])
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...AZUL)
    doc.text("Detalle del Horario", MARGEN, y)
    doc.setTextColor(0)
    y += 5
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text("La tabla complementa la grilla con sección y turno; la grilla muestra el detalle cuando el espacio lo permite.", MARGEN, y)
  y += 4

  const cuerpo: string[][] = ordenados.map((h) => {
    const campos = camposTarjeta(h, vista)
    return [
      campos.dia,
      campos.rango,
      `${campos.curso}\n${campos.seccion}`,
      campos.docente,
      campos.aula,
      campos.turno || "—",
    ]
  })

  for (const franja of franjas) {
    const desdeDia = Math.max(franja.desdeDia, 1)
    const hastaDia = Math.min(franja.hastaDia, diasVisibles[diasVisibles.length - 1])
    if (hastaDia < desdeDia) continue
    const dia = desdeDia === hastaDia
      ? NOMBRES_DIAS[desdeDia - 1]
      : `${NOMBRES_DIAS[desdeDia - 1]}–${NOMBRES_DIAS[hastaDia - 1]}`
    cuerpo.push([dia, franja.rango, "Recreo", "—", "—", "—"])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Día", "Hora", "Curso / Sección", "Docente", "Aula", "Turno"]],
    body: cuerpo,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 24 },
      2: { cellWidth: 82 },
      3: { cellWidth: 68 },
      4: { cellWidth: 30 },
      5: { cellWidth: 32 },
    },
    rowPageBreak: "avoid",
    showHead: "everyPage",
  })
}

function dibujarBanda(
  doc: jsPDF,
  banda: BandaPdf,
  limites: { min: number; max: number },
  horarios: readonly DatosClase[],
  vista: "seccion" | "docente",
  franjas: readonly FranjaRecreo[],
  diasVisibles: readonly number[],
  yInicio: number,
  geometria: GeometriaPdf,
): number {
  const { pageW, colHoraW, colDiaW } = geometria
  const slots = (banda.hasta - banda.desde) / MINUTOS_SLOT
  const altoDisponible = geometria.pageH - MARGEN - yInicio - 7 - 12
  const rowH = Math.min(14, altoDisponible / slots)
  const yGrid = yInicio + 7
  const altoGrilla = slots * rowH
  const xFin = pageW - MARGEN

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setFillColor(...AZUL)
  doc.rect(MARGEN, yInicio, colHoraW, 7, "F")
  doc.setTextColor(255)
  doc.text("Hora", MARGEN + colHoraW / 2, yInicio + 5, { align: "center" })
  diasVisibles.forEach((dia, i) => {
    const x = MARGEN + colHoraW + i * colDiaW
    doc.setFillColor(...AZUL)
    doc.rect(x, yInicio, colDiaW, 7, "F")
    doc.setTextColor(255)
    doc.text(NOMBRES_DIAS[dia - 1], x + colDiaW / 2, yInicio + 5, { align: "center" })
  })

  const posicionY = (min: number) => yGrid + ((min - banda.desde) / MINUTOS_SLOT) * rowH

  const ticks = ticksHorario({ min: banda.desde, max: banda.hasta })
  doc.setDrawColor(...COLOR_TICKS_GRILLA)
  for (const min of ticks.slice(0, -1)) {
    const ly = posicionY(min)
    doc.line(MARGEN + colHoraW, ly, xFin, ly)
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(TAMANO_HORA_PDF)
  doc.setTextColor(...GRIS)
  const xHora = MARGEN + colHoraW - PADDING_DERECHA_HORA_PDF
  ticks.forEach((min, idx) => {
    const primera = idx === 0
    const ultima = idx === ticks.length - 1
    const ly = posicionY(min)
    const yTexto = primera ? ly + DESPLAZAMIENTO_HORA_PDF : ultima ? ly - DESPLAZAMIENTO_HORA_PDF : ly
    const baseline = primera ? "top" : ultima ? "bottom" : "middle"
    doc.text(minutosAHora(min), xHora, yTexto, { align: "right", baseline })
  })

  doc.setDrawColor(...COLOR_LINEAS_GRILLA)
  doc.line(MARGEN, yGrid, MARGEN, yGrid + altoGrilla)
  for (let d = 0; d <= diasVisibles.length; d++) {
    const lx = MARGEN + colHoraW + d * colDiaW
    doc.line(lx, yGrid, lx, yGrid + altoGrilla)
  }
  doc.line(MARGEN, yGrid + altoGrilla, xFin, yGrid + altoGrilla)

  function caja(diaSemana: number, ini: number, fin: number) {
    if (!esDiaVisible(diaSemana)) return null
    const indiceDia = diasVisibles.indexOf(diaSemana)
    if (indiceDia < 0) return null
    const desde = Math.max(ini, banda.desde, limites.min)
    const hasta = Math.min(fin, banda.hasta, limites.max)
    if (hasta <= desde) return null
    return {
      x: MARGEN + colHoraW + indiceDia * colDiaW,
      y: posicionY(desde),
      ancho: colDiaW,
      alto: ((hasta - desde) / MINUTOS_SLOT) * rowH,
    }
  }

  for (const h of horarios) {
    const c = caja(h.diaSemana, aMinutos(h.horaInicio), aMinutos(h.horaFin))
    if (!c) continue
    const color = colorCurso(h.curso).rgb
    const radio = Math.min(1.5, Math.max(0.2, c.alto / 3))
    doc.setFillColor(...color)
    doc.roundedRect(c.x + 0.5, c.y + 0.5, c.ancho - 1, Math.max(1, c.alto - 1), radio, radio, "F")
    doc.setDrawColor(Math.max(0, color[0] - 30), Math.max(0, color[1] - 30), Math.max(0, color[2] - 30))
    doc.roundedRect(c.x + 0.5, c.y + 0.5, c.ancho - 1, Math.max(1, c.alto - 1), radio, radio, "S")

    const anchoContenido = Math.max(1, c.ancho - PADDING_X_PDF * 2)
    const altoContenido = Math.max(ALTO_LINEA_PDF, c.alto - PADDING_Y_PDF * 2)
    const estilo = altoContenido >= UMBRAL_ALTO_TARJETA_AMPLIA_PDF
      ? ESTILO_TARJETA_AMPLIO_PDF
      : ESTILO_TARJETA_COMPACTO_PDF
    const lineas = seleccionarLineasTarjeta(camposTarjeta(h, vista), {
      ancho: anchoContenido,
      alto: altoContenido,
      alturaLinea: estilo.alturaLinea,
      separacionLineas: estilo.separacion,
      medirLineas: (texto, ancho, peso) => medirLineasPdf(doc, texto, ancho, peso, estilo),
      truncarTexto: (texto, ancho, peso) => truncarTextoPdf(doc, texto, ancho, peso, estilo),
    })
    dibujarLineasBloquePdf(doc, lineas, c, estilo)
  }

  for (const franja of franjas) {
    const desdeDia = Math.max(franja.desdeDia, 1)
    const hastaDia = Math.min(franja.hastaDia, diasVisibles[diasVisibles.length - 1])
    if (hastaDia < desdeDia) continue
    const c = caja(desdeDia, franja.inicio, franja.fin)
    if (!c) continue
    const desdeIndice = diasVisibles.indexOf(desdeDia)
    const hastaIndice = diasVisibles.indexOf(hastaDia)
    if (desdeIndice < 0 || hastaIndice < desdeIndice) continue
    const ancho = (hastaIndice - desdeIndice + 1) * colDiaW
    doc.setFillColor(...COLOR_FONDO_RECREO)
    doc.rect(c.x + 0.5, c.y + 0.5, ancho - 1, Math.max(1, c.alto - 1), "F")
    if (c.alto >= 4.5) {
      const anchoContenido = Math.max(1, ancho - PADDING_X_PDF * 2)
      const maxLineas = Math.max(1, Math.floor((c.alto - PADDING_Y_PDF * 2) / ALTO_LINEA_PDF))
      const lineasRango = medirLineasPdf(doc, franja.rango, anchoContenido, 400)

      if (c.alto >= 7 && lineasRango.length > 0 && 1 + lineasRango.length <= maxLineas) {
        const totalLineas = 1 + lineasRango.length
        const altoTexto = totalLineas * ALTO_LINEA_PDF + (totalLineas - 1) * SEPARACION_LINEAS_PDF
        let yLinea = c.y + Math.max(PADDING_Y_PDF, (c.alto - altoTexto) / 2) + ALTO_LINEA_PDF * 0.85
        doc.setFont("helvetica", "bold")
        doc.setFontSize(5.8)
        doc.setTextColor(...COLOR_TEXTO_RECREO)
        doc.text("Recreo", c.x + ancho / 2, yLinea, { align: "center" })
        yLinea += ALTO_LINEA_PDF + SEPARACION_LINEAS_PDF
        doc.setFont("helvetica", "normal")
        doc.setFontSize(TAMANO_DETALLE_PDF)
        doc.setTextColor(...GRIS)
        for (const linea of lineasRango) {
          doc.text(linea, c.x + ancho / 2, yLinea, { align: "center" })
          yLinea += ALTO_LINEA_PDF + SEPARACION_LINEAS_PDF
        }
      } else {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(6)
        doc.setTextColor(...COLOR_TEXTO_RECREO)
        doc.text("Recreo", c.x + ancho / 2, c.y + c.alto / 2 + 1, { align: "center" })
      }
    }
  }

  return yGrid + altoGrilla + 4
}
