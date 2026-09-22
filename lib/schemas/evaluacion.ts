import { z } from "zod"

// ── Calificación SIAGIE ───────────────────────────────────────────────────

const CALIFICACIONES_PRIMARIA_SECUNDARIA = ["AD", "A", "B", "C"] as const
const CALIFICACIONES_INICIAL = ["A", "B", "C"] as const

export const calificacionesPrimariaSecundaria = CALIFICACIONES_PRIMARIA_SECUNDARIA
export const calificacionesInicial = CALIFICACIONES_INICIAL

export function calificacionesPorNivel(idNivel: number): readonly string[] {
  return idNivel === 1 ? CALIFICACIONES_INICIAL : CALIFICACIONES_PRIMARIA_SECUNDARIA
}

// Schema para una calificación individual (se valida contra el catálogo del nivel)
export const calificacionLiteralSchema = z.string().min(1, "Selecciona una calificación")

// ── Nota individual ───────────────────────────────────────────────────────

export const notaSchema = z.object({
  idMatricula: z.number().int().positive(),
  calificacion: calificacionLiteralSchema,
  conclusionDescriptiva: z.string().max(200).optional().nullable(),
})

// ── Nota por lote (batch) ─────────────────────────────────────────────────

export const notaBatchSchema = z.object({
  idCompetencia: z.number().int().positive("Selecciona una competencia"),
  bimestre: z.number().int().min(1).max(4),
  notas: z
    .array(
      z.object({
        idMatricula: z.number().int().positive(),
        calificacion: calificacionLiteralSchema,
        conclusionDescriptiva: z.string().max(200).optional().nullable(),
      })
    )
    .min(1, "Debe haber al menos una nota"),
  codigoAutorizacion: z.string().optional().nullable(),
})

// ── Form de registro de notas (UI) ────────────────────────────────────────

export const registroNotasFormSchema = z.object({
  idGradoSeccion: z.number().int().min(0, "Selecciona un grado-sección"),
  idCurso: z.number().int().min(1, "Selecciona un curso"),
  idCompetencia: z.number().int().min(1, "Selecciona una competencia"),
  bimestre: z.number().int().min(1).max(4),
})

// ── Consolación descriptiva (requerida si calificacion = "C") ─────────────

export function esCalificacionC(calificacion: string): boolean {
  return calificacion.toUpperCase() === "C"
}

export const conclusionDescriptivaRequerida = z.string().min(1, "La conclusión descriptiva es obligatoria cuando la calificación es C").max(200)

export type NotaFormValues = z.infer<typeof notaSchema>
export type RegistroNotasFormValues = z.infer<typeof registroNotasFormSchema>
