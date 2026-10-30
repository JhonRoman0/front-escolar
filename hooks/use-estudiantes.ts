import {
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  alumnosApi,
  apoderadosApi,
  type AlumnoEdicionRequest,
  type ApoderadoEdicionRequest,
  type AlumnosFiltros,
} from "@/lib/api/estudiantes"
import type { InscripcionApoderado } from "@/lib/api/matricula"

const KEYS = {
  alumnos: ["alumnos"] as const,
  apoderados: ["apoderados"] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useAlumnos(page: number, size = 10, filtros?: AlumnosFiltros, enabled = true) {
  return useQuery({
    queryKey: [...KEYS.alumnos, page, size, filtros],
    queryFn: () => alumnosApi.listar(page, size, filtros),
    enabled,
    placeholderData: (previousData, previousQuery) =>
      enabled && (previousQuery?.queryKey[3] as AlumnosFiltros | undefined)?.idAnio === filtros?.idAnio
        ? previousData
        : undefined,
  })
}

export function useAlumno(id: number | null) {
  return useQuery({
    queryKey: [...KEYS.alumnos, id],
    queryFn: () => alumnosApi.porId(id as number),
    enabled: id !== null,
  })
}

export function useApoderados() {
  return useQuery({
    queryKey: KEYS.apoderados,
    queryFn: apoderadosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useCrudAlumnos() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos, KEYS.apoderados)
  return {
    actualizar: useMutation({
      mutationFn: ({ id, data }: { id: number; data: AlumnoEdicionRequest }) =>
        alumnosApi.actualizar(id, data),
      onSuccess: invalidar,
    }),
  }
}

export function useSubirFotoAlumno() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos)
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      alumnosApi.subirFoto(id, file),
    onSuccess: invalidar,
  })
}

export function useEliminarFotoAlumno() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos)
  return useMutation({
    mutationFn: (id: number) => alumnosApi.eliminarFoto(id),
    onSuccess: invalidar,
  })
}

export function useAgregarApoderado() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos, KEYS.apoderados)
  return useMutation({
    mutationFn: ({ idAlumno, data }: { idAlumno: number; data: InscripcionApoderado }) =>
      apoderadosApi.agregar(idAlumno, data),
    onSuccess: invalidar,
  })
}

export function useActualizarApoderado() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos, KEYS.apoderados)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApoderadoEdicionRequest }) =>
      apoderadosApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useSubirFotoApoderado() {
  const invalidar = useInvalidarMutacion(KEYS.apoderados)
  return useMutation({
    mutationFn: ({ idUsuario, file }: { idUsuario: number; file: File }) =>
      apoderadosApi.subirFoto(idUsuario, file),
    onSuccess: invalidar,
  })
}

export function useEliminarFotoApoderado() {
  const invalidar = useInvalidarMutacion(KEYS.apoderados)
  return useMutation({
    mutationFn: (idUsuario: number) => apoderadosApi.eliminarFoto(idUsuario),
    onSuccess: invalidar,
  })
}
