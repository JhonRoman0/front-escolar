import { apiFetch } from "@/lib/api"
import type { EscalaCalificacion, PeriodoEvaluacion, TipoPeriodo } from "@/lib/api/academico"

/** De dónde viene una nota usada por un alumno trasladado. */
export interface Procedencia {
  idReconocimiento: number
  seccion: string
  evaluacion: string
}

/** Uso de una nota de otra sección en una evaluación (activo o anulado). */
export interface Reconocimiento {
  idReconocimiento: number
  idEvaluacionDestino: number
  evaluacionDestino: string
  seccionDestino: string
  calificacion: string
  estado: "ACTIVO" | "ANULADO"
  usuario: string
  fecha: string
  motivoAnulacion: string | null
  usuarioAnulacion: string | null
  fechaAnulacion: string | null
  puedeAnular: boolean
  enSeccionActual: boolean
}

/** Nota del alumno puesta en otra sección del mismo curso y año. */
export interface NotaHistorica {
  idNotaOrigen: number
  seccion: string
  curso: string
  area: string | null
  evaluacion: string
  competencias: CompetenciaEvaluada[]
  periodo: number
  fecha: string
  calificacion: string
  /** Por qué ya no se puede usar; null si se puede. */
  bloqueo: string | null
  reconocimientos: Reconocimiento[]
}

/** Nota de otra sección que el alumno puede usar en vez de rendir la evaluación. */
export interface OpcionTraslado {
  idNotaOrigen: number
  seccion: string
  evaluacion: string
  fecha: string
  calificacion: string
  competencias: CompetenciaEvaluada[]
}

/** Alumno trasladado con notas utilizables en la evaluación. */
export interface Traslado {
  idMatricula: number
  codigo: string
  nombre: string
  opciones: OpcionTraslado[]
}

export interface CompetenciaEvaluada {
  idCompetencia: number
  codigo: string
  nombre: string
}

/** Un curso de una sección que el usuario puede evaluar (≡ EvaluacionResponse.Curso). */
export interface CursoEvaluable {
  idAsignacion: number
  curso: string
  /** Área a la que pertenece, si es un subcurso. */
  area: string | null
  nivel: string
  grado: string
  seccion: string | null
  turno: string
  docente: string
  idAnio: number
  anioVigente: boolean
  escala: EscalaCalificacion
  tipoPeriodo: TipoPeriodo
  periodos: PeriodoEvaluacion[]
  competencias: CompetenciaEvaluada[]
  /** 1 = lunes … 7 = domingo. Vacío: el curso no tiene horario. */
  diasClase: number[]
  feriados: string[]
}

export interface EvaluacionResumen {
  tieneNotasRegistradas: boolean
  idEvaluacion: number
  nombre: string
  fecha: string
  periodo: number
  competencias: CompetenciaEvaluada[]
  notasRegistradas: number
  totalAlumnos: number
  registradoPor: string
  /** Año vigente y periodo abierto. */
  editable: boolean
  /** Alumnos con nota final ya registrada: su nota en esta evaluación no cambia. */
  alumnosConNotaFinal: number
}

/** Ficha de solo lectura de una evaluación (acción VER_RESUMEN). */
export interface FichaEvaluacion {
  idEvaluacion: number
  nombre: string
  /** "Bimestre 1" */
  periodo: string
  fecha: string
  /** Fecha y hora "2026-11-16T09:30:00". */
  fechaCreacion: string
  creadoPor: string
  competencias: CompetenciaEvaluada[]
  notasRegistradas: number
  totalAlumnos: number
}

export interface AlumnoEvaluado {
  notaProtegida: boolean
  tieneHistorial: boolean
  procedencia: Procedencia | null
  idMatricula: number
  codigo: string
  nombre: string
  calificacion: string | null
  /** Ya tiene nota final en una competencia que la evaluación afecta: solo lectura. */
  notaFinalRegistrada: boolean
}

export interface EvaluacionDetalle {
  idAsignacion: number
  evaluacion: EvaluacionResumen
  escala: EscalaCalificacion
  alumnos: AlumnoEvaluado[]
}

export interface PorCompetencia {
  idCompetencia: number
  /** Notas de las evaluaciones que afectan la competencia. */
  notas: string[]
  /** Solo en escala vigesimal. */
  promedio: number | null
}

/** Registro auxiliar: notas de cada alumno en todas las evaluaciones del curso y periodo. */
export interface RegistroAuxiliar {
  escala: EscalaCalificacion
  notaMinima: string
  evaluaciones: EvaluacionResumen[]
  competencias: CompetenciaEvaluada[]
  alumnos: {
    tieneHistorial: boolean
    procedencias: Record<number, Procedencia>
    idMatricula: number
    codigo: string
    nombre: string
    /** idEvaluacion → calificación. */
    notas: Record<number, string>
    competencias: PorCompetencia[]
  }[]
}

/** Cuántos alumnos ya tienen la nota final de la competencia en el periodo. */
export interface AvanceFinal {
  idCompetencia: number
  conNotaFinal: number
  totalAlumnos: number
}

export function competenciaCompleta(a: AvanceFinal | undefined): boolean {
  return !!a && a.totalAlumnos > 0 && a.conNotaFinal >= a.totalAlumnos
}

export interface EvaluacionRequest {
  idAsignacion?: number
  periodo?: number
  nombre: string
  fecha: string
  competencias: number[]
  /** Trasladados que no rinden: usan esa nota de su sección anterior. */
  noRinden?: { idMatricula: number; idNotaOrigen: number }[]
}

export const evaluacionesApi = {
  historial(idMatricula: number, idAsignacion: number): Promise<NotaHistorica[]> {
    return apiFetch(`/evaluaciones/historial-calificaciones?idMatricula=${idMatricula}&idAsignacion=${idAsignacion}`)
  },
  /** Con idEvaluacion, solo los alumnos que aún no tienen nota en ella. */
  traslados(idAsignacion: number, periodo: number, competencias: number[], idEvaluacion?: number): Promise<Traslado[]> {
    const params = new URLSearchParams({
      idAsignacion: String(idAsignacion),
      periodo: String(periodo),
      competencias: competencias.join(","),
    })
    if (idEvaluacion != null) params.set("idEvaluacion", String(idEvaluacion))
    return apiFetch(`/evaluaciones/traslados?${params.toString()}`)
  },
  reconocer(data: { idNotaOrigen: number; idEvaluacionDestino: number; calificacionOrigen: string }) {
    return apiFetch<Reconocimiento>("/evaluaciones/reconocimientos", { method: "POST", body: JSON.stringify(data) })
  },
  anular(id: number, motivo: string) {
    return apiFetch<void>(`/evaluaciones/reconocimientos/${id}/anulacion`, { method: "POST", body: JSON.stringify({ motivo }) })
  },
  cursos(idAnio: number): Promise<CursoEvaluable[]> {
    return apiFetch<CursoEvaluable[]>(`/evaluaciones/cursos?idAnio=${idAnio}`)
  },
  listar(idAsignacion: number, periodo: number): Promise<EvaluacionResumen[]> {
    return apiFetch<EvaluacionResumen[]>(`/evaluaciones?idAsignacion=${idAsignacion}&periodo=${periodo}`)
  },
  avanceFinales(idAsignacion: number, periodo: number): Promise<AvanceFinal[]> {
    return apiFetch<AvanceFinal[]>(`/evaluaciones/avance-finales?idAsignacion=${idAsignacion}&periodo=${periodo}`)
  },
  registro(idAsignacion: number, periodo: number): Promise<RegistroAuxiliar> {
    return apiFetch<RegistroAuxiliar>(`/evaluaciones/registro?idAsignacion=${idAsignacion}&periodo=${periodo}`)
  },
  resumen(idEvaluacion: number): Promise<FichaEvaluacion> {
    return apiFetch<FichaEvaluacion>(`/evaluaciones/${idEvaluacion}/resumen`)
  },
  detalle(idEvaluacion: number): Promise<EvaluacionDetalle> {
    return apiFetch<EvaluacionDetalle>(`/evaluaciones/${idEvaluacion}`)
  },
  crear(data: EvaluacionRequest): Promise<EvaluacionResumen> {
    return apiFetch<EvaluacionResumen>("/evaluaciones", { method: "POST", body: JSON.stringify(data) })
  },
  editar(idEvaluacion: number, data: EvaluacionRequest): Promise<EvaluacionResumen> {
    return apiFetch<EvaluacionResumen>(`/evaluaciones/${idEvaluacion}`, { method: "PUT", body: JSON.stringify(data) })
  },
  /** calificacion vacía: borra la nota de ese alumno. */
  registrarNotas(
    idEvaluacion: number,
    notas: { idMatricula: number; calificacion: string | null }[]
  ): Promise<EvaluacionDetalle> {
    return apiFetch<EvaluacionDetalle>(`/evaluaciones/${idEvaluacion}/notas`, {
      method: "PUT",
      body: JSON.stringify({ notas }),
    })
  },
  eliminar(idEvaluacion: number): Promise<void> {
    return apiFetch<void>(`/evaluaciones/${idEvaluacion}`, { method: "DELETE" })
  },
}

export const MOTIVO_ANULACION_MAXIMO = 500
export const RECONOCIMIENTO_ACTIVO = "ACTIVO" as const
