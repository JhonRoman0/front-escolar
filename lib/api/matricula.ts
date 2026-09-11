import { apiFetch } from "@/lib/api"
import type { Paginated } from "@/lib/api/seguridad"

// ── Historial de cambios de sección ─────────────────────────────────────

export interface HistorialResponse {
  idHistorial: number
  idGradoSeccion: number
  grado: string
  seccion: string
  turno: string
  idAnio: number
  fechaInicio: string
  fechaFinal: string | null
  motivo: string | null
}

// ── Matrícula ────────────────────────────────────────────────────────────

export interface MatriculaResponse {
  idMatricula: number
  idAlumno: number
  idAlumnoApoderado: number
  codigoAlumno: string
  alumno: string
  apoderado: string
  idUsuario: number
  usuarioRegistro: string
  idGradoSeccion: number
  grado: string
  seccion: string
  turno: string
  idAnio: number
  anio: string
  solicitudMatricula: number
  fechaPago: string | null
  montoPago: number | null
  acceso: number
  historial: HistorialResponse[]
}

export interface MatriculaRequest {
  idAlumno: number
  idGradoSeccion: number
  solicitudMatricula: number
  fechaPago?: string | null
  montoPago?: number | null
  acceso?: number | null
}

// ── API ──────────────────────────────────────────────────────────────────

export const matriculasApi = {
  async listar(page = 0, size = 10): Promise<Paginated<MatriculaResponse>> {
    return apiFetch<Paginated<MatriculaResponse>>(
      `/matriculas?page=${page}&size=${size}`
    )
  },
  async porId(id: number): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>(`/matriculas/${id}`)
  },
  async crear(data: MatriculaRequest): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>("/matriculas", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(
    id: number,
    data: MatriculaRequest
  ): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>(`/matriculas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async cambioSeccion(
    id: number,
    idGradoSeccion: number,
    motivo?: string
  ): Promise<MatriculaResponse> {
    const params = new URLSearchParams({ idGradoSeccion: String(idGradoSeccion) })
    if (motivo) params.set("motivo", motivo)
    return apiFetch<MatriculaResponse>(
      `/matriculas/${id}/cambio-seccion?${params.toString()}`,
      { method: "POST" }
    )
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/matriculas/${id}`, { method: "DELETE" })
  },
}