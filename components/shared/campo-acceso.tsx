"use client"

import type { LucideIcon } from "lucide-react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Base visual del campo en las pantallas de acceso. Los tamaños de texto usan los
 * tokens semánticos de la escala; el peso del contenido vive aquí porque en un
 * campo de acceso siempre es el mismo.
 */
const campoBase =
  "h-campo-alto rounded-2xl border-[0.5px] border-borde-campo text-campo font-semibold text-foreground placeholder:text-borde-campo focus-visible:ring-brand-info"

/**
 * Campo de formulario de las pantallas de acceso (login, recuperar contraseña y
 * restablecer contraseña). Colapsa el esqueleto Field/FieldContent/FieldError, el
 * label con la tipografía de la escala, el icono posicionado a la izquierda y el
 * botón de mostrar contraseña.
 *
 * Sigue el patrón de CampoDni: es presentacional y recibe las props del input de
 * forma plana, así que sirve tanto para el `{...field}` de un Controller como para
 * el `{...register()}` de react-hook-form, sin que el componente sepa de cuál es.
 *
 * `icono` y `alternable` son las dos únicas razones por las que el campo necesita
 * espacio extra a los lados, y cada una lo aplica por su cuenta. Cualquier otro
 * ajuste llega por `className` y twMerge lo resuelve contra la base.
 */
interface CampoAccesoProps extends React.ComponentProps<"input"> {
  etiqueta: string
  error?: { message?: string }
  /** Icono a la izquierda del campo. Añade el padding para no solaparlo. */
  icono?: LucideIcon
  /** Texto de ayuda bajo el campo, antes del error. */
  auxiliar?: string
  /** Muestra el botón de ojo para alternar entre texto y contraseña. */
  alternable?: boolean
  /** Estado actual del botón de ojo. */
  alternando?: boolean
  onAlternar?: () => void
}

export function CampoAcceso({
  etiqueta,
  error,
  icono: Icono,
  auxiliar,
  alternable = false,
  alternando = false,
  onAlternar,
  className,
  ...props
}: CampoAccesoProps) {
  const decorado = Boolean(Icono) || alternable

  const input = (
    <Input
      className={cn(
        campoBase,
        Icono && "pl-10",
        alternable && "pr-10",
        className
      )}
      {...props}
    />
  )

  return (
    <Field>
      <FieldLabel className="text-label font-bold">{etiqueta}</FieldLabel>
      <FieldContent>
        {decorado ? (
          <div className="relative">
            {Icono && (
              <Icono className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            {input}
            {alternable && (
              <button
                type="button"
                onClick={onAlternar}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={alternando ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {alternando ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        ) : (
          input
        )}
        {auxiliar && (
          <p className="mt-1 text-mini text-muted-foreground">{auxiliar}</p>
        )}
        <FieldError errors={error ? [error] : []} />
      </FieldContent>
    </Field>
  )
}

/**
 * Clases del botón primario de las pantallas de acceso. Sigue siendo una constante
 * y no un componente: los tres formularios comparten estas clases, pero el
 * contenido del botón cambia entre pantallas (login añade un icono de flecha), así
 * que un componente necesitaría props solo para eso.
 */
export const botonAcceso =
  "h-campo-alto w-full rounded-2xl bg-brand-info text-boton font-semibold text-primary-foreground hover:bg-brand-info-hover"