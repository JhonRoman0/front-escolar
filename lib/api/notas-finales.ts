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

export interface CeldaNotaFinal {
  idCompetencia: number
  calificacion: string | null
  conclusionDescriptiva: string | null
  registradoPor: string | null
  guia: GuiaNota[]
  /** Solo en escala vigesimal, redondeado desde ,5. */
  promedio: number | null
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
  /** Año vigente y periodo abierto o cerrado (este último, con código). */
  periodoEditable: boolean
  /** Además del periodo, el permiso de registrar notas nuevas. */
  puedeRegistrar: boolean
  requiereCodigo: boolean
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
  codigoAutorizacion: string | null
  notas: NotaFinalItem[]
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
  /** Excel con formato SIAGIE de toda la sección. */
  exportarSiagie(idGradoSeccion: number, periodo: number): Promise<Blob> {
    return apiFetch<Blob>(`/notas/siagie?idGradoSeccion=${idGradoSeccion}&periodo=${periodo}`, { responseType: "blob" })
  },
}
