import { apiFetch, type Paginated } from "@/lib/api"
import { etiquetaSeccion } from "@/lib/horario"

export { etiquetaSeccion }

// ── Tipos (espejo de HorarioPlanoResponse del back) ──────────────────────────

export interface HorarioListItem {
  idHorario: number
  /** 1=Lunes … 6=Sábado */
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

/** Franja de recreo para pintar en un horario. */
export interface RecreoHorario {
  idTurno: number
  turno: string
  /** 1=Lunes … 6=Sábado */
  diaSemana: number
  horaInicio: string
  horaFin: string
  grado: string
}

/** Horario de un docente: clases y, por turno, el recreo si dicta en un solo grado. */
export interface MiHorario {
  clases: HorarioListItem[]
  recreos: RecreoHorario[]
}

function compararHorarios(a: HorarioListItem, b: HorarioListItem): number {
  return a.idHorario - b.idHorario ||
    a.diaSemana - b.diaSemana ||
    a.horaInicio.localeCompare(b.horaInicio) ||
    a.curso.localeCompare(b.curso) ||
    a.seccion.localeCompare(b.seccion)
}

export const horarioApi = {
  /** GET /horarios/mio — Todas las clases del docente con sesión iniciada. Sin año: el vigente. */
  async mio(idAnio?: number | null): Promise<MiHorario> {
    return apiFetch<MiHorario>(`/horarios/mio${idAnio != null ? `?idAnio=${idAnio}` : ""}`)
  },
  /** GET /horarios/seccion/{id}/recreos — Recreos del grado y turno de la sección. */
  async recreosDeSeccion(idGradoSeccion: number): Promise<RecreoHorario[]> {
    return apiFetch<RecreoHorario[]>(`/horarios/seccion/${idGradoSeccion}/recreos`)
  },
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
    if (params?.idDocente != null) query.set("docente", String(params.idDocente))
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

  /** GET /horarios — recupera todas las páginas con los mismos filtros y orden estable. */
  async listarTodo(params?: HorarioFiltros): Promise<HorarioListItem[]> {
    const base: HorarioFiltros = {
      ...params,
      sort: params?.sort ?? "idHorario,asc",
      size: params?.size ?? 100,
    }
    const todos: HorarioListItem[] = []
    let pagina = 0

    while (true) {
      const respuesta = await horarioApi.listar({ ...base, page: pagina })
      todos.push(...respuesta.content)
      if (respuesta.last || respuesta.content.length === 0) break
      pagina += 1
    }

    return todos.sort(compararHorarios)
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
