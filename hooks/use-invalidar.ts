import { useQueryClient } from "@tanstack/react-query"

/**
 * Devuelve una función que invalida una o varias query keys de react-query.
 * Usar como `onSuccess` de una mutación para refrescar las listas afectadas.
 *
 * Ej: const invalidar = useInvalidarMutacion(KEYS.asistencias, KEYS.estadisticas)
 */
export function useInvalidarMutacion(...keys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient()
  return () => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }))
  }
}
