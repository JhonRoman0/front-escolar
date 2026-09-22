import { crud } from "@/lib/api"

// ≡ JustificacionResponse (GET /justificaciones).
export interface JustificacionResponse {
  idJustificacion: number
  motivo: string
  documentoUrl: string | null
  fechaJustificacion: string | null
  accesoId: number | null
}

// ≡ JustificacionRequest (@Valid del back): motivo y fechaJustificacion
// obligatorios; documentoUrl y accesoId opcionales. El back NO valida que la
// fecha no sea futura → lo hace el schema zod del front.
export interface JustificacionRequest {
  motivo: string
  documentoUrl?: string | null
  fechaJustificacion: string
  accesoId?: number | null
}

export const justificacionesApi = crud<JustificacionResponse, JustificacionRequest>(
  "/justificaciones"
)
