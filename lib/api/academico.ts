import { apiFetch, crud } from "@/lib/api"

// Jackson serializa LocalTime como "08:00:00"; el form y los inputs usan "HH:mm"
export function horaCorta(hora?: string | null): string {
  return hora ? hora.slice(0, 5) : ""
}

// ── Docentes ─────────────────────────────────────────────────────────────

export interface DocenteResponse {
  idDocente: number
  idUsuario: number
  codigo: string
  nombre: string
  apellidoPat: string
  apellidoMat: string
  documentoIdentidad: string | null
  gmail: string | null
  fechaNaci: string
  urlFoto: string | null
  accesoId: number | null
  tipoContrato: string | null
  fechaContratacion: string | null
  especialidad: string | null
  gradoAcademico: string | null
  roles: { idRol: number; nombre: string; accesoId: number | null }[]
}

export interface DocenteRequest {
  nombre: string
  apellidoPat: string
  apellidoMat: string
  documentoIdentidad?: string | null
  contraseña?: string
  gmail?: string | null
  fechaNaci: string
  tipoContrato?: string | null
  fechaContratacion?: string | null
  especialidad?: string | null
  gradoAcademico?: string | null
  accesoId?: number | null
}

// ── Curso ────────────────────────────────────────────────────────────────

export interface CursoResponse {
  idCurso: number
  nombre: string
  accesoId: number | null
}

interface CursoRequest {
  nombre: string
  accesoId?: number | null
}

// ── Turno ────────────────────────────────────────────────────────────────

export interface TurnoResponse {
  idTurno: number
  nombre: string
  horaEntrada: string
  horaEntradaLimite: string
  horaFaltaLimite: string
  horaSalida: string
  accesoId: number | null
}

interface TurnoRequest {
  nombre: string
  horaEntrada: string
  horaEntradaLimite: string
  horaFaltaLimite: string
  horaSalida: string
  accesoId?: number | null
}

// ── Grado ────────────────────────────────────────────────────────────────

interface SeccionResponse {
  idGradoSeccion: number
  idSeccion: number
  nombre: string
}

export interface GradoResponse {
  idGrado: number
  nombre: string
  idNivel: number
  nivel: string
  accesoId: number | null
  idAnio: number
  anio: string
  idTurno: number
  turno: string
  secciones: SeccionResponse[]
  idGradoSeccionDefault: number | null
}

export interface GradoRequest {
  nombre: string
  idNivel: number
  idAnio: number
  idTurno: number
  secciones?: string[]
  accesoId?: number | null
}

// ── Nivel (filtro cascada) ──────────────────────────────────────────────

interface NivelResponse {
  idNivel: number
  nombre: string
}

// ── Sección del grado (filtro cascada) ──────────────────────────────────

interface GradoSeccionItem {
  idGradoSeccion: number
  idSeccion: number
  nombre: string
  idTurno: number
  turno: string
}

// ── Año escolar ──────────────────────────────────────────────────────────

export interface AnioEscolarResponse {
  idAnio: number
  anio: string
  estado: number
  fechaInicio: string | null
  fechaFin: string | null
  bloqueoHorariosPorFecha: boolean | null
  accesoId: number | null
}

interface AnioEscolarRequest {
  anio: string
  estado?: number | null
  fechaInicio?: string | null
  fechaFin?: string | null
  bloqueoHorariosPorFecha?: boolean | null
  accesoId?: number | null
}

/** 1 = VIGENTE, 2 = CERRADO (lo asigna el backend al vencer fechaFin), 3 = POR COMENZAR. */
export const ESTADO_ANIO = {
  VIGENTE: 1,
  CERRADO: 2,
  POR_COMENZAR: 3,
} as const

/** 1 = ACTIVO, 2 = ELIMINADO, 3 = INACTIVO. Espejo de AccesoConstants del backend. */
export const ACCESO = {
  ACTIVO: 1,
  ELIMINADO: 2,
  INACTIVO: 3,
} as const

// ── Aula ─────────────────────────────────────────────────────────────────

export interface AulaResponse {
  idAula: number
  nombre: string
  capacidad: number | null
  accesoId: number | null
}

interface AulaRequest {
  nombre: string
  capacidad: number
  accesoId?: number | null
}

// ── Suspensión de Docente ────────────────────────────────────────────────

interface SuspensionResponse {
  idSuspension: number
  idDocente: number
  docente: string
  idSustituto: number | null
  sustituto: string | null
  motivo: string
  motivoDetalle: string | null
  fechaInicio: string
  fechaFin: string | null
  accesoId: number | null
}

export interface SuspensionRequest {
  idDocente: number
  idSustituto?: number | null
  motivo: string
  motivoDetalle?: string | null
  fechaInicio: string
  fechaFin?: string | null
}

// ── Cambios de Docente ───────────────────────────────────────────────────

interface CambioDocenteResponse {
  idCambio: number
  idAsignacion: number
  docenteAnterior: string
  docenteNuevo: string
  motivo: string
  motivoDetalle: string | null
  fechaCambio: string
  usuarioRegistro: string
}

// ── Asignación ───────────────────────────────────────────────────────────

export interface HorarioResponse {
  idHorario: number
  idAula: number
  aula: string
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export interface HorarioRequest {
  idAula: number
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export interface AsignacionResponse {
  idAsignacion: number
  idCurso: number
  curso: string
  idDocente: number
  docente: string
  idGradoSeccion: number
  grado: string
  seccion: string
  turno: string
  idAnio: number
  anio: string
  accesoId: number | null
  horarios: HorarioResponse[]
}

export interface AsignacionRequest {
  idCurso: number
  idDocente: number
  idGradoSeccion: number
  idAnio: number
  horarios?: HorarioRequest[] | null
  accesoId?: number | null
}

interface HorasDocenteResponse {
  idDocente: number
  docente: string
  horasSemana: number
  horasMes: number
}

// ── API ──────────────────────────────────────────────────────────────────

export const docentesApi = {
  ...crud<DocenteResponse, DocenteRequest>("/docentes"),
  async subirFoto(idUsuario: number, file: File): Promise<DocenteResponse> {
    const formData = new FormData()
    formData.append("foto", file)
    return apiFetch<DocenteResponse>(`/usuarios/${idUsuario}/foto`, {
      method: "POST",
      body: formData,
    })
  },
  async eliminarFoto(idUsuario: number): Promise<void> {
    return apiFetch<void>(`/usuarios/${idUsuario}/foto`, { method: "DELETE" })
  },
}

export const cursosApi = crud<CursoResponse, CursoRequest>("/cursos")
export const turnosApi = crud<TurnoResponse, TurnoRequest>("/turnos")
export const gradosApi = {
  ...crud<GradoResponse, GradoRequest>("/grados"),
  async porNivel(idNivel: number): Promise<GradoResponse[]> {
    return apiFetch<GradoResponse[]>(`/grados?idNivel=${idNivel}`)
  },
}
export const aniosEscolaresApi = {
  ...crud<AnioEscolarResponse, AnioEscolarRequest>("/anios-escolares"),
  /**
   * El estado se cambia por endpoint propio y no por el PUT general: al activar
   * un VIGENTE el backend cierra el anterior en la misma transacción, y esa
   * transición no se puede expresar como un update del recurso.
   */
  async cambiarEstado(idAnio: number, estado: number): Promise<AnioEscolarResponse> {
    return apiFetch<AnioEscolarResponse>(`/anios-escolares/${idAnio}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    })
  },
}
export const aulasApi = crud<AulaResponse, AulaRequest>("/aulas")

export const nivelesApi = {
  listar: () => apiFetch<NivelResponse[]>("/niveles"),
}

export const gradoSeccionApi = {
  porGrado: (idGrado: number) =>
    apiFetch<GradoSeccionItem[]>(`/secciones?idGrado=${idGrado}`),
}

export const asignacionesApi = {
  ...crud<AsignacionResponse, AsignacionRequest>("/asignaciones"),
  async porDocente(idDocente: number): Promise<AsignacionResponse[]> {
    return apiFetch<AsignacionResponse[]>(`/asignaciones/docente/${idDocente}`)
  },
  async horasDocente(
    idDocente: number,
    periodo?: "semana" | "mes"
  ): Promise<HorasDocenteResponse> {
    const query = periodo ? `?periodo=${periodo}` : ""
    return apiFetch<HorasDocenteResponse>(
      `/asignaciones/docente/${idDocente}/horas${query}`
    )
  },
}

// ── Suspensiones de Docente ──────────────────────────────────────────────

export const suspensionesApi = {
  async listar(): Promise<SuspensionResponse[]> {
    return apiFetch<SuspensionResponse[]>("/suspensiones")
  },
  async crear(data: SuspensionRequest): Promise<SuspensionResponse> {
    return apiFetch<SuspensionResponse>("/suspensiones", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async finalizar(id: number): Promise<SuspensionResponse> {
    return apiFetch<SuspensionResponse>(`/suspensiones/${id}/finalizar`, {
      method: "PUT",
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/suspensiones/${id}`, { method: "DELETE" })
  },
}

// ── Cambios de Docente (solo lectura) ────────────────────────────────────

export const cambiosDocenteApi = {
  async listar(): Promise<CambioDocenteResponse[]> {
    return apiFetch<CambioDocenteResponse[]>("/cambios-docente")
  },
}

// ── Recreos ──────────────────────────────────────────────────────────────

export interface RecreoResponse {
  idRecreo: number
  idNivel: number
  nivel: string
  idGradoSeccion: number | null
  gradoSeccion: string | null
  diaSemana: number
  horaInicio: string
  horaFin: string
  accesoId: number | null
}

export interface RecreoRequest {
  idNivel: number
  idGradoSeccion?: number | null
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export const recreosApi = {
  async listar(): Promise<RecreoResponse[]> {
    return apiFetch<RecreoResponse[]>("/recreos")
  },
  async porNivel(idNivel: number): Promise<RecreoResponse[]> {
    return apiFetch<RecreoResponse[]>(`/recreos/nivel/${idNivel}`)
  },
  async crear(data: RecreoRequest): Promise<RecreoResponse> {
    return apiFetch<RecreoResponse>("/recreos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(id: number, data: RecreoRequest): Promise<RecreoResponse> {
    return apiFetch<RecreoResponse>(`/recreos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/recreos/${id}`, { method: "DELETE" })
  },
}
