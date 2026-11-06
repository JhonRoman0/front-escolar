import { useMutation } from "@tanstack/react-query"

import { reniecApi, type ReniecResponse } from "@/lib/api/reniec"

export function useConsultarDni() {
  return useMutation<ReniecResponse, Error, string>({
    mutationFn: (dni: string) => reniecApi.consultarDni(dni),
  })
}
