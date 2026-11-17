import { useMutation } from "@tanstack/react-query"
import { SOLO_LECTURA } from "@/lib/query-client"

import { reniecApi, type ReniecResponse } from "@/lib/api/reniec"

export function useConsultarDni() {
  return useMutation<ReniecResponse, Error, string>({
    mutationFn: (dni: string) => reniecApi.consultarDni(dni),
    meta: SOLO_LECTURA,
  })
}
