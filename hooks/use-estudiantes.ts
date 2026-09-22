import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  alumnosApi,
  apoderadosApi,
  type AlumnoRequest,
} from "@/lib/api/estudiantes"

const KEYS = {
  alumnos: ["alumnos"] as const,
  apoderados: ["apoderados"] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useAlumnos(page: number, size = 10) {
  return useQuery({
    queryKey: [...KEYS.alumnos, page, size],
    queryFn: () => alumnosApi.listar(page, size),
    placeholderData: keepPreviousData,
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

export function useApoderadoPorDocumento() {
  return useMutation({
    mutationFn: (documento: string) => apoderadosApi.porDocumento(documento),
  })
}

export function useAlumnoPorDocumento() {
  return useMutation({
    mutationFn: (documento: string) => alumnosApi.porDocumento(documento),
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useCrudAlumnos() {
  const invalidar = useInvalidarMutacion(KEYS.alumnos, KEYS.apoderados)
  return {
    crear: useMutation({
      mutationFn: (data: AlumnoRequest) => alumnosApi.crear(data),
      onSuccess: invalidar,
    }),
    actualizar: useMutation({
      mutationFn: ({ id, data }: { id: number; data: AlumnoRequest }) =>
        alumnosApi.actualizar(id, data),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({
      mutationFn: (id: number) => alumnosApi.eliminar(id),
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
