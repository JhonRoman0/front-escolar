"use client"

import * as React from "react"
import type { Matcher } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { dateAIso, formatearFecha, isoADate } from "@/lib/fechas"
import { CalendarIcon } from "lucide-react"

export interface SelectorFechaProps {
  label: string
  /** "YYYY-MM-DD" o "" si no hay fecha elegida. */
  value: string
  onChange: (iso: string) => void
  descripcion?: string
  error?: { message?: string } | undefined
  /** "YYYY-MM-DD" inclusive. */
  min?: string | undefined
  max?: string | undefined
  placeholder?: string
  deshabilitado?: boolean
  autoFocus?: boolean
  className?: string
}

export function SelectorFecha({
  label,
  value,
  onChange,
  descripcion,
  error,
  min,
  max,
  placeholder = "Selecciona una fecha",
  deshabilitado,
  autoFocus,
  className,
}: SelectorFechaProps) {
  const [abierto, setAbierto] = React.useState(false)
  const id = React.useId()

  const seleccionada = isoADate(value)

  // El mes se controla a mano para que el calendario abra en el mes de la fecha
  // ya elegida y no en el mes actual.
  const [mes, setMes] = React.useState<Date | undefined>(seleccionada)

  function handleOpenChange(open: boolean) {
    setAbierto(open)
    if (open) setMes(seleccionada ?? undefined)
  }

  // react-day-picker exige `before` y `after` en un DateInterval, así que no cabe
  // un objeto con cotas opcionales. Se usan funciones, que sí admiten una sola.
  const limites = React.useMemo(() => {
    const antes = isoADate(min)
    const despues = isoADate(max)
    const matcher: Matcher[] = []
    if (antes) matcher.push((dia) => dia < antes)
    if (despues) matcher.push((dia) => dia > despues)
    return matcher.length ? matcher : undefined
  }, [min, max])

  return (
    <Field className={className} data-invalid={error ? "" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Popover open={abierto} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            id={id}
            // Un button dentro de un form dispara submit al pulsarlo con Enter,
            // así que se anula explícitamente.
            type="button"
            disabled={deshabilitado}
            aria-invalid={error ? true : undefined}
            className={cn(
              "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              "data-[invalid]:border-destructive data-[invalid]:ring-3 data-[invalid]:ring-destructive/20",
              !seleccionada && "text-muted-foreground"
            )}
          >
            <span className="flex-1 truncate text-left">
              {seleccionada ? formatearFecha(seleccionada) : placeholder}
            </span>
            <CalendarIcon className="size-4 shrink-0 opacity-60" />
          </PopoverTrigger>
          <PopoverContent
            // side="bottom" es el default del wrapper, pero aquí es requisito
            // y se deja explícito: el calendario siempre se abre hacia abajo.
            // collisionAvoidance side "none" desactiva el flip por defecto de
            // Base UI, que voltea el popup arriba cuando no cabe por debajo.
            // El max-h de seguridad usa la var que Base UI calcula con el
            // espacio real hasta el borde del viewport: en resoluciones
            // normales queda por encima del contenido (no aparece scrollbar)
            // y solo corta con scroll en pantallas de poca altura.
            className="p-0 max-h-[var(--available-height)] overflow-y-auto"
            side="bottom"
            align="start"
            collisionAvoidance={{ side: "none" }}
          >
            <Calendar
              // fixedWeeks: siempre 6 filas por mes, sea cual sea el mes, así
              // el popup no cambia de alto al navegar y las flechas de mes
              // permanecen siempre en el mismo sitio. p-1.5: el padding del
              // wrapper (p-3) ocupa demasiado en un popup de diálogo.
              mode="single"
              fixedWeeks
              className="p-1.5"
              autoFocus={autoFocus}
              selected={seleccionada}
              month={mes}
              onMonthChange={setMes}
              onSelect={(fecha) => {
                // react-day-picker llama onSelect también al deseleccionar.
                onChange(fecha ? dateAIso(fecha) : "")
                setAbierto(false)
              }}
              disabled={limites}
              startMonth={isoADate(min)}
              endMonth={isoADate(max)}
            />
          </PopoverContent>
        </Popover>
        {!error && descripcion && (
          <FieldDescription className="text-xs">{descripcion}</FieldDescription>
        )}
        <FieldError errors={[error]} />
      </FieldContent>
    </Field>
  )
}