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
}: {
  value: string
  onChange: (hora: string) => void
  min?: string | null
  max?: string | null
  placeholder?: string
  invalido?: boolean
  ariaLabel: string
}) {
  const opciones = useMemo(() => {
    if (!min || !max) return []
    const lista: string[] = []
    for (let m = aMinutos(min); m <= aMinutos(max); m += PASO_MINUTOS) lista.push(aHora(m))
    return lista
  }, [min, max])

  return (
    <Select value={value || null} onValueChange={(v) => onChange(v ?? "")} disabled={!opciones.length}>
      <SelectTrigger className="w-full font-mono" aria-label={ariaLabel} aria-invalid={invalido || undefined}>
        <SelectValue>{value || placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {opciones.map((hora) => (
            <SelectItem key={hora} value={hora} className="font-mono">
              {hora}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
