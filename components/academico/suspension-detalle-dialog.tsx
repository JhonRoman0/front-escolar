"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  datosVigencia,
  ESTADO_SUSPENSION,
  ETIQUETA_ESTADO_SUSPENSION,
  VARIANTE_ESTADO_SUSPENSION,
  estadoSuspension,
} from "@/components/academico/cambios-docente-constantes"
import {
  fechaDetalle,
  SeccionDatos,
} from "@/components/academico/detalle-dialog-comunes"
import type { SuspensionResponse } from "@/lib/api/academico"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  suspension: SuspensionResponse | null
}

export default function SuspensionDetalleDialog({ open, onOpenChange, suspension }: Props) {
  if (!suspension) return null

  const estado = estadoSuspension(suspension)
  const vigencia = datosVigencia({
    inicio: fechaDetalle(suspension.fechaInicio),
    finPrevisto: fechaDetalle(suspension.fechaFin),
    finReal: fechaDetalle(suspension.fechaFinalizacion),
    programado: estado === ESTADO_SUSPENSION.PROGRAMADA,
    cancelado: estado === ESTADO_SUSPENSION.CANCELADA,
    etiquetaFinalizado: "Finalizada el",
  })
  const hayIncidencia = Boolean(
    suspension.incidencia ||
      suspension.motivoIncidencia?.trim() ||
      suspension.motivoResolucion?.trim()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" scroll="sticky">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-4">
            <DialogTitle>Detalle de la suspensión</DialogTitle>
            <Badge variant={VARIANTE_ESTADO_SUSPENSION[estado]}>
              {ETIQUETA_ESTADO_SUSPENSION[estado]}
            </Badge>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5 pb-6">
          <SeccionDatos
            titulo="Docentes"
            datos={[
              { etiqueta: "Docente suspendido", valor: suspension.docente },
              { etiqueta: "Sustituto", valor: suspension.sustituto ?? "Sin sustituto" },
            ]}
          />

          <SeccionDatos
            titulo="Suspensión"
            datos={[
              { etiqueta: "Motivo", valor: suspension.motivo },
              { etiqueta: "Observaciones", valor: suspension.motivoDetalle },
            ]}
          />

          <SeccionDatos titulo="Vigencia" datos={vigencia} />

          {hayIncidencia && (
            <SeccionDatos
              titulo="Incidencia y observación"
              datos={[
                { etiqueta: "Motivo de incidencia", valor: suspension.motivoIncidencia },
                { etiqueta: "Detalle de la observación", valor: suspension.motivoResolucion },
              ]}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
