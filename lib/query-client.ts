import { MutationCache, QueryClient } from "@tanstack/react-query"

import { avisosConectados } from "@/lib/eventos"

/** Mutaciones que solo consultan (buscar por DNI, previsualizar): no cambian datos. */
export const SOLO_LECTURA = { soloLectura: true } as const

/** Respaldo: aun sin avisos, nada se usa por más de este tiempo sin volver a pedirlo. */
const VIGENCIA_MS = 5 * 60 * 1000

/**
 * Caché del frontend. Al pasar de un módulo a otro no se recarga la página:
 * - los cambios llegan por los avisos en vivo (EscuchaCambios): al recibirlos se
 *   recarga lo afectado, así no hace falta volver a pedir todo al navegar;
 * - al guardar algo aquí se marca TODO como desactualizado al momento (un cambio
 *   en un módulo, p. ej. el horario de un turno, afecta a otros);
 * - respaldo: lo que tenga más de 5 minutos se vuelve a pedir, y al volver a la
 *   pestaña solo se consulta si la conexión de avisos está caída.
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
        staleTime: VIGENCIA_MS,
        refetchOnMount: true,
        refetchOnWindowFocus: () => !avisosConectados(),
        retry: 1,
      },
    },
  })
  return client
}
