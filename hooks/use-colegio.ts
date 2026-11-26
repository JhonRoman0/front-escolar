"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { reintentarSalvo404 } from "@/lib/api"
import { colegioApi, identidadApi, type ColegioRequest } from "@/lib/api/colegio"
import { COLEGIO_ACTUAL_KEY, COLEGIO_KEY, COLEGIOS_KEY, IDENTIDAD_COLEGIO_KEY } from "@/lib/query-keys"

export function useIdentidadInstitucional() {
  return useQuery({
    queryKey: IDENTIDAD_COLEGIO_KEY,
    queryFn: () => identidadApi.obtener(),
    retry: reintentarSalvo404,
  })
}

export function useColegio() {
  return useQuery({
    queryKey: COLEGIO_ACTUAL_KEY,
    queryFn: () => colegioApi.actual(),
    retry: reintentarSalvo404,
  })
}

export function useColegios() {
  return useQuery({
    queryKey: COLEGIOS_KEY,
    queryFn: () => colegioApi.listar(),
  })
}

export function useCrearColegio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, foto, portada }: { data: ColegioRequest; foto: File; portada: File | null }) =>
      colegioApi.crear(data, foto, portada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLEGIO_KEY })
      qc.invalidateQueries({ queryKey: ["portal", "colegio"] })
    },
  })
}

export function useActualizarColegio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ColegioRequest }) =>
      colegioApi.actualizar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLEGIO_KEY })
      qc.invalidateQueries({ queryKey: ["portal", "colegio"] })
    },
  })
}

// ── Subida de imágenes ──────────────────────────────────────────────────

export function useSubirFotoColegio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      colegioApi.subirFoto(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLEGIO_KEY })
      qc.invalidateQueries({ queryKey: ["portal", "colegio"] })
    },
  })
}

export function useSubirPortadaColegio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      colegioApi.subirPortada(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLEGIO_KEY })
    },
  })
}

export function useEliminarPortadaColegio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => colegioApi.eliminarPortada(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLEGIO_KEY })
    },
  })
}
