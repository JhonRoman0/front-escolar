import type { EscalaCalificacion, EstadoPeriodo, TipoPeriodo } from "@/lib/api/academico"

/** Reglas de calificación compartidas por configuración, evaluaciones, notas y boleta. */

export const ESCALAS: { value: EscalaCalificacion; label: string; detalle: string }[] = [
  { value: "LITERAL", label: "Literal", detalle: "AD, A, B y C" },
  { value: "VIGESIMAL", label: "Vigesimal", detalle: "De 0 a 20" },
]

export const TIPOS_PERIODO: { value: TipoPeriodo; label: string; cantidad: number }[] = [
  { value: "BIMESTRE", label: "Bimestres", cantidad: 4 },
  { value: "TRIMESTRE", label: "Trimestres", cantidad: 3 },
]

export function cantidadPeriodos(tipo: TipoPeriodo): number {
  return TIPOS_PERIODO.find((t) => t.value === tipo)?.cantidad ?? 4
}

const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto"]

/** "Primer bimestre", igual que el backend. */
export function nombrePeriodo(tipo: TipoPeriodo, numero: number): string {
  return `${ORDINALES[numero - 1] ?? numero} ${tipo === "TRIMESTRE" ? "trimestre" : "bimestre"}`
}

export const ESTADO_PERIODO: Record<EstadoPeriodo, { texto: string; variant: "outline" | "success" | "secondary" }> = {
  POR_COMENZAR: { texto: "Por comenzar", variant: "outline" },
  ABIERTO: { texto: "Abierto", variant: "success" },
  CERRADO: { texto: "Cerrado", variant: "secondary" },
}

export interface RangoPeriodo {
  fechaInicio: string
  fechaFin: string
}

/**
 * Mismas reglas que el backend: completos, dentro del año, en orden y sin
 * solaparse. Devuelve un mensaje por periodo (null si está bien).
 */
export function erroresPeriodos(
  periodos: RangoPeriodo[],
  tipo: TipoPeriodo,
  inicioAnio: string | null,
  finAnio: string | null
): (string | null)[] {
  return periodos.map((p, i) => {
    const nombre = nombrePeriodo(tipo, i + 1).toLowerCase()
    if (!p.fechaInicio || !p.fechaFin) return "Indica las dos fechas"
    if (p.fechaFin < p.fechaInicio) return "Termina antes de empezar"
    if ((inicioAnio && p.fechaInicio < inicioAnio) || (finAnio && p.fechaFin > finAnio)) {
      return "Debe estar dentro del año escolar"
    }
    const anterior = periodos[i - 1]
    if (anterior?.fechaFin && p.fechaInicio <= anterior.fechaFin) {
      return `El ${nombre} debe empezar después del anterior`
    }
    return null
  })
}

export const LITERALES = ["AD", "A", "B", "C"] as const

/** Mismas reglas que el backend. Vacío no es error: significa sin nota. */
export function errorCalificacion(escala: EscalaCalificacion, valor: string): string | null {
  const texto = valor.trim().toUpperCase()
  if (!texto) return null
  if (escala === "LITERAL") {
    return (LITERALES as readonly string[]).includes(texto) ? null : "Debe ser AD, A, B o C"
  }
  return /^\d{1,2}$/.test(texto) && Number(texto) <= 20 ? null : "Debe ser de 0 a 20"
}

/** El periodo abierto hoy; si no hay, el último que ya empezó; si tampoco, el primero. */
export function periodoParaFiltro<T extends { numero: number; estado: EstadoPeriodo }>(periodos: T[]): T | undefined {
  return (
    periodos.find((p) => p.estado === "ABIERTO") ??
    [...periodos].reverse().find((p) => p.estado === "CERRADO") ??
    periodos[0]
  )
}

export const CONCLUSION_MINIMA = 10
export const CONCLUSION_MAXIMA = 500

/** B o C en literal; 12 o menos en vigesimal. */
export function requiereConclusion(escala: EscalaCalificacion, calificacion: string): boolean {
  const texto = calificacion.trim().toUpperCase()
  if (!texto || errorCalificacion(escala, texto)) return false
  return escala === "LITERAL" ? texto === "B" || texto === "C" : Number(texto) <= 12
}

/** Mismas reglas que el backend: obligatoria según la nota y de 10 a 500 caracteres. */
export function errorConclusion(escala: EscalaCalificacion, calificacion: string, conclusion: string): string | null {
  const texto = conclusion.trim()
  if (!texto) {
    return requiereConclusion(escala, calificacion)
      ? `Obligatoria con ${escala === "LITERAL" ? "B o C" : "12 o menos"}`
      : null
  }
  if (texto.length < CONCLUSION_MINIMA || texto.length > CONCLUSION_MAXIMA) {
    return `Debe tener entre ${CONCLUSION_MINIMA} y ${CONCLUSION_MAXIMA} caracteres`
  }
  return null
}
