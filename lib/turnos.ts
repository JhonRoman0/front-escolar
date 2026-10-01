// Orden y solapamiento de los turnos del colegio.

export interface TurnoFranja {
  id: number
  nombre: string
  horaEntrada: string
  horaSalida: string
}

export interface ConflictoTurnos {
  anterior: TurnoFranja
  siguiente: TurnoFranja
}

/** "HH:mm" con hora y minutos válidos. */
export function esHoraValida(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

/**
 * Turnos en el orden en que se dan durante el día. El desempate por id
 * mantiene el resultado estable cuando dos turnos empiezan a la misma hora.
 */
export function ordenarTurnos(turnos: TurnoFranja[]): TurnoFranja[] {
  return turnos
    .filter((t) => esHoraValida(t.horaEntrada))
    .sort((a, b) => {
      if (a.horaEntrada < b.horaEntrada) return -1
      if (a.horaEntrada > b.horaEntrada) return 1
      return a.id - b.id
    })
}

/**
 * Turno inmediatamente anterior en la jornada, o null si este es el primero.
 * Es el único con el que un turno puede solaparse: los que vienen después se
 * validan contra él, no al revés.
 */
export function turnoAnterior(
  turnos: TurnoFranja[],
  idTurno: number,
): TurnoFranja | null {
  const cadena = ordenarTurnos(turnos)
  const indice = cadena.findIndex((t) => t.id === idTurno)
  if (indice <= 0) return null
  return cadena[indice - 1]
}

/** Pares de turnos consecutivos cuyas ventanas de asistencia se pisan. */
export function conflictosTurnos(turnos: TurnoFranja[]): ConflictoTurnos[] {
  const cadena = ordenarTurnos(turnos)
  const conflictos: ConflictoTurnos[] = []
  for (let i = 1; i < cadena.length; i++) {
    const anterior = cadena[i - 1]
    const siguiente = cadena[i]
    // El empate está permitido: representa el cambio de turno.
    if (siguiente.horaEntrada < anterior.horaSalida) {
      conflictos.push({ anterior, siguiente })
    }
  }
  return conflictos
}
