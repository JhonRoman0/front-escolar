import { crud } from "@/lib/api"

// ≡ JustificacionResponse (GET /justificaciones).
export interface JustificacionResponse {
  idJustificacion: number
  motivo: string
  /** Día en que se creó el motivo; lo pone el sistema. */
  fechaRegistro: string | null
  accesoId: number | null
}

// ≡ JustificacionRequest: solo el motivo (obligatorio) y el estado (opcional).
export interface JustificacionRequest {
  motivo: string
  accesoId?: number | null
}

export const justificacionesApi = crud<JustificacionResponse, JustificacionRequest>(
  "/justificaciones"
)
