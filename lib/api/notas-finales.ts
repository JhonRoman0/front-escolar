import { apiFetch } from "@/lib/api"
import type { EscalaCalificacion, EstadoPeriodo, PeriodoEvaluacion, TipoPeriodo } from "@/lib/api/academico"
import type { CompetenciaEvaluada } from "@/lib/api/evaluaciones"

/** Un área (o transversal) de una sección con las competencias que el usuario califica. */
export interface CursoFinal {
  idGradoSeccion: number
  idArea: number
  area: string
  transversal: boolean
  nivel: string
  grado: string
  seccion: string | null
  turno: string
  anioVigente: boolean
  escala: EscalaCalificacion
  tipoPeriodo: TipoPeriodo
  periodos: PeriodoEvaluacion[]
  competencias: CompetenciaEvaluada[]
}

/** Nota de una evaluación que sirve de guía. */
export interface GuiaNota {
  evaluacion: string
  curso: string
  fecha: string
  calificacion: string
}

/** Nota de un alumno trasladado puesta en otra sección y no usada aquí: solo de referencia. */
export interface ReferenciaNota {
  evaluacion: string
  curso: string
  seccion: string
  fecha: string
  calificacion: string
}

export interface CeldaNotaFinal {
  idCompetencia: number
  calificacion: string | null
  conclusionDescriptiva: string | null
  registradoPor: string | null
  guia: GuiaNota[]
  /** Solo en escala vigesimal, redondeado desde ,5. */
  promedio: number | null
  /** La nota final se registró cuando el alumno estaba en esa otra sección. */
  seccionOrigen: string | null
  /** No entran al promedio. */
  referencias: ReferenciaNota[]
  /** Periodo cerrado cursado en otra sección y sin nota final: la registra quien corrige notas. */
  soloDireccion: boolean
  /** Ya tiene la nota final del año: no se corrige ni reabre. */
  conNotaAnual: boolean
}

export interface AlumnoNotaFinal {
  idMatricula: number
  codigo: string
  nombre: string
  notas: CeldaNotaFinal[]
}

export interface CompetenciaFinal extends CompetenciaEvaluada {
  /** Subcursos ligados a la competencia que aún no la evaluaron en el periodo. */
  sinEvaluaciones: string[]
}

export interface DetalleNotaFinal {
  curso: CursoFinal
  escala: EscalaCalificacion
  periodo: { numero: number; nombre: string; estado: EstadoPeriodo }
  /** Año vigente y periodo abierto o cerrado (este último, solo quien corrige). */
  periodoEditable: boolean
  /** Además del periodo, el permiso de registrar notas nuevas. */
  puedeRegistrar: boolean
  /** Además del periodo, el permiso de cambiar notas ya registradas. */
  puedeCorregir: boolean
  competencias: CompetenciaFinal[]
  alumnos: AlumnoNotaFinal[]
}

export interface NotaFinalItem {
  idMatricula: number
  idCompetencia: number
  calificacion: string | null
  conclusionDescriptiva: string | null
}

export interface NotaFinalRequest {
  idGradoSeccion: number
  idArea: number
  periodo: number
  notas: NotaFinalItem[]
  /** Obligatorio al corregir una nota ya registrada. */
  motivo?: string | null
}

/** Reabre una nota final (del periodo o, sin periodo, del año). */
export interface ReaperturaNota {
  idGradoSeccion: number
  idArea: number
  periodo: number | null
  idMatricula: number
  idCompetencia: number
  motivo: string
}

export interface CeldaNotaAnual {
  idCompetencia: number
  /** Nota final de cada periodo; null si aún no la tiene. */
  periodos: { numero: number; calificacion: string | null }[]
  /** Periodos sin nota final: con alguno no se registra la del año. */
  faltan: string[]
  calificacion: string | null
  conclusionDescriptiva: string | null
  registradoPor: string | null
  /** En vigesimal, la nota del año que corresponde. */
  promedio: number | null
}

export interface DetalleNotaAnual {
  curso: CursoFinal
  escala: EscalaCalificacion
  periodos: { numero: number; nombre: string }[]
  /** Año vigente con el último periodo cerrado; si no, noDisponible dice por qué. */
  disponible: boolean
  noDisponible: string | null
  puedeRegistrar: boolean
  puedeCorregir: boolean
  competencias: CompetenciaEvaluada[]
  alumnos: { idMatricula: number; codigo: string; nombre: string; notas: CeldaNotaAnual[] }[]
}

export interface NotaAnualRequest {
  idGradoSeccion: number
  idArea: number
  notas: NotaFinalItem[]
  motivo?: string | null
}

export interface AlumnoBoleta {
  idMatricula: number
  codigo: string
  documentoIdentidad: string | null
  nombre: string
  /** idCompetencia → periodo → calificación. */
  notas: Record<number, Record<number, string>>
  /** idCompetencia → conclusión del periodo de la boleta. */
  conclusiones: Record<number, string>
  asistencia: { puntual: number; tardanza: number; justificada: number; inasistencia: number }
  /** idCompetencia → nota del año y su conclusión (solo en la boleta del último periodo). */
  finales: Record<number, string>
  conclusionesFinales: Record<number, string>
}

/** Datos de las boletas de una sección; periodos: hasta el de la boleta. */
export interface Boleta {
  seccion: { anio: string; nivel: string; grado: string; seccion: string | null; turno: string }
  escala: EscalaCalificacion
  tipoPeriodo: TipoPeriodo
  periodos: PeriodoEvaluacion[]
  periodo: number
  areas: { nombre: string; transversal: boolean; competencias: CompetenciaEvaluada[] }[]
  alumnos: AlumnoBoleta[]
  /** Boleta del último periodo con notas del año: lleva la columna Final. */
  conFinal: boolean
}

/** Cuántas notas finales faltan en la sección antes de exportar. */
export interface PendientesSiagie {
  alumnos: number
  esperadas: number
  faltantes: number
  areas: { area: string; faltantes: number }[]
}

export const notasFinalesApi = {
  cursos(idAnio: number): Promise<CursoFinal[]> {
    return apiFetch<CursoFinal[]>(`/notas/finales/cursos?idAnio=${idAnio}`)
  },
  detalle(idGradoSeccion: number, idArea: number, periodo: number): Promise<DetalleNotaFinal> {
    return apiFetch<DetalleNotaFinal>(
      `/notas/finales?idGradoSeccion=${idGradoSeccion}&idArea=${idArea}&periodo=${periodo}`
    )
  },
  /** Solo notas nuevas. */
  registrar(data: NotaFinalRequest): Promise<DetalleNotaFinal> {
    return apiFetch<DetalleNotaFinal>("/notas/finales", { method: "PUT", body: JSON.stringify(data) })
  },
  /** Cambia o borra notas ya registradas: pide el permiso de corregir. */
  corregir(data: NotaFinalRequest): Promise<DetalleNotaFinal> {
    return apiFetch<DetalleNotaFinal>("/notas/finales/correccion", { method: "PUT", body: JSON.stringify(data) })
  },
  boletas(idGradoSeccion: number, periodo: number): Promise<Boleta> {
    return apiFetch<Boleta>(`/notas/boletas?idGradoSeccion=${idGradoSeccion}&periodo=${periodo}`)
  },
  pendientesSiagie(idGradoSeccion: number, periodo: number): Promise<PendientesSiagie> {
    return apiFetch<PendientesSiagie>(`/notas/siagie/pendientes?idGradoSeccion=${idGradoSeccion}&periodo=${periodo}`)
  },
  reabrir(data: ReaperturaNota): Promise<DetalleNotaFinal> {
    return apiFetch<DetalleNotaFinal>("/notas/finales/reapertura", { method: "POST", body: JSON.stringify(data) })
  },
  /** Excel con formato SIAGIE de toda la sección. */
  exportarSiagie(idGradoSeccion: number, periodo: number): Promise<Blob> {
    return apiFetch<Blob>(`/notas/siagie?idGradoSeccion=${idGradoSeccion}&periodo=${periodo}`, { responseType: "blob" })
  },
}

/** Notas finales del año (permiso NOTAS_ANUALES). */
export const notasAnualesApi = {
  cursos(idAnio: number): Promise<CursoFinal[]> {
    return apiFetch<CursoFinal[]>(`/notas/anuales/cursos?idAnio=${idAnio}`)
  },
  detalle(idGradoSeccion: number, idArea: number): Promise<DetalleNotaAnual> {
    return apiFetch<DetalleNotaAnual>(`/notas/anuales?idGradoSeccion=${idGradoSeccion}&idArea=${idArea}`)
  },
  registrar(data: NotaAnualRequest): Promise<DetalleNotaAnual> {
    return apiFetch<DetalleNotaAnual>("/notas/anuales", { method: "PUT", body: JSON.stringify(data) })
  },
  corregir(data: NotaAnualRequest): Promise<DetalleNotaAnual> {
    return apiFetch<DetalleNotaAnual>("/notas/anuales/correccion", { method: "PUT", body: JSON.stringify(data) })
  },
  reabrir(data: ReaperturaNota): Promise<DetalleNotaAnual> {
    return apiFetch<DetalleNotaAnual>("/notas/anuales/reapertura", { method: "POST", body: JSON.stringify(data) })
  },
}
