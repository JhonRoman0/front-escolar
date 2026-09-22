import { apiFetch, type Paginated } from "@/lib/api"
import type { HijoHorario } from "@/lib/api/horario"

// ≡ EstadoAsistencia (catálogo sembrado en BD, ver GET /asistencias/estados)
export type EstadoAsistencia =
  | "Puntual"
  | "Tardanza"
  | "Inasistencia"
  | "Justificada"

// ── Registro por QR / código manual ──────────────────────────────────────

// ≡ AsistenciaRequest (@Valid del back). El back toma idUsuarioRegistro del
// JWT: NUNCA se envía en el body.
export interface AsistenciaRequest {
  /** Código manual del alumno (modal de código). */
  codigo?: string
  /** Contenido del QR del alumno (modal de cámara), ≡ AlumnoResponse.codigoHash. */
  codigoHash?: string
  /** Obligatorio cuando el estado calculado es "Justificada" (ingreso tardío). */
  idJustificacion?: number
}

// ≡ AsistenciaResponse. En previsualizar idAsistencia viene null.
export interface AsistenciaResponse {
  idAsistencia: number | null
  idMatricula: number
  idAlumno: number
  codigo: string
  alumno: string
  grado: string
  seccion: string
  turno: string
  anio: string
  urlFoto: string | null
  estado: EstadoAsistencia
  /** LocalTime serializado como "HH:mm:ss". */
  horaEntrada: string | null
  horaSalida: string | null
  idJustificacion: number | null
  justificacion: string | null
  idUsuarioRegistro: number | null
  usuarioRegistro: string | null
}

// ── Tablas hoy / semana / mes ────────────────────────────────────────────

// ≡ AsistenciaDiaResponse (GET /asistencias/hoy, List).
// Sin registro hoy el back devuelve estado "Inasistencia" y hora/marcadoPor null.
export interface AsistenciaDiaResponse {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  idAsistencia: number | null
  estado: EstadoAsistencia
  horaEntrada: string | null
  marcadoPor: string | null
}

// ≡ MatrizSemanalResponse (GET /asistencias/semana?fecha=, Page).
// estados = L–V (5 posiciones); sin registro el back pone "Inasistencia".
export interface MatrizSemanalResponse {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  estados: EstadoAsistencia[]
}

// ≡ ResumenMensualResponse (GET /asistencias/mes?fecha=, Page).
export interface ResumenMensualResponse {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  idMatricula: number
  diasAsistidos: number
  inasistencias: number
  porcentajeAsistencia: number
}

// ── Estadísticas / catálogos ─────────────────────────────────────────────

// ≡ EstadisticasResponse (GET /asistencias/estadisticas?rango=&fecha=).
export interface EstadisticasResponse {
  presentes: number
  tardanzas: number
  justificados: number
  inasistencias: number
  totalEsperado: number
  porcentajeAsistencia: number
}

export type RangoEstadisticas = "hoy" | "semana" | "mes"

// ≡ EstadoAsistenciaResponse (GET /asistencias/estados, List).
export interface EstadoAsistenciaResponse {
  idEstado: number
  nombre: EstadoAsistencia
}

// ── Acciones sobre registros existentes (Fase 9) ─────────────────────────

// Body de PUT /asistencias/{id}/justificar (≡ JustificarRequest @Valid).
export interface JustificarAsistenciaRequest {
  idJustificacion: number
}

// ── API ──────────────────────────────────────────────────────────────────

export const asistenciasApi = {
  async previsualizar(data: AsistenciaRequest): Promise<AsistenciaResponse> {
    return apiFetch<AsistenciaResponse>("/asistencias/previsualizar", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async confirmar(data: AsistenciaRequest): Promise<AsistenciaResponse> {
    return apiFetch<AsistenciaResponse>("/asistencias/confirmar", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async hoy(): Promise<AsistenciaDiaResponse[]> {
    return apiFetch<AsistenciaDiaResponse[]>("/asistencias/hoy")
  },
  async semana(fecha: string, page = 0, size = 10): Promise<Paginated<MatrizSemanalResponse>> {
    const params = new URLSearchParams({ fecha, page: String(page), size: String(size) })
    return apiFetch<Paginated<MatrizSemanalResponse>>(
      `/asistencias/semana?${params.toString()}`
    )
  },
  async mes(fecha: string, page = 0, size = 10): Promise<Paginated<ResumenMensualResponse>> {
    const params = new URLSearchParams({ fecha, page: String(page), size: String(size) })
    return apiFetch<Paginated<ResumenMensualResponse>>(
      `/asistencias/mes?${params.toString()}`
    )
  },
  async estadisticas(
    rango: RangoEstadisticas,
    fecha: string
  ): Promise<EstadisticasResponse> {
    const params = new URLSearchParams({ rango, fecha })
    return apiFetch<EstadisticasResponse>(
      `/asistencias/estadisticas?${params.toString()}`
    )
  },
  async estados(): Promise<EstadoAsistenciaResponse[]> {
    return apiFetch<EstadoAsistenciaResponse[]>("/asistencias/estados")
  },
  // Justificación retrospectiva: cambia el estado a "Justificada" y guarda
  // motivo. No es idempotente en el back (crea historial) → el front oculta
  // la acción cuando el estado ya es "Justificada".
  async justificar(
    idAsistencia: number,
    data: JustificarAsistenciaRequest
  ): Promise<AsistenciaResponse> {
    return apiFetch<AsistenciaResponse>(`/asistencias/${idAsistencia}/justificar`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(idAsistencia: number): Promise<void> {
    return apiFetch<void>(`/asistencias/${idAsistencia}`, { method: "DELETE" })
  },
  /** GET /asistencias/hijos — Hijos del apoderado actual (RBAC) */
  async hijos(): Promise<HijoHorario[]> {
    return apiFetch<HijoHorario[]>("/asistencias/hijos")
  },
}
