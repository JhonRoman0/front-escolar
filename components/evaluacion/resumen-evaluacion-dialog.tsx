"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useResumenEvaluacion } from "@/hooks/use-evaluaciones"
import { formatearFecha, formatearHora } from "@/lib/fechas"

/** Ficha de solo lectura de una evaluación. */
export function ResumenEvaluacionDialog({
  idEvaluacion,
  onOpenChange,
}: {
  idEvaluacion: number | null
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError, error } = useResumenEvaluacion(idEvaluacion)
  return (
    <Dialog open={idEvaluacion != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.nombre ?? "Resumen de la evaluación"}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <CargandoTarjetas filas={1} />
        ) : isError || !data ? (
          <p role="alert" className="text-sm text-destructive">
            {error instanceof Error ? error.message : "No se pudo cargar el resumen"}
          </p>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Dato etiqueta="Periodo" valor={data.periodo} />
              <Dato etiqueta="Fecha de evaluación" valor={formatearFecha(data.fecha)} />
              <Dato etiqueta="Creada por" valor={data.creadoPor} />
              <Dato
                etiqueta="Fecha de creación"
                // "2026-11-16T09:30:00" → 16/11/2026 09:30
                valor={`${formatearFecha(data.fechaCreacion)} ${formatearHora(data.fechaCreacion?.slice(11))}`}
              />
              <Dato etiqueta="Notas registradas" valor={`${data.notasRegistradas} de ${data.totalAlumnos}`} />
            </dl>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Competencias evaluadas</p>
              <ul className="flex flex-col gap-2">
                {data.competencias.map((c) => (
                  <li key={c.idCompetencia} className="flex items-start gap-2 rounded-lg border p-2.5">
                    <Badge variant="secondary" className="shrink-0">{c.codigo}</Badge>
                    <span>{c.nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogTrigger render={<Button variant="outline" />}>Cerrar</DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}
