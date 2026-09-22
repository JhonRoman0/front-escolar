import { apiFetch } from "@/lib/api"

// ── Tipos (espejo de HorarioListItem del back) ──────────────────────────

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
}

// ── Hijos del apoderado (reutiliza GET /asistencias/hijos) ──────────────

export interface HijoHorario {
  idAlumno: number
  alumno: string
  grado: string
  seccion: string
  idMatricula: number
}

// ── API ──────────────────────────────────────────────────────────────────

export const horarioApi = {
  /** GET /horarios — Admin: todos los horarios con filtros opcionales */
  async listar(
    params?: { grado?: string; seccion?: string; docente?: number; anioEscolar?: number }
  ): Promise<HorarioListItem[]> {
    const query = new URLSearchParams()
    if (params?.grado) query.set("grado", params.grado)
    if (params?.seccion) query.set("seccion", params.seccion)
    if (params?.docente != null) query.set("docente", String(params.docente))
    if (params?.anioEscolar != null) query.set("anioEscolar", String(params.anioEscolar))
    const qs = query.toString()
    return apiFetch<HorarioListItem[]>(`/horarios${qs ? `?${qs}` : ""}`)
  },

  /** GET /horarios/docente/{idDocente} — Docente: solo sus horarios */
  async porDocente(
    idDocente: number,
    params?: { anioEscolar?: number }
  ): Promise<HorarioListItem[]> {
    const query = new URLSearchParams()
    if (params?.anioEscolar != null) query.set("anioEscolar", String(params.anioEscolar))
    const qs = query.toString()
    return apiFetch<HorarioListItem[]>(
      `/horarios/docente/${idDocente}${qs ? `?${qs}` : ""}`
    )
  },

  /** GET /horarios/alumno/{idAlumno} — Apoderado: horarios de la sección del alumno */
  async porAlumno(
    idAlumno: number,
    params?: { anioEscolar?: number }
  ): Promise<HorarioListItem[]> {
    const query = new URLSearchParams()
    if (params?.anioEscolar != null) query.set("anioEscolar", String(params.anioEscolar))
    const qs = query.toString()
    return apiFetch<HorarioListItem[]>(
      `/horarios/alumno/${idAlumno}${qs ? `?${qs}` : ""}`
    )
  },
}
