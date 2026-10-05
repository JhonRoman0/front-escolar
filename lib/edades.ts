// Calcula la edad a partir de una fecha ISO "YYYY-MM-DD".
export function calcularEdad(fecha?: string | null): number | null {
  if (!fecha) return null
  const nacimiento = new Date(`${fecha}T00:00:00`)
  if (isNaN(nacimiento.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1
  }
  return edad
}

export function formatoEdad(fecha?: string | null): string {
  const edad = calcularEdad(fecha)
  if (edad === null) return "—"
  return `${edad} años`
}