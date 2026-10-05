"use client"

import { useState } from "react"
import { ClipboardCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useJustificaciones } from "@/hooks/use-asistencia"
import type { AsistenciaDiaResponse } from "@/lib/api/asistencia"
import { justificarRequestSchema } from "@/lib/schemas/asistencia"

import { AsistenciaEstadoBadge } from "./asistencia-estado-badge"

interface JustificarAsistenciaDialogProps {
  target: AsistenciaDiaResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (idJustificacion: number) => Promise<void>
  registrando?: boolean
}

/** Cambia una asistencia existente a "Justificada" (PUT /asistencias/{id}/justificar). */
export function JustificarAsistenciaDialog({
  target,
  open,
  onOpenChange,
  onConfirm,
  registrando = false,
}: JustificarAsistenciaDialogProps) {
  const [idJustificacion, setIdJustificacion] = useState<number | null>(null)
  const { data: justificaciones } = useJustificaciones()

  async function handleConfirm() {
    const parsed = justificarRequestSchema.safeParse({ idJustificacion: idJustificacion ?? 0 })
    if (!parsed.success) return
    await onConfirm(parsed.data.idJustificacion)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Justificar asistencia</DialogTitle>
          <DialogDescription>
            El estado cambiará a <strong>Justificada</strong> conservando la
            hora de entrada registrada.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="font-medium">{target.alumno}</p>
              <p className="text-sm text-muted-foreground">
                {target.grado} - Sección {target.seccion}
              </p>
              <div className="mt-2">
                <AsistenciaEstadoBadge estado={target.estado} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Motivo de justificación <span className="text-destructive">*</span>
              </p>
              <Select
                value={idJustificacion?.toString() ?? ""}
                onValueChange={(v) => setIdJustificacion(Number(v))}
              >
                <SelectTrigger className="w-full text-foreground">
                  <SelectValue placeholder="Selecciona un motivo">
                    {justificaciones?.find(
                      (j) => j.idJustificacion === idJustificacion
                    )?.motivo ?? "Selecciona un motivo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(justificaciones ?? []).map((j) => (
                    <SelectItem
                      key={j.idJustificacion}
                      value={j.idJustificacion.toString()}
                    >
                      {j.motivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!idJustificacion || registrando}
          >
            {registrando ? (
              <>
                <Loader2 className="animate-spin" />
                Justificando...
              </>
            ) : (
              <>
                <ClipboardCheck />
                Justificar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
