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

// ≡ AsistenciaDiaResponse (GET /asistencias/hoy, ahora Page).
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
  // Enriquecido (6 filtros)
  idNivel?: number | null
  nivel?: string | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idGradoSeccion?: number | null
  idAnio?: number | null
  anio?: string | null
  turno?: string | null
}

// ≡ MatrizSemanalResponse (GET /asistencias/semana?fecha=, Page).
// estados = L–V (5 posiciones); sin registro el back pone "Inasistencia".
export interface MatrizSemanalResponse {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  estados: EstadoAsistencia[]
  idGradoSeccion?: number | null
  idNivel?: number | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idAnio?: number | null
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
  idGradoSeccion?: number | null
  idNivel?: number | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idAnio?: number | null
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

export interface AsistenciaFiltros {
  idNivel?: number | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idGradoSeccion?: number | null
  idAnio?: number | null
  search?: string | null
  estado?: EstadoAsistencia | null
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
  async hoy(params?: { page?: number; size?: number } & AsistenciaFiltros & { fecha?: string }): Promise<Paginated<AsistenciaDiaResponse>> {
    const query = new URLSearchParams()
    query.set("page", String(params?.page ?? 0))
    query.set("size", String(params?.size ?? 10))
    if (params?.fecha) query.set("fecha", params.fecha)
    if (params?.idNivel != null) query.set("idNivel", String(params.idNivel))
    if (params?.idGrado != null) query.set("idGrado", String(params.idGrado))
    if (params?.idSeccion != null) query.set("idSeccion", String(params.idSeccion))
    if (params?.idTurno != null) query.set("idTurno", String(params.idTurno))
    if (params?.idGradoSeccion != null) query.set("idGradoSeccion", String(params.idGradoSeccion))
    if (params?.idAnio != null) query.set("idAnio", String(params.idAnio))
    if (params?.estado) query.set("estado", params.estado)
    if (params?.search) query.set("search", params.search)
    return apiFetch<Paginated<AsistenciaDiaResponse>>(`/asistencias/hoy?${query.toString()}`)
  },
  async semana(
    fecha: string,
    page = 0,
    size = 10,
    filtros?: AsistenciaFiltros
  ): Promise<Paginated<MatrizSemanalResponse>> {
    const params = new URLSearchParams({ fecha, page: String(page), size: String(size) })
    if (filtros?.idNivel != null) params.set("idNivel", String(filtros.idNivel))
    if (filtros?.idGrado != null) params.set("idGrado", String(filtros.idGrado))
    if (filtros?.idSeccion != null) params.set("idSeccion", String(filtros.idSeccion))
    if (filtros?.idTurno != null) params.set("idTurno", String(filtros.idTurno))
    if (filtros?.idGradoSeccion != null) params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    if (filtros?.idAnio != null) params.set("idAnio", String(filtros.idAnio))
    if (filtros?.estado) params.set("estado", filtros.estado)
    if (filtros?.search) params.set("search", filtros.search)
    return apiFetch<Paginated<MatrizSemanalResponse>>(
      `/asistencias/semana?${params.toString()}`
    )
  },
  async mes(
    fecha: string,
    page = 0,
    size = 10,
    filtros?: AsistenciaFiltros
  ): Promise<Paginated<ResumenMensualResponse>> {
    const params = new URLSearchParams({ fecha, page: String(page), size: String(size) })
    if (filtros?.idNivel != null) params.set("idNivel", String(filtros.idNivel))
    if (filtros?.idGrado != null) params.set("idGrado", String(filtros.idGrado))
    if (filtros?.idSeccion != null) params.set("idSeccion", String(filtros.idSeccion))
    if (filtros?.idTurno != null) params.set("idTurno", String(filtros.idTurno))
    if (filtros?.idGradoSeccion != null) params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    if (filtros?.idAnio != null) params.set("idAnio", String(filtros.idAnio))
    if (filtros?.estado) params.set("estado", filtros.estado)
    if (filtros?.search) params.set("search", filtros.search)
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
  async reporteGeneral(
    params: { inicio: string; fin: string; page?: number; size?: number } & AsistenciaFiltros
  ): Promise<Paginated<AsistenciaDiaResponse>> {
    const query = new URLSearchParams({ inicio: params.inicio, fin: params.fin })
    query.set("page", String(params.page ?? 0))
    query.set("size", String(params.size ?? 10))
    if (params.idNivel != null) query.set("idNivel", String(params.idNivel))
    if (params.idGrado != null) query.set("idGrado", String(params.idGrado))
    if (params.idSeccion != null) query.set("idSeccion", String(params.idSeccion))
    if (params.idTurno != null) query.set("idTurno", String(params.idTurno))
    if (params.idGradoSeccion != null) query.set("idGradoSeccion", String(params.idGradoSeccion))
    if (params.idAnio != null) query.set("idAnio", String(params.idAnio))
    return apiFetch<Paginated<AsistenciaDiaResponse>>(`/reportes/general?${query.toString()}`)
  },
}
