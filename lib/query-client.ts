import { MutationCache, QueryClient } from "@tanstack/react-query"

/** Mutaciones que solo consultan (buscar por DNI, previsualizar): no cambian datos. */
export const SOLO_LECTURA = { soloLectura: true } as const

/**
 * Caché del frontend. Al pasar de un módulo a otro no se recarga la página:
 * - toda consulta se vuelve a pedir al entrar a su pantalla (se ve lo guardado
 *   al instante y se actualiza en segundo plano), así se ven también los
 *   cambios de otras personas;
 * - al guardar cualquier cosa se marca TODO como desactualizado: un cambio en
 *   un módulo (p. ej. el horario de un turno) afecta a otros (la asistencia).
 */
export function crearQueryClient() {
  const client: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        if (mutation.meta?.soloLectura) return
        void client.invalidateQueries()
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  })
  return client
}
