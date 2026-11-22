import {
  esCodigoBloqueoSesion,
  type EstadoVigencia,
} from "@/lib/vigencia"

export const EVENTO_SESION_BLOQUEADA = "escolar:sesion-bloqueada"

export interface DetalleSesionBloqueada {
  codigo: string
  mensaje: string
  estado?: EstadoVigencia
  fechaInicio?: string | null
  fechaFin?: string | null
}

let detalle: DetalleSesionBloqueada | null = null

export function sesionBloqueada(): DetalleSesionBloqueada | null {
  return detalle
}

export function marcarSesionBloqueada(
  nuevoDetalle: DetalleSesionBloqueada
): void {
  detalle = nuevoDetalle
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_SESION_BLOQUEADA, { detail: nuevoDetalle })
    )
  }
}

export function limpiarSesionBloqueada(): void {
  detalle = null
}

export { esCodigoBloqueoSesion }
