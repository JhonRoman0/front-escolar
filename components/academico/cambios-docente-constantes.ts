import type { ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import { ACCESO, type SuspensionResponse } from "@/lib/api/academico"
import { fechaHoyISO, isoADate } from "@/lib/fechas"
import {
  ESTADO_CAMBIO,
  ESTADO_SUSPENSION,
  TIPO_CAMBIO_DOCENTE,
  type EstadoCambio,
  type EstadoSuspension,
  type TipoCambioDocente,
} from "@/lib/schemas/academico"

export { ESTADO_CAMBIO, ESTADO_SUSPENSION }
export type { EstadoSuspension }

type VarianteBadge = NonNullable<ComponentProps<typeof Badge>["variant"]>

export const ETIQUETA_ESTADO_CAMBIO: Record<EstadoCambio, string> = {
  [ESTADO_CAMBIO.PROGRAMADO]: "Programado",
  [ESTADO_CAMBIO.VIGENTE]: "Vigente",
  [ESTADO_CAMBIO.FINALIZADO]: "Finalizado",
  [ESTADO_CAMBIO.APLICADO]: "Aplicado",
  [ESTADO_CAMBIO.CANCELADO]: "Cancelado",
}

export const VARIANTE_ESTADO_CAMBIO: Record<EstadoCambio, VarianteBadge> = {
  [ESTADO_CAMBIO.PROGRAMADO]: "warning",
  [ESTADO_CAMBIO.VIGENTE]: "warning",
  [ESTADO_CAMBIO.FINALIZADO]: "success",
  [ESTADO_CAMBIO.APLICADO]: "success",
  [ESTADO_CAMBIO.CANCELADO]: "outline",
}

export const ETIQUETA_TIPO_CAMBIO: Record<TipoCambioDocente, string> = {
  [TIPO_CAMBIO_DOCENTE.TEMPORAL]: "Temporal",
  [TIPO_CAMBIO_DOCENTE.DEFINITIVO]: "Definitivo",
}

export const VARIANTE_TIPO_CAMBIO: VarianteBadge = "info"

export function etiquetaCantidadAsignaciones(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "asignación" : "asignaciones"}`
}

export const ETIQUETA_ESTADO_SUSPENSION: Record<EstadoSuspension, string> = {
  [ESTADO_SUSPENSION.PROGRAMADA]: "Programada",
  [ESTADO_SUSPENSION.VIGENTE]: "Vigente",
  [ESTADO_SUSPENSION.FINALIZADA]: "Finalizada",
  [ESTADO_SUSPENSION.CANCELADA]: "Cancelada",
}

export const VARIANTE_ESTADO_SUSPENSION: Record<EstadoSuspension, VarianteBadge> = {
  [ESTADO_SUSPENSION.PROGRAMADA]: "warning",
  [ESTADO_SUSPENSION.VIGENTE]: "warning",
  [ESTADO_SUSPENSION.FINALIZADA]: "success",
  [ESTADO_SUSPENSION.CANCELADA]: "outline",
}

export function estadoSuspension(
  suspension: Pick<SuspensionResponse, "accesoId" | "fechaFin" | "fechaInicio"> &
    Partial<Pick<SuspensionResponse, "estado">>,
  hoy: string = fechaHoyISO()
): EstadoSuspension {
  if (
    suspension.estado &&
    Object.values(ESTADO_SUSPENSION).some((estado) => estado === suspension.estado)
  ) {
    return suspension.estado
  }
  if (suspension.accesoId === ACCESO.ELIMINADO) return ESTADO_SUSPENSION.CANCELADA
  const inicio = isoADate(suspension.fechaInicio)
  const fin = isoADate(suspension.fechaFin)
  const fechaHoy = isoADate(hoy)
  if (inicio && fechaHoy && inicio > fechaHoy) return ESTADO_SUSPENSION.PROGRAMADA
  if (fin && (!fechaHoy || fin < fechaHoy)) return ESTADO_SUSPENSION.FINALIZADA
  return ESTADO_SUSPENSION.VIGENTE
}

export function datosVigencia({
  inicio,
  inicioReal,
  finPrevisto,
  finReal,
  programado,
  cancelado,
  etiquetaFinalizado = "Finalizado el",
}: {
  inicio: string | null
  inicioReal?: string | null
  finPrevisto: string | null
  finReal: string | null
  programado: boolean
  cancelado: boolean
  etiquetaFinalizado?: string
}) {
  const inicioDistinto = Boolean(inicioReal && inicio && inicioReal !== inicio)
  const etiquetaFin = cancelado
    ? "Fecha de cancelación"
    : finReal === finPrevisto ? "Fecha de finalización" : etiquetaFinalizado

  return [
    {
      etiqueta: programado || cancelado || inicioDistinto ? "Inicio programado" : "Fecha de inicio",
      valor: inicioDistinto ? inicio : inicioReal ?? inicio,
    },
    { etiqueta: "Fecha de inicio", valor: inicioDistinto ? inicioReal : null },
    { etiqueta: "Finalización prevista", valor: finPrevisto !== finReal ? finPrevisto : null },
    { etiqueta: etiquetaFin, valor: finReal },
  ]
}
