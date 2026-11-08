"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import { evaluacionesApi, type EvaluacionRequest } from "@/lib/api/evaluaciones"

const KEY = ["evaluaciones"] as const

export function useCursosEvaluables(idAnio: number | null) {
  return useQuery({
    queryKey: [...KEY, "cursos", idAnio],
    queryFn: () => evaluacionesApi.cursos(idAnio as number),
    enabled: idAnio != null,
  })
}

export function useEvaluaciones(idAsignacion: number | null, periodo: number | null) {
  return useQuery({
    queryKey: [...KEY, "lista", idAsignacion, periodo],
    queryFn: () => evaluacionesApi.listar(idAsignacion as number, periodo as number),
    enabled: idAsignacion != null && periodo != null,
  })
}

export function useAvanceFinales(idAsignacion: number | null, periodo: number | null) {
  return useQuery({
    queryKey: [...KEY, "avance", idAsignacion, periodo],
    queryFn: () => evaluacionesApi.avanceFinales(idAsignacion as number, periodo as number),
    enabled: idAsignacion != null && periodo != null,
  })
}

export function useRegistroAuxiliar(idAsignacion: number | null, periodo: number | null) {
  return useQuery({
    queryKey: [...KEY, "registro", idAsignacion, periodo],
    queryFn: () => evaluacionesApi.registro(idAsignacion as number, periodo as number),
    enabled: idAsignacion != null && periodo != null,
  })
}

export function useEvaluacionDetalle(idEvaluacion: number | null) {
  return useQuery({
    queryKey: [...KEY, "detalle", idEvaluacion],
    queryFn: () => evaluacionesApi.detalle(idEvaluacion as number),
    enabled: idEvaluacion != null,
  })
}

export function useGuardarEvaluacion() {
  const invalidar = useInvalidarMutacion(KEY)
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: EvaluacionRequest }) =>
      id ? evaluacionesApi.editar(id, data) : evaluacionesApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useRegistrarNotasEvaluacion() {
  const invalidar = useInvalidarMutacion(KEY)
  return useMutation({
    mutationFn: ({ id, notas }: { id: number; notas: { idMatricula: number; calificacion: string | null }[] }) =>
      evaluacionesApi.registrarNotas(id, notas),
    onSuccess: invalidar,
  })
}

export function useEliminarEvaluacion() {
  const invalidar = useInvalidarMutacion(KEY)
  return useMutation({
    mutationFn: (id: number) => evaluacionesApi.eliminar(id),
    onSuccess: invalidar,
  })
}
