import { ApiError } from "@/lib/api"

// Utilidades del paso "código enviado al correo" (recuperar contraseña y doble factor).

export const SEGUNDOS_REINTENTO = 45

export function formatearContador(segundos: number): string {
  const mm = String(Math.floor(segundos / 60)).padStart(2, "0")
  const ss = String(segundos % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

export function mensajeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/** Código de negocio que manda el backend en el cuerpo del error. */
export function codigoDeError(error: unknown): string | null {
  return error instanceof ApiError && typeof error.body?.codigo === "string"
    ? error.body.codigo
    : null
}

// 429 del backend: segundos que faltan para poder pedir otro código.
export function segundosDeEspera(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 429) return null
  const segundos = Number(error.body?.segundosRestantes)
  return Number.isFinite(segundos) && segundos > 0 ? segundos : null
}
