import { apiFetch } from "@/lib/api"
import type { EstadoAsistencia } from "@/lib/api/asistencia"
import type { HorarioListItem, RecreoHorario } from "@/lib/api/horario"

// ≡ PortalApoderadoDtos del back: solo lectura, solo los hijos del apoderado.

export interface MatriculaHijo {
  idMatricula: number
  idAnio: number
  anio: string
  /** La del año escolar en curso: se elige por defecto. */
  vigente: boolean
  nivel: string
  grado: string
  seccion: string | null
  turno: string | null
}

export interface Hijo {
  idAlumno: number
  nombre: string
  urlFoto: string | null
  /** Del año más reciente al más antiguo. */
  matriculas: MatriculaHijo[]
}

export interface DiaAsistencia {
  fecha: string
  /** null: día que aún no llega. */
  estado: EstadoAsistencia | null
  horaEntrada: string | null
  justificacion: string | null
  acompanante: string | null
  /** Foto del ingreso justificado. */
  urlEvidencia: string | null
}

export interface AsistenciaMes {
  anio: number
  mes: number
  puntuales: number
  tardanzas: number
  justificadas: number
  faltas: number
  dias: DiaAsistencia[]
}

export interface NotaDeEvaluacion {
  nombre: string
  fecha: string | null
  /** null: el docente aún no la registra. */
  calificacion: string | null
  /** Sección anterior (cambio de sección) donde se registró; null si es la actual. */
  otraSeccion: string | null
}

export interface PeriodoNotas {
  numero: number
  nombre: string
  /** POR_COMENZAR, ABIERTO o CERRADO. */
  estado: string
  evaluaciones: NotaDeEvaluacion[]
}

export interface CursoNotas {
  curso: string
  periodos: PeriodoNotas[]
}

export interface UltimaNota {
  curso: string
  evaluacion: string
  fecha: string | null
  calificacion: string
  registrada: string | null
}

export interface ResumenPortal {
  asistencia: AsistenciaMes
  ultimasNotas: UltimaNota[]
  clasesDeHoy: HorarioListItem[]
}

export interface PagoPortal {
  fecha: string
  /** PAGO, DIFERENCIA o DEVOLUCION. */
  tipo: string
  monto: number
  metodo: string | null
  urlComprobante: string | null
}

export interface PagosPortal {
  monto: number | null
  pagado: number
  saldo: number | null
  pagos: PagoPortal[]
}

const base = "/portal-apoderado"

export const portalApoderadoApi = {
  hijos: () => apiFetch<Hijo[]>(`${base}/hijos`),
  resumen: (idMatricula: number) => apiFetch<ResumenPortal>(`${base}/${idMatricula}/resumen`),
  notas: (idMatricula: number) => apiFetch<CursoNotas[]>(`${base}/${idMatricula}/notas`),
  /** mes: "YYYY-MM"; sin él, el mes actual dentro del año escolar. */
  asistencia: (idMatricula: number, mes?: string) =>
    apiFetch<AsistenciaMes>(`${base}/${idMatricula}/asistencia${mes ? `?mes=${mes}` : ""}`),
  horario: (idMatricula: number) => apiFetch<HorarioListItem[]>(`${base}/${idMatricula}/horario`),
  /** Recreos fijos del grado y turno del hijo. */
  recreos: (idMatricula: number) => apiFetch<RecreoHorario[]>(`${base}/${idMatricula}/recreos`),
  pagos: (idMatricula: number) => apiFetch<PagosPortal>(`${base}/${idMatricula}/pagos`),
}
