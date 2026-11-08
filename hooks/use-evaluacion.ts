import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useAuth } from "@/components/auth-provider"
import { useAsignaciones } from "@/hooks/use-academico"
import {
  competenciasApi,
  notasApi,
} from "@/lib/api/evaluacion"

const KEYS = {
  competencias: ["competencias"] as const,
  notas: ["notas"] as const,
}

// ── Asignaciones del usuario ──────────────────────────────────────────────

// El back ya devuelve solo las que el usuario puede ver según su alcance.
export function useAsignacionesUsuario() {
  return useAsignaciones()
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useCompetencias(idCurso?: number) {
  return useQuery({
    // Esparcido para que invalidar ["competencias"] alcance a todas las de cada curso.
    queryKey: [...KEYS.competencias, idCurso],
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

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useGenerarAutorizacion() {
  return useMutation({
    mutationFn: ({ idUsuarioDestinatario }: { idUsuarioDestinatario: number }) =>
      notasApi.generarAutorizacion(idUsuarioDestinatario),
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
