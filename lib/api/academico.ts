import { apiFetch, crud } from "@/lib/api"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"

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
  tipoContratoId: number | null
  tipoContratoNombre: string | null
  fechaContratacion: string | null
  gradoAcademicoId: number | null
  gradoAcademicoNombre: string | null
  niveles: NivelResponse[]
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
  tipoContratoId?: number | null
  fechaContratacion?: string | null
  gradoAcademicoId?: number | null
  niveles?: number[]
  accesoId?: number | null
}

// ── Catálogos del docente (solo lectura) ────────────────────────────────

export interface GradoAcademicoResponse {
  idGradoAcademico: number
  nombre: string
}

export interface TipoContratoResponse {
  idTipoContrato: number
  nombre: string
}

// ── Curso ────────────────────────────────────────────────────────────────

// AREA y TRANSVERSAL vienen del Excel del SIAGIE; SUBCURSO lo crea el colegio.
export type TipoCurso = "AREA" | "TRANSVERSAL" | "SUBCURSO"

export interface CursoResponse {
  idCurso: number
  /** Código MINEDU ("063: MATE"). Los subcursos no tienen. */
  codigo: string | null
  nombre: string
  accesoId: number | null
  idAnio: number
  anio: string
  idNivel: number
  nivel: string
  tipo: TipoCurso
  tieneSubcursos: boolean
  idCursoPadre: number | null
  /** Competencias activas del área o transversal. */
  cantidadCompetencias: number
  /** Solo subcursos: competencias del área que evalúa. */
  idCompetencias: number[]
}

export interface CursoImportResponse {
  totalDetectados: number
  creados: number
  actualizados: number
  inactivados: number
  cursos: CursoResponse[]
}

export interface CursoVistaPreviaResponse {
  idNivel: number
  nivel: string
  nivelArchivo: string
  anioArchivo: string | null
  periodoArchivo: string | null
  areas: {
    codigo: string
    nombre: string
    tipo: TipoCurso
    accion: "NUEVA" | "ACTUALIZA"
    competencias: { codigo: string; nombre: string }[]
  }[]
  seInactivan: string[]
  advertencias: string[]
}

export interface CursoCopiaRequest {
  idAnioOrigen: number
  idAnioDestino: number
  idNivel: number
}

export interface SubcursoRequest {
  nombre: string
  idCompetencias: number[]
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

export interface SeccionResponse {
  idGradoSeccion: number
  idSeccion: number
  nombre: string
  idTurno: number
  turno: string
  idAnio: number
  anio: string
  /** Salón de la sección; null si todavía no tiene. */
  idAula: number | null
  aula: string | null
  tieneMatriculas: boolean
  tieneAsignaciones: boolean
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
  idTurno: number
  /** Opcional: el backend usa el año vigente cuando no viene. */
  idAnio?: number | null
  /** Cada sección con su salón. Al editar, una existente se reconoce por su nombre. */
  secciones?: SeccionNueva[]
  /** Salón de la sección única, cuando el grado no tiene secciones. */
  idAula?: number | null
  accesoId?: number | null
}

export interface SeccionNueva {
  nombre: string
  idAula: number
}

// ── Nivel (filtro cascada) ──────────────────────────────────────────────

export interface NivelResponse {
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
  idAnio: number
  anio: string
  idAula: number | null
  aula: string | null
  /**
   * El backend los calcula en cada listado. La UI los usa para deshabilitar la
   * papelera: si hay matriculas o asignaciones, la seccion ya no se puede tocar.
   */
  tieneMatriculas: boolean
  tieneAsignaciones: boolean
}

export interface SeccionRequest {
  idGrado: number
  idTurno: number
  nombre: string
  idAula: number
  idAnio?: number | null
}

/**
 * Varias secciones de una vez sobre la misma combinación de grado, turno y año.
 * El backend las valida todas antes de insertar la primera, así que si una se
 * repite o ya existe no se crea ninguna. La UI envía siempre idAnio explícito.
 */
export interface SeccionesBatchRequest {
  idGrado: number
  idTurno: number
  secciones: SeccionNueva[]
  /**
   * Opcional: la UI siempre lo envía. Si no viene, el backend resuelve con su
   * fallback (por comenzar habilitado de año más alto, si no, el vigente) y
   * falla si no hay ninguno habilitado.
   */
  idAnio?: number | null
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

/**
 * Regla única de "año habilitado para secciones": está vigente, o está por
 * comenzar y su fecha de inicio ya se cumplió. Un por comenzar sin fecha o
 * todavía futuro deja el alta bloqueada: sería crear secciones para el ciclo
 * siguiente en un año que nadie está usando.
 *
 * Espejo exacto de GradoSeccionService.habilitadoParaSecciones (backend).
 */
export function anioHabilitadoParaSecciones(
  anio: AnioEscolarResponse,
  hoy: string = fechaHoyISO()
): boolean {
  if (anio.estado === ESTADO_ANIO.VIGENTE) return true
  return (
    anio.estado === ESTADO_ANIO.POR_COMENZAR &&
    anio.fechaInicio != null &&
    anio.fechaInicio <= hoy
  )
}

/** Solo los años sobre los que se puede crear secciones hoy. */
export function aniosHabilitados(
  anios: AnioEscolarResponse[],
  hoy?: string
): AnioEscolarResponse[] {
  return anios.filter((a) => anioHabilitadoParaSecciones(a, hoy))
}

/**
 * Selección inicial cuando hay varios habilitados: el por comenzar de año más
 * alto (el próximo ciclo, donde conviene preparar las secciones); si no, el
 * vigente.
 */
export function anioPorDefecto(
  habilitados: AnioEscolarResponse[]
): AnioEscolarResponse | undefined {
  if (habilitados.length === 0) return undefined
  const porComenzar = habilitados
    .filter((a) => a.estado === ESTADO_ANIO.POR_COMENZAR)
    .sort((a, b) => (a.anio < b.anio ? 1 : a.anio > b.anio ? -1 : 0))
  return (
    porComenzar[0] ??
    habilitados.find((a) => a.estado === ESTADO_ANIO.VIGENTE) ??
    habilitados[0]
  )
}

/** Texto de estado para los contextos de diálogo ("Vigente", "Por comenzar"...). */
export function estadoAnioTexto(estado: number): string {
  if (estado === ESTADO_ANIO.VIGENTE) return "Vigente"
  if (estado === ESTADO_ANIO.CERRADO) return "Cerrado"
  if (estado === ESTADO_ANIO.POR_COMENZAR) return "Por comenzar"
  return "Sin estado"
}

/**
 * Motivo por el que no se puede crear en este año, o `null` si se puede. Es el
 * mismo texto que devuelve el backend, para que el botón deshabilitado avise
 * antes de que el backend rechace la petición.
 */
export function motivoAnioNoHabilitado(
  anio: AnioEscolarResponse,
  hoy: string = fechaHoyISO()
): string | null {
  if (anioHabilitadoParaSecciones(anio, hoy)) return null
  if (anio.estado === ESTADO_ANIO.CERRADO) {
    return `El año ${anio.anio} está cerrado y no admite secciones nuevas.`
  }
  if (anio.fechaInicio == null) {
    return `El año ${anio.anio} no tiene fecha de inicio configurada: no admite secciones todavía.`
  }
  return `El año ${anio.anio} se habilita desde el ${formatearFecha(anio.fechaInicio)}.`
}

/** 1 = ACTIVO, 2 = ELIMINADO, 3 = INACTIVO. Espejo de AccesoConstants del backend. */
export const ACCESO = {
  ACTIVO: 1,
  ELIMINADO: 2,
  INACTIVO: 3,
} as const

// ── Aula ─────────────────────────────────────────────────────────────────

/**
 * SALON: el aula fija de una sección (una por sección, por año y turno).
 * AMBIENTE: laboratorio, cómputo… todas las secciones, una clase a la vez.
 * COMPARTIDO: patio, losa, auditorio… varias clases a la misma hora.
 */
export type TipoAula = "SALON" | "AMBIENTE" | "COMPARTIDO"

export const TIPOS_AULA: { value: TipoAula; label: string; ayuda: string }[] = [
  { value: "SALON", label: "Salón", ayuda: "El aula fija de una sección: se le asigna a una sola por año y turno." },
  { value: "AMBIENTE", label: "Ambiente especial", ayuda: "Laboratorio, cómputo, arte… lo usan todas las secciones, una clase a la vez." },
  { value: "COMPARTIDO", label: "Espacio compartido", ayuda: "Patio, losa o auditorio: admite varias clases a la misma hora." },
]

export interface AulaResponse {
  idAula: number
  nombre: string
  capacidad: number | null
  tipo: TipoAula
  /** Secciones de las que es salón ("3.° A – Mañana 2027"). */
  secciones: string[]
  accesoId: number | null
}

interface AulaRequest {
  nombre: string
  capacidad: number
  tipo: TipoAula
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
  idNivel: number
  nivel: string
  idGrado: number
  idTurno: number
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
  async listar(): Promise<DocenteResponse[]> {
    return apiFetch<DocenteResponse[]>("/docentes")
  },
  async actualizar(
    id: number,
    data: DocenteRequest
  ): Promise<DocenteResponse> {
    return apiFetch<DocenteResponse>(`/docentes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/docentes/${id}`, { method: "DELETE" })
  },
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

export const gradosAcademicosApi = {
  async listar(): Promise<GradoAcademicoResponse[]> {
    return apiFetch<GradoAcademicoResponse[]>("/grados-academicos")
  },
}

export const tiposContratoApi = {
  async listar(): Promise<TipoContratoResponse[]> {
    return apiFetch<TipoContratoResponse[]>("/tipos-contrato")
  },
}

function formularioImportacion(archivo: File, idAnio: number): FormData {
  const formData = new FormData()
  formData.append("archivo", archivo)
  formData.append("idAnio", String(idAnio))
  return formData
}

// Las áreas no se crean ni editan a mano: entran importando el Excel del
// SIAGIE o copiando otro año. Lo único que se escribe son los subcursos.
export const cursosApi = {
  /** Sin filtros trae todos los cursos (lo usa Asignaciones). */
  async listar(idAnio?: number | null, idNivel?: number | null): Promise<CursoResponse[]> {
    const params = new URLSearchParams()
    if (idAnio) params.set("idAnio", String(idAnio))
    if (idNivel) params.set("idNivel", String(idNivel))
    const query = params.toString()
    return apiFetch<CursoResponse[]>(`/cursos${query ? `?${query}` : ""}`)
  },
  async cambiarEstado(idCurso: number, accesoId: number): Promise<CursoResponse> {
    return apiFetch<CursoResponse>(`/cursos/${idCurso}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ accesoId }),
    })
  },
  async cambiarSubcursos(idCurso: number, tieneSubcursos: boolean): Promise<CursoResponse> {
    return apiFetch<CursoResponse>(`/cursos/${idCurso}/subcursos`, {
      method: "PATCH",
      body: JSON.stringify({ tieneSubcursos }),
    })
  },
  async crearSubcurso(idArea: number, data: SubcursoRequest): Promise<CursoResponse> {
    return apiFetch<CursoResponse>(`/cursos/${idArea}/subcursos`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizarSubcurso(idSubcurso: number, data: SubcursoRequest): Promise<CursoResponse> {
    return apiFetch<CursoResponse>(`/cursos/${idSubcurso}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(idCurso: number): Promise<void> {
    return apiFetch<void>(`/cursos/${idCurso}`, { method: "DELETE" })
  },
  async vistaPrevia(archivo: File, idAnio: number): Promise<CursoVistaPreviaResponse> {
    return apiFetch<CursoVistaPreviaResponse>("/cursos/importar/vista-previa", {
      method: "POST",
      body: formularioImportacion(archivo, idAnio),
    })
  },
  async importar(archivo: File, idAnio: number): Promise<CursoImportResponse> {
    return apiFetch<CursoImportResponse>("/cursos/importar", {
      method: "POST",
      body: formularioImportacion(archivo, idAnio),
    })
  },
  async copiar(data: CursoCopiaRequest): Promise<CursoResponse[]> {
    return apiFetch<CursoResponse[]>("/cursos/copiar", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}
export const turnosApi = crud<TurnoResponse, TurnoRequest>("/turnos")
export const gradosApi = {
  ...crud<GradoResponse, GradoRequest>("/grados"),
  async porNivel(idNivel: number, idAnio?: number | null): Promise<GradoResponse[]> {
    const params = new URLSearchParams({ idNivel: String(idNivel) })
    if (idAnio) params.set("idAnio", String(idAnio))
    return apiFetch<GradoResponse[]>(`/grados?${params.toString()}`)
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
  async crear(request: SeccionRequest): Promise<GradoSeccionItem> {
    return apiFetch<GradoSeccionItem>("/secciones", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },
  /** Lote atómico: o se crean todas las secciones o ninguna. */
  async crearLote(request: SeccionesBatchRequest): Promise<GradoSeccionItem[]> {
    return apiFetch<GradoSeccionItem[]>("/secciones/lote", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },
  async eliminar(idGradoSeccion: number): Promise<void> {
    return apiFetch<void>(`/secciones/${idGradoSeccion}`, { method: "DELETE" })
  },
  async actualizar(idGradoSeccion: number, request: { nombre: string; idAula: number }): Promise<GradoSeccionItem> {
    return apiFetch<GradoSeccionItem>(`/secciones/${idGradoSeccion}`, {
      method: "PUT",
      body: JSON.stringify({ nombre: request.nombre, idAula: request.idAula }),
    })
  },
  async eliminarLote(ids: number[]): Promise<void> {
    return apiFetch<void>("/secciones/lote", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    })
  },
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

/** 1 = lunes ... 6 = sábado. El domingo no hay clases. */
export const DIAS_CLASE = [
  { value: 1, label: "Lunes", corto: "Lun" },
  { value: 2, label: "Martes", corto: "Mar" },
  { value: 3, label: "Miércoles", corto: "Mié" },
  { value: 4, label: "Jueves", corto: "Jue" },
  { value: 5, label: "Viernes", corto: "Vie" },
  { value: 6, label: "Sábado", corto: "Sáb" },
] as const

/** Un recreo de un grado en un turno: aplica a todas sus secciones. */
export interface RecreoResponse {
  idRecreo: number
  idAnio: number
  anio: string
  idNivel: number
  nivel: string
  idTurno: number
  turno: string
  idGrado: number
  grado: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  accesoId: number | null
}

/** Crea un recreo por cada combinación de grado, día y franja. */
export interface RecreoRequest {
  idAnio: number
  idNivel: number
  idTurno: number
  idGrados: number[]
  dias: number[]
  franjas: { horaInicio: string; horaFin: string }[]
}

export interface RecreoUpdateRequest {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export const recreosApi = {
  async listar(filtros: { idAnio?: number | null; idNivel?: number | null; idTurno?: number | null } = {}): Promise<RecreoResponse[]> {
    const params = new URLSearchParams()
    if (filtros.idAnio) params.set("idAnio", String(filtros.idAnio))
    if (filtros.idNivel) params.set("idNivel", String(filtros.idNivel))
    if (filtros.idTurno) params.set("idTurno", String(filtros.idTurno))
    const query = params.toString()
    return apiFetch<RecreoResponse[]>(`/recreos${query ? `?${query}` : ""}`)
  },
  async crear(data: RecreoRequest): Promise<RecreoResponse[]> {
    return apiFetch<RecreoResponse[]>("/recreos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(id: number, data: RecreoUpdateRequest): Promise<RecreoResponse> {
    return apiFetch<RecreoResponse>(`/recreos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/recreos/${id}`, { method: "DELETE" })
  },
  async eliminarDelGrado(idAnio: number, idTurno: number, idGrado: number): Promise<void> {
    return apiFetch<void>(`/recreos/anio/${idAnio}/turno/${idTurno}/grado/${idGrado}`, { method: "DELETE" })
  },
}

// ── Configuración académica ──────────────────────────────────────────────

/** Duración de la hora académica de un nivel en un año escolar. */
export interface ConfiguracionAcademicaResponse {
  idAnio: number
  anio: string
  idNivel: number
  nivel: string
  /** Minutos de la hora académica; null: libre (la clase dura lo que se elija). */
  minutosHoraAcademica: number | null
  /** CONFIGURADO en este año, HEREDADO de un año anterior o valor por DEFECTO. */
  origen: "CONFIGURADO" | "HEREDADO" | "DEFECTO"
  anioOrigen: string | null
  /** Con alguna asignación en el año y nivel, la duración ya no cambia. */
  asignaciones: number
}

export interface ConfiguracionAcademicaRequest {
  idAnio: number
  idNivel: number
  minutosHoraAcademica: number | null
}

export const configuracionAcademicaApi = {
  async listar(idAnio: number): Promise<ConfiguracionAcademicaResponse[]> {
    return apiFetch<ConfiguracionAcademicaResponse[]>(`/configuracion-academica?idAnio=${idAnio}`)
  },
  async guardar(data: ConfiguracionAcademicaRequest): Promise<ConfiguracionAcademicaResponse> {
    return apiFetch<ConfiguracionAcademicaResponse>("/configuracion-academica", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  /** La misma información, por la ruta de Asignaciones: quien asigna no necesita este permiso. */
  async horaAcademica(idAnio: number, idNivel: number): Promise<ConfiguracionAcademicaResponse> {
    return apiFetch<ConfiguracionAcademicaResponse>(`/asignaciones/hora-academica?idAnio=${idAnio}&idNivel=${idNivel}`)
  },
}
