"use client"

import { useState } from "react"
import { History } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { useHistorialCalificaciones } from "@/hooks/use-evaluaciones"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { RECONOCIMIENTO_ACTIVO, type NotaHistorica } from "@/lib/api/evaluaciones"
import { formatearFecha } from "@/lib/fechas"

const TODOS = "todos"

/** Notas del alumno en otras secciones del curso y año. Solo consulta. */
export function HistorialCalificacionesDialog({ idMatricula, idAsignacion, nombre, periodos }: {
  idMatricula: number
  idAsignacion: number
  nombre: string
  periodos: PeriodoEvaluacion[]
}) {
  const [open, setOpen] = useState(false)
  const [periodo, setPeriodo] = useState(TODOS)
  const historial = useHistorialCalificaciones(idMatricula, idAsignacion, open)
  const periodosConNotas = periodos.filter((p) => historial.data?.some((n) => n.periodo === p.numero))
  const items = [{ value: TODOS, label: "Todos los periodos" }, ...periodosConNotas.map((p) => ({ value: String(p.numero), label: p.nombre }))]
  const visibles = historial.data?.filter((n) => periodo === TODOS || n.periodo === Number(periodo)) ?? []

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Calificaciones de otras secciones"
        aria-label={`Calificaciones de otras secciones de ${nombre}`}
        onClick={() => setOpen(true)}
      >
        <History className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent forceOverlay className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calificaciones de otras secciones · {nombre}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Para usar una nota aquí, elige “No rinde” al crear la evaluación o “Usar esta nota” al calificarla.
          </p>
          {historial.isLoading ? (
            <p className="text-sm">Cargando historial…</p>
          ) : historial.isError ? (
            <p role="alert" className="text-sm text-destructive">{historial.error.message}</p>
          ) : (
            <>
              <Select items={items} value={periodo} onValueChange={(v) => setPeriodo(v ?? TODOS)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!visibles.length && (
                <p className="text-sm text-muted-foreground">No hay calificaciones de otras secciones en este curso y año.</p>
              )}
              {visibles.map((n) => (
                <NotaAnterior
                  key={n.idNotaOrigen}
                  nota={n}
                  periodoNombre={periodos.find((p) => p.numero === n.periodo)?.nombre ?? String(n.periodo)}
                />
              ))}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function NotaAnterior({ nota, periodoNombre }: { nota: NotaHistorica; periodoNombre: string }) {
  return (
    <TarjetaSeccion className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{nota.evaluacion}</p>
        <Badge variant="secondary">{nota.calificacion}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {nota.seccion} · {nota.curso}{nota.area ? ` (${nota.area})` : ""} · {periodoNombre} · {formatearFecha(nota.fecha)}
      </p>
      <ul className="space-y-1 text-xs">
        {nota.competencias.map((c) => (
          <li key={c.idCompetencia} className="flex gap-2">
            <span className="shrink-0 font-medium">{c.codigo}.</span>
            <span>{c.nombre}</span>
          </li>
        ))}
      </ul>
      {nota.bloqueo && <p className="text-xs text-muted-foreground">{nota.bloqueo}</p>}
      {nota.reconocimientos.map((r) => (
        <div key={r.idReconocimiento} className="space-y-1 border-t pt-2 text-xs">
          <p>
            <Badge variant={r.estado === RECONOCIMIENTO_ACTIVO ? "info" : "outline"}>
              {r.estado === RECONOCIMIENTO_ACTIVO ? "Usada" : "Anulada"}
            </Badge>{" "}
            {r.calificacion} → {r.evaluacionDestino} · {r.seccionDestino}
          </p>
          <p className="text-muted-foreground">
            {r.usuario} · {formatearFecha(r.fecha)}
            {r.motivoAnulacion ? ` · Anulada por ${r.usuarioAnulacion}: ${r.motivoAnulacion}` : ""}
          </p>
        </div>
      ))}
    </TarjetaSeccion>
  )
}
