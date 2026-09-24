import { apiFetch, type Paginated } from "@/lib/api"

// ── Tipos (espejo de HorarioPlanoResponse del back) ──────────────────────────

export interface HorarioListItem {
  idHorario: number
  /** 1=Lunes … 7=Domingo */
  diaSemana: number
  /** "HH:mm:ss" serializado por Jackson */
  horaInicio: string
  horaFin: string
  aula: string
  curso: string
  docente: string
  idDocente: number
  grado: string
  seccion: string
  idGradoSeccion: number
  /** Nombre real del turno del catálogo (ej: "Mañana", "Tarde") */
  turno: string
  idAnio: number
  // Enriquecido (nuevos filtros)
  idNivel?: number | null
  nivel?: string | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
}

// ── Hijos del apoderado (reutiliza GET /asistencias/hijos) ──────────────

export interface HijoHorario {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  idMatricula: number
}

export interface HorarioFiltros {
  page?: number
  size?: number
  sort?: string
  idNivel?: number | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idGradoSeccion?: number | null
  idDocente?: number | null
  /** alias legacy del back: anioEscolar == idAnio */
  anioEscolar?: number | null
  idAnio?: number | null
  // legacy strings por compat
  grado?: string
  seccion?: string
}

// ── API ──────────────────────────────────────────────────────────────────

export const horarioApi = {
  /** GET /horarios — Admin: todos los horarios con filtros opcionales (ahora Page) */
  async listar(params?: HorarioFiltros): Promise<Paginated<HorarioListItem>> {
    const query = new URLSearchParams()
    query.set("page", String(params?.page ?? 0))
    query.set("size", String(params?.size ?? 20))
    if (params?.sort) query.set("sort", params.sort)
    else query.set("sort", "idHorario,asc")
    if (params?.idNivel != null) query.set("idNivel", String(params.idNivel))
    if (params?.idGrado != null) query.set("idGrado", String(params.idGrado))
    if (params?.idSeccion != null) query.set("idSeccion", String(params.idSeccion))
    if (params?.idTurno != null) query.set("idTurno", String(params.idTurno))
    if (params?.idGradoSeccion != null) query.set("idGradoSeccion", String(params.idGradoSeccion))
    if (params?.idDocente != null) query.set("idDocente", String(params.idDocente))
    // idAnio / anioEscolar: prioridad idAnio, fallback anioEscolar
    const anio = params?.idAnio ?? params?.anioEscolar
    if (anio != null) {
      query.set("idAnio", String(anio))
      query.set("anioEscolar", String(anio))
    }
    // legacy strings (mantener por compat si back aún los usa)
    if (params?.grado) query.set("grado", params.grado)
    if (params?.seccion) query.set("seccion", params.seccion)
    return apiFetch<Paginated<HorarioListItem>>(`/horarios?${query.toString()}`)
  },

  /** GET /horarios/docente/{idDocente} — Docente: solo sus horarios (ahora Page) */
  async porDocente(
    idDocente: number,
    params?: { anioEscolar?: number; idAnio?: number; page?: number; size?: number }
  ): Promise<Paginated<HorarioListItem>> {
    const query = new URLSearchParams()
    const anio = params?.idAnio ?? params?.anioEscolar
    if (anio != null) {
      query.set("anioEscolar", String(anio))
      query.set("idAnio", String(anio))
    }
    if (params?.page != null) query.set("page", String(params.page))
    if (params?.size != null) query.set("size", String(params.size))
    const qs = query.toString()
    return apiFetch<Paginated<HorarioListItem>>(
      `/horarios/docente/${idDocente}${qs ? `?${qs}` : ""}`
    )
  },

  /** GET /horarios/alumno/{idAlumno} — Apoderado: horarios de la sección del alumno (ahora Page) */
  async porAlumno(
    idAlumno: number,
    params?: { anioEscolar?: number; idAnio?: number; page?: number; size?: number }
  ): Promise<Paginated<HorarioListItem>> {
    const query = new URLSearchParams()
    const anio = params?.idAnio ?? params?.anioEscolar
    if (anio != null) {
      query.set("anioEscolar", String(anio))
      query.set("idAnio", String(anio))
    }
    if (params?.page != null) query.set("page", String(params.page))
    if (params?.size != null) query.set("size", String(params.size))
    const qs = query.toString()
    return apiFetch<Paginated<HorarioListItem>>(
      `/horarios/alumno/${idAlumno}${qs ? `?${qs}` : ""}`
    )
  },
}
