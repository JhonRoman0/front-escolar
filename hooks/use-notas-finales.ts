"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  notasAnualesApi,
  notasFinalesApi,
  type NotaAnualRequest,
  type NotaFinalRequest,
  type ReaperturaNota,
} from "@/lib/api/notas-finales"
import { EVALUACIONES_KEY, NOTAS_FINALES_KEY } from "@/lib/query-keys"

const KEY = NOTAS_FINALES_KEY

/** anual: los cursos salen de la ruta de notas anuales (otro permiso). */
export function useCursosFinales(idAnio: number | null, anual = false) {
  return useQuery({
    queryKey: [...KEY, "cursos", anual ? "anual" : "periodo", idAnio],
    queryFn: () => (anual ? notasAnualesApi : notasFinalesApi).cursos(idAnio as number),
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
  const invalidar = useInvalidarMutacion(KEY, EVALUACIONES_KEY)
  return useMutation({
    mutationFn: async ({ nuevas, correcciones }: { nuevas: NotaFinalRequest | null; correcciones: NotaFinalRequest | null }) => {
      if (nuevas) await notasFinalesApi.registrar(nuevas)
      if (correcciones) await notasFinalesApi.corregir(correcciones)
    },
    onSuccess: invalidar,
    onError: invalidar,
  })
}

/** Reabrir desbloquea las evaluaciones del alumno: se recargan también. */
export function useReabrirNotaFinal() {
  const invalidar = useInvalidarMutacion(KEY, EVALUACIONES_KEY)
  return useMutation({
    mutationFn: async (data: ReaperturaNota): Promise<void> => {
      if (data.periodo == null) await notasAnualesApi.reabrir(data)
      else await notasFinalesApi.reabrir(data)
    },
    onSuccess: invalidar,
  })
}

export function useDetalleNotaAnual(idGradoSeccion: number | null, idArea: number | null) {
  return useQuery({
    queryKey: [...KEY, "anual", idGradoSeccion, idArea],
    queryFn: () => notasAnualesApi.detalle(idGradoSeccion as number, idArea as number),
    enabled: idGradoSeccion != null && idArea != null,
  })
}

export function useGuardarNotasAnuales() {
  const invalidar = useInvalidarMutacion(KEY)
  return useMutation({
    mutationFn: async ({ nuevas, correcciones }: { nuevas: NotaAnualRequest | null; correcciones: NotaAnualRequest | null }) => {
      if (nuevas) await notasAnualesApi.registrar(nuevas)
      if (correcciones) await notasAnualesApi.corregir(correcciones)
    },
    onSuccess: invalidar,
    onError: invalidar,
  })
}
