"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import type { MatriculaResponse } from "@/lib/api/matricula"

interface HistorialDialogProps {
  matricula: MatriculaResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HistorialDialog({
  matricula,
  open,
  onOpenChange,
}: HistorialDialogProps) {
  const historial = matricula.historial

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historial de secciones</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{matricula.alumno}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {matricula.codigoAlumno}
            </p>
          </div>

          {!historial.length ? (
            <p className="text-sm text-muted-foreground">
              Sin historial de cambios de sección.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l pl-4">
              {[...historial]
                .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
                .map((h) => (
                  <li key={h.idHistorial} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {h.grado} {h.seccion}
                      </p>
                      <Badge variant="secondary">{h.turno}</Badge>
                      <Badge variant="outline">Año {h.idAnio}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {h.fechaInicio}
                      {h.fechaFinal ? ` → ${h.fechaFinal}` : " → actual"}
                    </p>
                    {h.motivo && (
                      <p className="text-xs italic text-muted-foreground">
                        {h.motivo}
                      </p>
                    )}
                  </li>
                ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}