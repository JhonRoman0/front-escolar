"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Campo de contraseña de los formularios (Usuario, Docente). Colapsa el
 * esqueleto Field/FieldContent/FieldError de la contraseña y el botón de ojo
 * para alternar entre oculta y visible, alineado a la derecha del input.
 *
 * Sigue el patrón de CampoDni: recibe las props del input de forma plana, así
 * que sirve tanto para el `{...field}` de un Controller como para un registro
 * de react-hook-form. El texto de ayuda llega por `descripcion`.
 */
interface CampoContrasenaProps {
  value: string | undefined
  onChange: (v: string) => void
  onBlur?: () => void
  name?: string
  inputRef?: React.Ref<HTMLInputElement>
  error?: { message?: string }
  label?: string
  descripcion?: string
  placeholder?: string
}

export function CampoContrasena({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  error,
  label = "Contraseña",
  descripcion,
  placeholder = "••••••••",
}: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="relative">
          <Input
            type={visible ? "text" : "password"}
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            name={name}
            ref={inputRef as React.Ref<HTMLInputElement>}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {descripcion && (
          <p className="mt-2 text-xs leading-4 text-muted-foreground">{descripcion}</p>
        )}
        <FieldError errors={error ? [error] : []} />
      </FieldContent>
    </Field>
  )
}