"use client"

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"

import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { REGEX_NO_LETRAS_ESPACIOS } from "@/lib/schemas/comun"

const CAMPOS = [
  { nombre: "nombre", label: "Nombres *", placeholder: "María" },
  { nombre: "apellidoPat", label: "Ap. paterno *", placeholder: "López" },
  { nombre: "apellidoMat", label: "Ap. materno *", placeholder: "Ramírez" },
] as const

type NombreCampo = (typeof CAMPOS)[number]["nombre"]

interface CamposNombresProps<T extends FieldValues> {
  control: Control<T>
  errors?: Partial<Record<NombreCampo, { message?: string } | undefined>>
}

export function CamposNombres<T extends FieldValues>({
  control,
  errors,
}: CamposNombresProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CAMPOS.map((campo) => (
        <Controller
          key={campo.nombre}
          control={control}
          name={campo.nombre as Path<T>}
          render={({ field }) => (
            <Field>
              <FieldLabel>{campo.label}</FieldLabel>
              <FieldContent>
                <Input
                  placeholder={campo.placeholder}
                  maxLength={30}
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value.replace(REGEX_NO_LETRAS_ESPACIOS, ""))
                  }
                />
                <FieldError errors={errors ? [errors[campo.nombre]] : []} />
              </FieldContent>
            </Field>
          )}
        />
      ))}
    </div>
  )
}