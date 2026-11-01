"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"

/**
 * Casilla del formulario de edición: al guardar con ella marcada se genera una
 * contraseña nueva y se envía al correo del formulario. Sin marcar no cambia nada.
 * La altura iguala a la del selector de Estado, que va a su lado.
 */
export function CampoRestablecerContrasena({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field>
      <FieldLabel>Contraseña</FieldLabel>
      <FieldContent>
        <label className="flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
          Restablecer
        </label>
        {checked && (
          <FieldDescription className="text-xs">Se enviará una nueva al correo.</FieldDescription>
        )}
      </FieldContent>
    </Field>
  )
}

/**
 * Al cambiar el correo la casilla se marca sola, y se desmarca si vuelve al
 * guardado. Solo actúa en esos cruces: si se desmarca a mano, seguir escribiendo
 * no la vuelve a marcar. null: no tocarla.
 */
export function casillaTrasCambiarCorreo(
  anterior: string,
  nuevo: string,
  guardado: string | null | undefined
): boolean | null {
  const normalizar = (correo: string | null | undefined) => (correo ?? "").trim().toLowerCase()
  const eraDistinto = normalizar(anterior) !== normalizar(guardado)
  const esDistinto = normalizar(nuevo) !== normalizar(guardado)
  return eraDistinto === esDistinto ? null : esDistinto
}
