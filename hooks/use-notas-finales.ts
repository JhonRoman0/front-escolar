"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import { notasFinalesApi, type NotaFinalRequest } from "@/lib/api/notas-finales"

const KEY = ["notas-finales"] as const

export function useCursosFinales(idAnio: number | null) {
  return useQuery({
    queryKey: [...KEY, "cursos", idAnio],
    queryFn: () => notasFinalesApi.cursos(idAnio as number),
    enabled: idAnio != null,
  })
}

export function useDetalleNotaFinal(idGradoSeccion: number | null, idArea: number | null, periodo: number | null) {
  return useQuery({
    queryKey: [...KEY, "detalle", idGradoSeccion, idArea, periodo],
    queryFn: () => notasFinalesApi.detalle(idGradoSeccion as number, idArea as number, periodo as number),
    enabled: idGradoSeccion != null && idArea != null && periodo != null,
  })
}

/** Nuevas y correcciones van por rutas distintas: cada una pide su permiso. */
export function useGuardarNotasFinales() {
  const invalidar = useInvalidarMutacion(KEY, ["evaluaciones"])
  return useMutation({
    mutationFn: async ({ nuevas, correcciones }: { nuevas: NotaFinalRequest | null; correcciones: NotaFinalRequest | null }) => {
      if (nuevas) await notasFinalesApi.registrar(nuevas)
      if (correcciones) await notasFinalesApi.corregir(correcciones)
    },
    onSuccess: invalidar,
    onError: invalidar,
  })
}
