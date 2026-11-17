import { useQuery } from "@tanstack/react-query"

import { modulosApi } from "@/lib/api/modulos"

const MODULOS_KEY = ["modulos"]

export function useModulos(enabled = true) {
  return useQuery({
    queryKey: MODULOS_KEY,
    queryFn: modulosApi.listar,
    enabled,
  })
}