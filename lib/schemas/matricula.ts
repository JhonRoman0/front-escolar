import { z } from "zod"

// ≡ MatriculaRequest (@Valid del back). idAlumno e idGradoSeccion obligatorios;
// solicitud 1 (pendiente), 2 (aprobada) o 3 (rechazada). fechaPago/montoPago
// requeridos al aprobar la solicitud; accesoId opcional (default 1 activo).
export const matriculaSchema = z
  .object({
    idAlumno: z.number().int().positive("Debe seleccionar un alumno"),
    idGradoSeccion: z
      .number()
      .int()
      .min(1, "Debe seleccionar un grado - sección"),
    solicitudMatricula: z.number().int().min(1).max(3),
    fechaPago: z.string().optional(),
    montoPago: z.number().min(0, "El monto no puede ser negativo").optional(),
    observaciones: z.string().max(500).optional(),
    motivo: z.string().trim().max(200).optional(),
    accesoId: z.number().int().min(1, "Selecciona un estado").max(3).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.solicitudMatricula === 2) {
      if (!val.fechaPago) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaPago"],
          message: "La fecha de pago es obligatoria al aprobar la solicitud",
        })
      }
      if (val.montoPago === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["montoPago"],
          message: "El monto de pago es obligatorio al aprobar la solicitud",
        })
      }
    }
  })
export type MatriculaValues = z.infer<typeof matriculaSchema>

export const matriculaDefault: MatriculaValues = {
  idAlumno: 0,
  idGradoSeccion: 0,
  solicitudMatricula: 1,
  motivo: "",
}