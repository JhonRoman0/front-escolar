import { useEffect, type DependencyList } from "react"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"

/**
 * El diálogo de cada catálogo se renderiza siempre y solo cambia `open`, así
 * que useForm conserva los valores entre aperturas. Resetear al abrir deja el
 * form limpio sin depender de una key que solo remonta cuando cambia el
 * registro. Los valores y las deps se pasan por primitivos (nombre, accesoId...)
 * y no por el objeto del registro: un refetch de React Query devuelve una
 * referencia nueva y con el objeto en las deps el reset se dispararía mientras
 * se escribe.
 */
export function useResetAlAbrir<T extends FieldValues>(
  open: boolean,
  form: UseFormReturn<T>,
  valores: DefaultValues<T>,
  deps: DependencyList
) {
  useEffect(
    () => {
      if (!open) return
      form.reset(valores)
    },
    // Las deps llegan del caller; `valores` es un objeto nuevo en cada render y
    // meterlo dispararía el reset en bucle, así que la regla se relaja a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, form, ...deps]
  )
}