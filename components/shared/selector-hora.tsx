"use client"

import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PASO_MINUTOS = 5

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`
}

/**
 * Hora "HH:mm" elegida de una lista que solo va de `min` a `max` (el horario
 * del turno), así no se puede escoger una hora fuera de él. Sin rango no
 * ofrece nada: primero hay que elegir el turno.
 */
export function SelectorHora({
  value,
  onChange,
  min,
  max,
  placeholder = "--:--",
  invalido,
  ariaLabel,
  bloquesDesde,
  minutosBloque = 45,
  deshabilitada,
}: {
  value: string
  onChange: (hora: string) => void
  min?: string | null
  max?: string | null
  placeholder?: string
  invalido?: boolean
  ariaLabel: string
  /**
   * Hora de fin de una clase: solo ofrece bloques completos desde esta hora
   * (inicio + 45, + 90…) hasta `max`. Sin inicio elegido no ofrece nada.
   */
  bloquesDesde?: string | null
  minutosBloque?: number
  /** Horas que se muestran pero no se pueden elegir (por ejemplo, dentro del recreo). */
  deshabilitada?: (hora: string) => boolean
}) {
  const porBloques = bloquesDesde !== undefined
  const opciones = useMemo(() => {
    if (!min || !max) return []
    const lista: string[] = []
    if (porBloques) {
      if (!bloquesDesde) return []
      for (let m = aMinutos(bloquesDesde) + minutosBloque; m <= aMinutos(max); m += minutosBloque) lista.push(aHora(m))
      return lista
    }
    for (let m = aMinutos(min); m <= aMinutos(max); m += PASO_MINUTOS) lista.push(aHora(m))
    return lista
  }, [min, max, porBloques, bloquesDesde, minutosBloque])

  // "11:30 (2 horas)": cuántas horas pedagógicas dura la clase hasta esa hora.
  const etiqueta = (hora: string) => {
    if (!porBloques || !bloquesDesde) return hora
    const bloques = (aMinutos(hora) - aMinutos(bloquesDesde)) / minutosBloque
    return `${hora} (${bloques} ${bloques === 1 ? "hora" : "horas"})`
  }

  return (
    <Select value={value || null} onValueChange={(v) => onChange(v ?? "")} disabled={!opciones.length}>
      <SelectTrigger className="w-full font-mono" aria-label={ariaLabel} aria-invalid={invalido || undefined}>
        <SelectValue>{value ? etiqueta(value) : porBloques && !bloquesDesde ? "Elige el inicio" : placeholder}</SelectValue>
      </SelectTrigger>
      {/* Lista corta con scroll y abierta hacia abajo: con 60 horas no tapa el formulario. */}
      <SelectContent side="bottom" className="max-h-60 w-auto min-w-(--anchor-width)">
        <SelectGroup>
          {opciones.map((hora) => (
            <SelectItem key={hora} value={hora} className="font-mono" disabled={deshabilitada?.(hora)}>
              {etiqueta(hora)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
