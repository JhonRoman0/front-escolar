import type { TurnoResponse } from "@/lib/api/academico"

/** "07:30:00" → minutos desde medianoche. */
function minutos(hora: string | null | undefined): number | null {
  if (!hora) return null
  const [h, m] = hora.split(":").map(Number)
  return Number.isNaN(h) ? null : h * 60 + (m || 0)
}

/**
 * El turno que está en curso a esta hora, para preseleccionarlo en Asistencia:
 * - durante un turno (de su entrada a su salida), ese turno; si se cruzan, el
 *   que empezó más tarde (es el que está recibiendo alumnos);
 * - antes del primero o entre dos turnos, el siguiente en entrar;
 * - después del último, el último (para revisar cómo terminó el día).
 */
export function turnoActual(turnos: TurnoResponse[], ahora: Date = new Date()): number | null {
  const conHorario = turnos
    .filter((t) => t.accesoId == null || t.accesoId === 1)
    .map((t) => ({ id: t.idTurno, entrada: minutos(t.horaEntrada), salida: minutos(t.horaSalida) }))
    .filter((t): t is { id: number; entrada: number; salida: number } => t.entrada != null && t.salida != null)
    .sort((a, b) => a.entrada - b.entrada)
  if (conHorario.length === 0) return null

  const min = ahora.getHours() * 60 + ahora.getMinutes()
  const enCurso = conHorario.filter((t) => min >= t.entrada && min <= t.salida)
  if (enCurso.length > 0) return enCurso[enCurso.length - 1].id

  const siguiente = conHorario.find((t) => t.entrada > min)
  return (siguiente ?? conHorario[conHorario.length - 1]).id
}
