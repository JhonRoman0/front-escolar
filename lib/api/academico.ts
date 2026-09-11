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
  acceso: number
  tipoContrato: string | null
  fechaContratacion: string | null
  especialidad: string | null
  gradoAcademico: string | null
  roles: { idRol: number; nombre: string; acceso: number }[]
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
  acceso?: number | null
}

// ── Curso ────────────────────────────────────────────────────────────────

export interface CursoResponse {
  idCurso: number
  nombre: string
  acceso: number
}

export interface CursoRequest {
  nombre: string
  acceso?: number | null
}

// ── Turno ────────────────────────────────────────────────────────────────

export interface TurnoResponse {
  idTurno: number
  nombre: string
  horaEntrada: string
  horaEntradaLimite: string
  horaFaltaLimite: string
  horaSalida: string
  acceso: number
}

export interface TurnoRequest {
  nombre: string
  horaEntrada: string
  horaEntradaLimite: string
  horaFaltaLimite: string
  horaSalida: string
  acceso?: number | null
}

// ── Grado ────────────────────────────────────────────────────────────────

export interface SeccionResponse {
  idGradoSeccion: number
  idSeccion: number
  nombre: string
}

export interface GradoResponse {
  idGrado: number
  nombre: string
  idNivel: number
  nivel: string
  acceso: number
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
  acceso?: number | null
}

// ── Nivel (filtro cascada) ──────────────────────────────────────────────

export interface NivelResponse {
  idNivel: number
  nombre: string
}

// ── Sección del grado (filtro cascada) ──────────────────────────────────

export interface GradoSeccionItem {
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
  acceso: number
}

export interface AnioEscolarRequest {
  anio: string
  estado?: number | null
  acceso?: number | null
}

// ── Aula ─────────────────────────────────────────────────────────────────

export interface AulaResponse {
  idAula: number
  nombre: string
  acceso: number
}

export interface AulaRequest {
  nombre: string
  acceso?: number | null
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
  acceso: number
  horarios: HorarioResponse[]
}

export interface AsignacionRequest {
  idCurso: number
  idDocente: number
  idGradoSeccion: number
  idAnio: number
  horarios?: HorarioRequest[] | null
  acceso?: number | null
}

export interface HorasDocenteResponse {
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
export const aniosEscolaresApi = crud<AnioEscolarResponse, AnioEscolarRequest>(
  "/anios-escolares"
)
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
