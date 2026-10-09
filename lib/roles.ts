export const PALETA_COLORES = [
  "#1D4ED8",
  "#0E7490",
  "#15803D",
  "#B45309",
  "#C2410C",
  "#B91C1C",
  "#BE185D",
  "#6D28D9",
]

/** Tratamiento visual del rol protegido, compartido por Roles y Usuarios. */
export const COLOR_ROL_ADMIN = "#0F172A"

export const COLOR_ROL_FALLBACK = PALETA_COLORES[0]

export function esRolAdmin(nombre: string | null | undefined) {
  return !!nombre && nombre.trim().toUpperCase() === "ADMIN"
}
