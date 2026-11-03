export const NACIMIENTO_MINIMO_ALUMNO = "2000-01-01"
export const EDAD_MINIMA_ADULTO = 18

// Fecha civil del colegio; el nacimiento no se convierte a un instante UTC.
export function hoyNacimiento(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ahora)
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)!.value
  return `${valor("year")}-${valor("month")}-${valor("day")}`
}

export function esNacimientoValido(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith("0000")) return false
  const parsed = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha
}

export function calcularEdad(fecha?: string | null, hoy = hoyNacimiento()): number | null {
  if (!fecha || !esNacimientoValido(fecha)) return null
  return Number(hoy.slice(0, 4)) - Number(fecha.slice(0, 4)) - (hoy.slice(5) < fecha.slice(5) ? 1 : 0)
}

export function nacimientoMaximoAdulto(hoy = hoyNacimiento()): string {
  const anio = Number(hoy.slice(0, 4)) - EDAD_MINIMA_ADULTO
  const candidato = `${anio.toString().padStart(4, "0")}${hoy.slice(4)}`
  return esNacimientoValido(candidato) ? candidato : `${anio}-02-28`
}

export function errorNacimiento(fecha: string, tipo: "alumno" | "adulto", original?: string | null, hoy = hoyNacimiento()): string | null {
  if (!fecha) return "La fecha de nacimiento es obligatoria"
  if (original && fecha === original) return null
  if (!esNacimientoValido(fecha)) return "Escribe una fecha de nacimiento válida"
  if (fecha > hoy) return "La fecha de nacimiento no puede ser futura"
  if (tipo === "alumno" && fecha < NACIMIENTO_MINIMO_ALUMNO) return "La fecha de nacimiento debe ser a partir del 01/01/2000"
  if (tipo === "adulto" && calcularEdad(fecha, hoy)! < EDAD_MINIMA_ADULTO) return "Debe tener al menos 18 años cumplidos"
  return null
}

export function formatoEdad(fecha?: string | null): string {
  const edad = calcularEdad(fecha)
  if (edad === null) return "—"
  return `${edad} años`
}
