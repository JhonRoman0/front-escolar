// Utilidades de fecha/hora compartidas (formatos es-PE).

/** Hoy en formato ISO local YYYY-MM-DD (sin desfase UTC). */
export function fechaHoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, "0")
  const dia = String(hoy.getDate()).padStart(2, "0")
  return `${anio}-${mes}-${dia}`
}

function aFecha(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha
  // "YYYY-MM-DD" se interpreta como hora local, no UTC
  return new Date(fecha.length === 10 ? `${fecha}T00:00:00` : fecha)
}

/** Fecha como dd/mm/yyyy; "—" si es nula o inválida. */
export function formatearFecha(
  fecha: string | Date | null | undefined
): string {
  if (!fecha) return "—"
  const d = aFecha(fecha)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** Fecha como dd/mm (encabezados de columnas). */
export function formatearFechaCorta(fecha: Date): string {
  const d = String(fecha.getDate()).padStart(2, "0")
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  return `${d}/${m}`
}

/** Hora "HH:mm:ss" del back → "HH:mm"; "—" si es nula. */
export function formatearHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "—"
}

/** Lunes a viernes de la semana de la fecha dada (5 Date locales). */
export function diasSemana(fechaISO: string): Date[] {
  const fecha = aFecha(fechaISO)
  const diaSemana = fecha.getDay()
  const diffALunes = diaSemana === 0 ? -6 : 1 - diaSemana
  const lunes = new Date(fecha)
  lunes.setDate(fecha.getDate() + diffALunes)

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return d
  })
}

/** true si la fecha es posterior a hoy (medianoche). */
export function esFechaFutura(fecha: Date): boolean {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha)
  f.setHours(0, 0, 0, 0)
  return f > hoy
}
