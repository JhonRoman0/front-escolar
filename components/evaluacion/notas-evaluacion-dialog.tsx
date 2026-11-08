"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { BotonGuardar } from "@/components/shared/boton-guardar"
import { CampoCalificacion } from "@/components/shared/campo-calificacion"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useEvaluacionDetalle, useRegistrarNotasEvaluacion } from "@/hooks/use-evaluaciones"
import type { EvaluacionDetalle } from "@/lib/api/evaluaciones"
import { ESCALAS, errorCalificacion } from "@/lib/calificaciones"

/** Notas de los alumnos en una evaluación. Sin permiso o con el periodo cerrado, solo lectura. */
export function NotasEvaluacionDialog({
  idEvaluacion,
  onOpenChange,
  puedeCalificar,
}: {
  idEvaluacion: number | null
  onOpenChange: (open: boolean) => void
  puedeCalificar: boolean
}) {
  const { data, isLoading } = useEvaluacionDetalle(idEvaluacion)
  return (
    <Dialog open={idEvaluacion != null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{data?.evaluacion.nombre ?? "Notas de la evaluación"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <CargandoTarjetas filas={1} />
        ) : (
          <Contenido
            // Al guardar llega el detalle nuevo y el formulario arranca de él.
            key={JSON.stringify(data.alumnos)}
            detalle={data}
            editable={puedeCalificar && data.evaluacion.editable}
            onCerrar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ detalle, editable, onCerrar }: {
  detalle: EvaluacionDetalle
  editable: boolean
  onCerrar: () => void
}) {
  const registrar = useRegistrarNotasEvaluacion()
  const originales = Object.fromEntries(detalle.alumnos.map((a) => [a.idMatricula, a.calificacion ?? ""]))
  const [valores, setValores] = useState<Record<number, string>>(originales)
  const cambiados = detalle.alumnos.filter((a) => (valores[a.idMatricula] ?? "") !== originales[a.idMatricula])
  const conNota = Object.values(valores).filter((v) => v.trim()).length
  const conNotaFinal = detalle.alumnos.filter((a) => a.notaFinalRegistrada).length
  const invalidos = detalle.alumnos.filter((a) => errorCalificacion(detalle.escala, valores[a.idMatricula] ?? ""))
  const escala = ESCALAS.find((e) => e.value === detalle.escala)

  async function guardar() {
    if (invalidos.length) {
      toast.error(`Hay ${invalidos.length} ${invalidos.length === 1 ? "nota inválida" : "notas inválidas"}: ${escala?.detalle}`)
      return
    }
    try {
      await registrar.mutateAsync({
        id: detalle.evaluacion.idEvaluacion,
        notas: cambiados.map((a) => ({ idMatricula: a.idMatricula, calificacion: valores[a.idMatricula] || null })),
      })
      toast.success("Notas guardadas")
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las notas")
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void guardar()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Escala {escala?.label.toLowerCase()} ({escala?.detalle})
        </span>
        <span>
          {conNota} de {detalle.alumnos.length} con nota
        </span>
      </div>
      {!editable && (
        <p className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          {detalle.evaluacion.editable ? "No tienes permiso para registrar notas." : "El periodo está cerrado: solo lectura."}
        </p>
      )}
      {editable && conNotaFinal > 0 && (
        <p className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <Lock className="size-3.5 text-amber-600" />
          {conNotaFinal === detalle.alumnos.length
            ? "Todos los alumnos ya tienen nota final en las competencias de esta evaluación: sus notas no se pueden cambiar."
            : `${conNotaFinal} ${conNotaFinal === 1 ? "alumno ya tiene" : "alumnos ya tienen"} nota final en las competencias de esta evaluación: su nota no se puede cambiar.`}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead className="w-[110px] text-center">Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.alumnos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  No hay alumnos matriculados en esta sección.
                </TableCell>
              </TableRow>
            ) : (
              detalle.alumnos.map((a, i) => (
                <TableRow key={a.idMatricula}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{a.nombre}</p>
                    <p className="text-xs text-muted-foreground">{a.codigo}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {editable && !a.notaFinalRegistrada ? (
                        <CampoCalificacion
                          escala={detalle.escala}
                          value={valores[a.idMatricula] ?? ""}
                          onChange={(v) => setValores((actual) => ({ ...actual, [a.idMatricula]: v }))}
                          ariaLabel={`Nota de ${a.nombre}`}
                        />
                      ) : (
                        <span
                          className="flex items-center gap-1 font-mono font-semibold"
                          title={a.notaFinalRegistrada ? "Ya tiene nota final: no se puede cambiar" : undefined}
                        >
                          {a.calificacion ?? "—"}
                          {editable && a.notaFinalRegistrada && <Lock className="size-3 text-muted-foreground" />}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="shrink-0">
        <DialogTrigger render={<Button variant="outline" />}>{editable ? "Cancelar" : "Cerrar"}</DialogTrigger>
        {editable && (
          <BotonGuardar etiqueta="Guardar notas" enviando={registrar.isPending} disabled={!cambiados.length} />
        )}
      </DialogFooter>
    </form>
  )
}
