// Orden de los turnos del colegio en la jornada.

export interface TurnoFranja {
  id: number
  nombre: string
  horaEntrada: string
  horaSalida: string
}

/** "HH:mm" con hora y minutos válidos. */
export function esHoraValida(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

/**
 * Turnos en el orden en que se dan durante el día. El desempate por id
 * mantiene el resultado estable cuando dos turnos empiezan a la misma hora.
 */
function ordenarTurnos(turnos: TurnoFranja[]): TurnoFranja[] {
  return turnos
    .filter((t) => esHoraValida(t.horaEntrada))
    .sort((a, b) => {
      if (a.horaEntrada < b.horaEntrada) return -1
      if (a.horaEntrada > b.horaEntrada) return 1
      return a.id - b.id
    })
}

/** Turno inmediatamente anterior en la jornada, o null si este es el primero. */
export function turnoAnterior(
  turnos: TurnoFranja[],
  idTurno: number,
): TurnoFranja | null {
  const cadena = ordenarTurnos(turnos)
  const indice = cadena.findIndex((t) => t.id === idTurno)
  if (indice <= 0) return null
  return cadena[indice - 1]
}

/** Turno inmediatamente siguiente en la jornada, o null si este es el último. */
export function turnoSiguiente(
  turnos: TurnoFranja[],
  idTurno: number,
): TurnoFranja | null {
  const cadena = ordenarTurnos(turnos)
  const indice = cadena.findIndex((t) => t.id === idTurno)
  if (indice < 0 || indice === cadena.length - 1) return null
  return cadena[indice + 1]
}
