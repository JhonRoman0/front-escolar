"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import { usePromedio } from "@/hooks/use-evaluacion"

const COLORES_BIMESTRE = [
  "",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
]

const CALIFICACION_COLORS: Record<string, string> = {
  AD: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  C: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
}

export function PromedioDialog({
  idMatricula,
  nombreAlumno,
  codigoAlumno,
  open,
  onOpenChange,
}: {
  idMatricula: number
  nombreAlumno: string
  codigoAlumno: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError } = usePromedio(open ? idMatricula : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Promedio de {nombreAlumno}
          </DialogTitle>
          <DialogDescription>
            Promedio literal por bimestre de {codigoAlumno}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" /> Calculando...
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            No se pudo calcular el promedio.
          </p>
        ) : !data?.promedios.length ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay notas registradas para este alumno.
          </p>
        ) : (
          <div className="space-y-2">
            {data.promedios.map((p) => (
              <div
                key={p.bimestre}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge className={COLORES_BIMESTRE[p.bimestre] ?? ""}>
                    B{p.bimestre}
                  </Badge>
                </div>
                <Badge
                  className={CALIFICACION_COLORS[p.promedioLiteral] ?? ""}
                  variant="outline"
                >
                  {p.promedioLiteral}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
