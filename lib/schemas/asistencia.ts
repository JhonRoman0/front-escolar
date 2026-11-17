import { z } from "zod"


const accesoId = z.number().int().min(1).optional()
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)")

// ≡ AsistenciaRequest (@Valid del back). El back exige al menos una de las
// dos formas de código; idJustificacion solo aplica cuando el estado
// calculado es "Justificada" (el back lo valida, el front lo exige en UI).
export const asistenciaCodigoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "Ingresa el código del alumno")
    .max(50, "El código no puede superar 50 caracteres"),
})
export type AsistenciaCodigoValues = z.infer<typeof asistenciaCodigoSchema>

// ── Justificaciones (Fase 9) ─────────────────────────────────────────────

// ≡ JustificacionRequest. El back solo exige @NotBlank/@NotNull: la regla
// "no futura" es defensa extra del front (el back la aceptaría).
export const justificacionSchema = z
  .object({
    motivo: z
      .string()
      .trim()
      .min(1, "El motivo es requerido")
      .max(100, "Máximo 100 caracteres"),
    accesoId: accesoId.optional(),
  })
export type JustificacionValues = z.infer<typeof justificacionSchema>

// ── Días feriados (Fase 9) ───────────────────────────────────────────────

// ≡ DiaFeriadoRequest. El back NO valida duplicados (fecha + año): el form
// muestra una advertencia informativa sin bloquear.
export const diaFeriadoSchema = z.object({
  fecha,
  motivo: z
    .string()
    .trim()
    .min(1, "El motivo es requerido")
    .max(150, "Máximo 150 caracteres"),
  // Cada feriado es de un año escolar; la fecha debe caer dentro de él.
  idAnioEscolar: z.number({ error: "Elige el año escolar" }).int().min(1, "Elige el año escolar"),
  accesoId: accesoId.optional(),
})
export type DiaFeriadoValues = z.infer<typeof diaFeriadoSchema>

// ≡ JustificarRequest (PUT /asistencias/{id}/justificar, idJustificacion @NotNull)
export const justificarRequestSchema = z.object({
  idJustificacion: z.number().int().positive("Selecciona un motivo"),
})
export type JustificarRequestValues = z.infer<typeof justificarRequestSchema>
