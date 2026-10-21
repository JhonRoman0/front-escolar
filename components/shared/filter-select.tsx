"use client"

import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  /** Encabezado visual no seleccionable bajo el que se agrupan opciones consecutivas. */
  group?: string
}

interface FilterSelectProps {
  /** Si está definido, se muestra como prefijo `<label>:` antepuesto al valor. */
  label?: string
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  /** Si false, no existe la opción "Todos": el select siempre tiene un valor real. */
  includeAll?: boolean
  allLabel?: string
  className?: string
  disabled?: boolean
  /**
   * Para opciones con textos largos (por ejemplo nombres de áreas): la lista
   * puede ser más ancha que el botón y los textos bajan de línea en vez de cortarse.
   */
  opcionesLargas?: boolean
}

/**
 * Select compacto de filtros. Label y valor viven en el mismo trigger y se
 * distinguen por color (label atenuado, valor foreground) con peso normal,
 * para que el valor no compita con la tipografía de la tabla.
 */
export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  includeAll = true,
  allLabel = "Todos",
  className,
  disabled,
  opcionesLargas,
}: FilterSelectProps) {
  const seleccion = options.find((o) => o.value === value)
  const valor = seleccion?.label ?? (value ? value : allLabel)

  // Secciones del dropdown. Las opciones se agrupan cuando comparten `group`
  // seguido; la opción "Todos" queda en su propia sección si el resto viene
  // agrupado. Con opciones planas (sin `group`) la lista se renderiza como
  // hoy: una sola sección sin encabezado.
  const secciones = useMemo(() => {
    const grupos: { label: string | null; opciones: FilterOption[] }[] = []
    if (includeAll) {
      grupos.push({ label: null, opciones: [{ value: "", label: allLabel }] })
    }
    for (const op of options) {
      const grupo = op.group ?? null
      const ultima = grupos[grupos.length - 1]
      if (ultima && ultima.label === grupo) {
        ultima.opciones.push(op)
      } else {
        grupos.push({ label: grupo, opciones: [op] })
      }
    }
    return grupos
  }, [options, includeAll, allLabel])

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v ?? "")}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-8", className)}>
        <SelectValue>
          {label != null && (
            <span className="text-muted-foreground">{label}:</span>
          )}
          <span className={cn("text-foreground", opcionesLargas && "truncate")}>{valor}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className={opcionesLargas ? "w-auto min-w-(--anchor-width) max-w-[min(26rem,calc(100vw-2rem))]" : undefined}
      >
        {secciones.map((seccion, i) => (
          <SelectGroup key={i}>
            {seccion.label != null && <SelectLabel>{seccion.label}</SelectLabel>}
            {seccion.opciones.map((op) => (
              <SelectItem
                key={op.value}
                value={op.value}
                className={opcionesLargas ? "py-1.5 [&>*:first-child]:shrink [&>*:first-child]:whitespace-normal" : undefined}
              >
                {op.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}