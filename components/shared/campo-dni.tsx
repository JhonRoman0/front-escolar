"use client"

import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { BuscarDniButton } from "@/components/shared/buscar-dni-button"

interface CampoDniProps {
  value: string | null | undefined
  onChange: (v: string) => void
  onBlur?: () => void
  name?: string
  inputRef?: React.Ref<HTMLInputElement>
  cargando?: boolean
  onBuscar: () => void
  error?: { message?: string }
  autoFocus?: boolean
  label?: string
  placeholder?: string
}

export function CampoDni({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  cargando,
  onBuscar,
  error,
  autoFocus,
  label = "DNI",
  placeholder = "12345678",
}: CampoDniProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            maxLength={8}
            autoFocus={autoFocus}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            name={name}
            ref={inputRef as React.Ref<HTMLInputElement>}
            className="flex-1"
            inputMode="numeric"
          />
          <BuscarDniButton dni={value ?? ""} cargando={cargando} onBuscar={onBuscar} />
        </div>
        <p className="text-xs text-muted-foreground">Escribe el DNI y pulsa Buscar para completar el nombre automáticamente.</p>
        <FieldError errors={error ? [error] : []} />
      </FieldContent>
    </Field>
  )
}
