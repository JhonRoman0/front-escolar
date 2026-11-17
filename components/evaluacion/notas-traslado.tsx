"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowRightLeft, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useAnularReconocimiento, useReconocerCalificacion } from "@/hooks/use-evaluaciones"
import { MOTIVO_ANULACION_MAXIMO, type OpcionTraslado, type Traslado } from "@/lib/api/evaluaciones"
import { formatearFecha } from "@/lib/fechas"

export const RINDE = "rinde"

/** "15 · Examen B (2do B · Mañana, 10/10/2026)" */
export function textoOpcion(o: OpcionTraslado): string {
  return `${o.calificacion} · ${o.evaluacion} (${o.seccion}, ${formatearFecha(o.fecha)})`
}

/** Elige si el alumno rinde o qué nota de otra sección usa. Sin "rinde", solo sus notas. */
export function SelectorNotaTraslado({
  traslado,
  value,
  onChange,
  conRinde = true,
  disabled,
}: {
  traslado: Traslado
  value: string
  onChange: (value: string) => void
  conRinde?: boolean
  disabled?: boolean
}) {
  const items = [
    ...(conRinde ? [{ value: RINDE, label: "Rinde la evaluación" }] : []),
    ...traslado.opciones.map((o) => ({
      value: String(o.idNotaOrigen),
      label: `${conRinde ? "No rinde: usa " : ""}${textoOpcion(o)}`,
    })),
  ]
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? (conRinde ? RINDE : ""))} disabled={disabled}>
      <SelectTrigger
        className="h-auto min-h-8 w-full whitespace-normal text-left [&_[data-slot=select-value]]:line-clamp-none"
        aria-label={`Nota de otra sección para ${traslado.nombre}`}
      >
        <SelectValue placeholder="Elige la nota" />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value} className="py-1.5 [&>*:first-child]:shrink [&>*:first-child]:whitespace-normal">
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** En una evaluación ya creada: propone la nota de otra sección y el docente confirma. */
export function UsarNotaTraslado({
  traslado,
  idEvaluacion,
  disabled,
}: {
  traslado: Traslado
  idEvaluacion: number
  disabled?: boolean
}) {
  const unica = traslado.opciones.length === 1
  const [elegida, setElegida] = useState(unica ? String(traslado.opciones[0].idNotaOrigen) : "")
  const reconocer = useReconocerCalificacion()
  const opcion = traslado.opciones.find((o) => String(o.idNotaOrigen) === elegida)

  async function usar() {
    if (!opcion) return
    try {
      await reconocer.mutateAsync({
        idNotaOrigen: opcion.idNotaOrigen,
        idEvaluacionDestino: idEvaluacion,
        calificacionOrigen: opcion.calificacion,
      })
      toast.success(`${traslado.nombre} usa su nota de ${opcion.seccion}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo usar la nota")
    }
  }

  return (
    <div className="mt-1 flex flex-col gap-1 rounded-md border border-brand-info/20 bg-brand-subtle/60 p-2 text-xs dark:border-blue-800/50 dark:bg-blue-950/30">
      <span className="flex items-center gap-1 font-medium">
        <ArrowRightLeft className="size-3 text-brand-info dark:text-blue-300" />
        Trae {unica ? "una nota" : "notas"} de otra sección
      </span>
      {unica ? (
        <span className="text-muted-foreground">{textoOpcion(traslado.opciones[0])}</span>
      ) : (
        <SelectorNotaTraslado traslado={traslado} value={elegida} onChange={setElegida} conRinde={false} disabled={disabled} />
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={disabled || !opcion || reconocer.isPending}
        title={disabled ? "Guarda las notas pendientes primero" : undefined}
        onClick={usar}
      >
        Usar esta nota
      </Button>
    </div>
  )
}

/** Deshace el uso de una nota de otra sección: el alumno pasa a rendir la evaluación. */
export function AnularUsoNota({
  idReconocimiento,
  nombre,
  disabled,
}: {
  idReconocimiento: number
  nombre: string
  disabled?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState("")
  const anular = useAnularReconocimiento()

  async function confirmar() {
    try {
      await anular.mutateAsync({ id: idReconocimiento, motivo: motivo.trim() })
      toast.success(`${nombre} rendirá la evaluación`)
      setAbierto(false)
      setMotivo("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anular")
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            title={disabled ? "Guarda las notas pendientes primero" : "Anular: el alumno rendirá la evaluación"}
            aria-label={`Anular el uso de la nota de ${nombre}`}
          />
        }
      >
        <Undo2 />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <p className="text-xs font-semibold">Anular el uso de la nota</p>
        <p className="mb-2 text-xs text-muted-foreground">
          {nombre} rendirá la evaluación y se le pondrá nota aquí. La nota original no cambia.
        </p>
        <Textarea
          rows={3}
          maxLength={MOTIVO_ANULACION_MAXIMO}
          placeholder="Motivo *"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="outline" disabled={!motivo.trim() || anular.isPending} onClick={confirmar}>
            Anular
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
