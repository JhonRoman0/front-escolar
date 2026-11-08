"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { EscalaCalificacion } from "@/lib/api/academico"
import { errorCalificacion, LITERALES } from "@/lib/calificaciones"

const SIN_NOTA = "__sin_nota__"

/**
 * Nota en la escala del nivel: lista AD, A, B, C o número de 0 a 20 (solo
 * dígitos). Vacío significa sin nota.
 */
export function CampoCalificacion({
  escala,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  escala: EscalaCalificacion
  value: string
  onChange: (valor: string) => void
  disabled?: boolean
  ariaLabel: string
}) {
  if (escala === "LITERAL") {
    return (
      <Select value={value || SIN_NOTA} onValueChange={(v) => onChange(!v || v === SIN_NOTA ? "" : v)} disabled={disabled}>
        <SelectTrigger className="h-8 w-[88px]" aria-label={ariaLabel}>
          <SelectValue>{value || "—"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_NOTA}>Sin nota</SelectItem>
          {LITERALES.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      className="h-8 w-[72px] text-center"
      inputMode="numeric"
      maxLength={2}
      placeholder="—"
      aria-label={ariaLabel}
      aria-invalid={!!errorCalificacion(escala, value)}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
    />
  )
}
