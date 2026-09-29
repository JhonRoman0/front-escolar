import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useAuth } from "@/components/auth-provider"
import { useAsignaciones, useAsignacionesDocente, useDocenteDeUsuario } from "@/hooks/use-academico"
import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  competenciasApi,
  notasApi,
  type NotaBatchRequest,
} from "@/lib/api/evaluacion"

const KEYS = {
  competencias: ["competencias"] as const,
  notas: ["notas"] as const,
  consolidado: ["consolidado"] as const,
}

// ── Asignaciones del usuario ──────────────────────────────────────────────

export function useAsignacionesUsuario() {
  const { esAdmin, usuario } = useAuth()
  const docente = useDocenteDeUsuario(usuario?.idUsuario)
  const todas = useAsignaciones()
  const delDocente = useAsignacionesDocente(esAdmin ? null : docente?.idDocente ?? null)

  if (esAdmin) {
    return { ...todas, data: todas.data }
  }
  return { ...delDocente, data: delDocente.data }
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useCompetencias(idCurso?: number) {
  return useQuery({
    queryKey: [KEYS.competencias, idCurso],
    queryFn: () => competenciasApi.listar(idCurso),
    enabled: !!idCurso,
    staleTime: 1000 * 60 * 30,
  })
}

export function useNotasPorCompetencia(idCompetencia?: number, bimestre?: number) {
  return useQuery({
    queryKey: [...KEYS.notas, "competencia", idCompetencia, bimestre],
    queryFn: () => notasApi.porCompetencia(idCompetencia as number, bimestre),
    enabled: !!idCompetencia,
    placeholderData: keepPreviousData,
  })
}

export function useConsolidado(
  idGradoSeccion?: number,
  bimestre?: number,
  idCurso?: number
) {
  return useQuery({
    queryKey: [KEYS.consolidado, idGradoSeccion, bimestre, idCurso],
    queryFn: () =>
      notasApi.consolidado(idGradoSeccion as number, bimestre as number, idCurso as number),
    enabled: idGradoSeccion != null && idGradoSeccion > 0 && !!bimestre && !!idCurso,
    placeholderData: keepPreviousData,
  })
}

export function usePromedio(idMatricula?: number) {
  return useQuery({
    queryKey: [...KEYS.notas, "promedio", idMatricula],
    queryFn: () => notasApi.promedio(idMatricula as number),
    enabled: !!idMatricula,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useRegistrarNotasBatch() {
  const invalidar = useInvalidarMutacion(KEYS.notas, KEYS.consolidado)
  return useMutation({
    mutationFn: (data: NotaBatchRequest) => notasApi.registrarLote(data),
    onSuccess: invalidar,
  })
}

export function useGenerarAutorizacion() {
  return useMutation({
    mutationFn: ({ idUsuarioDestinatario }: { idUsuarioDestinatario: number }) =>
      notasApi.generarAutorizacion(idUsuarioDestinatario),
  })
}

export function useValidarAutorizacion() {
  return useMutation({
    mutationFn: (codigo: string) => notasApi.validarAutorizacion(codigo),
  })
}

export function useAutorizaciones() {
  const { esAdmin } = useAuth()
  return useQuery({
    queryKey: [...KEYS.notas, "autorizaciones"],
    queryFn: notasApi.listarAutorizaciones,
    enabled: esAdmin,
  })
}
