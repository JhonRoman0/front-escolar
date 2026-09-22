import { z } from "zod"

import { fechaHoyISO } from "@/lib/fechas"

const accesoId = z.number().int().min(1, "Selecciona un estado").max(3)
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
    documentoUrl: z
      .string()
      .trim()
      .max(200, "Máximo 200 caracteres")
      .optional()
      .or(z.literal("")),
    fechaJustificacion: fecha,
    accesoId: accesoId.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fechaJustificacion > fechaHoyISO()) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaJustificacion"],
        message: "La fecha no puede ser futura",
      })
    }
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
  idAnioEscolar: z.number().int().min(1).nullable().optional(),
  accesoId: accesoId.optional(),
})
export type DiaFeriadoValues = z.infer<typeof diaFeriadoSchema>
