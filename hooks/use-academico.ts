import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useCrud } from "@/hooks/use-crud"
import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  aniosEscolaresApi,
  asignacionesApi,
  aulasApi,
  cambiosDocenteApi,
  cursosApi,
  docentesApi,
  gradosApi,
  gradoSeccionApi,
  nivelesApi,
  recreosApi,
  suspensionesApi,
  turnosApi,
  type RecreoRequest,
  type SuspensionRequest,
} from "@/lib/api/academico"

const KEYS = {
  docentes: ["docentes"] as const,
  cursos: ["cursos"] as const,
  turnos: ["turnos"] as const,
  grados: ["grados"] as const,
  anios: ["anios-escolares"] as const,
  aulas: ["aulas"] as const,
  asignaciones: ["asignaciones"] as const,
  niveles: ["niveles"] as const,
  secciones: ["secciones"] as const,
  suspensiones: ["suspensiones"] as const,
  cambiosDocente: ["cambios-docente"] as const,
  recreos: ["recreos"] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useDocentes() {
  return useQuery({
    queryKey: KEYS.docentes,
    queryFn: docentesApi.listar,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  })
}

export function useDocenteDeUsuario(idUsuario: number | null | undefined) {
  const { data: docentes = [] } = useDocentes()
  if (!idUsuario) return null
  return docentes.find((d) => d.idUsuario === idUsuario) ?? null
}

export function useCursos() {
  return useQuery({
    queryKey: KEYS.cursos,
    queryFn: cursosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useTurnos() {
  return useQuery({
    queryKey: KEYS.turnos,
    queryFn: turnosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useGrados() {
  return useQuery({
    queryKey: KEYS.grados,
    queryFn: gradosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAniosEscolares() {
  return useQuery({
    queryKey: KEYS.anios,
    queryFn: aniosEscolaresApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAulas() {
  return useQuery({
    queryKey: KEYS.aulas,
    queryFn: aulasApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAsignaciones() {
  return useQuery({
    queryKey: KEYS.asignaciones,
    queryFn: asignacionesApi.listar,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  })
}

export function useNiveles() {
  return useQuery({
    queryKey: KEYS.niveles,
    queryFn: nivelesApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useGradosPorNivel(idNivel: number | null) {
  return useQuery({
    queryKey: [...KEYS.grados, "nivel", idNivel],
    queryFn: () => gradosApi.porNivel(idNivel as number),
    enabled: !!idNivel,
    staleTime: 1000 * 60 * 10,
  })
}

export function useSeccionesPorGrado(idGrado: number | null) {
  return useQuery({
    queryKey: [...KEYS.secciones, idGrado],
    queryFn: () => gradoSeccionApi.porGrado(idGrado as number),
    enabled: !!idGrado,
    staleTime: 1000 * 60 * 10,
  })
}

export function useAsignacionesDocente(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.asignaciones, "docente", idDocente],
    queryFn: () => asignacionesApi.porDocente(idDocente as number),
    enabled: !!idDocente,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  })
}

export function useHorasDocente(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.asignaciones, "horas", idDocente],
    queryFn: () => asignacionesApi.horasDocente(idDocente as number),
    enabled: !!idDocente,
    staleTime: 1000 * 60 * 30,
  })
}

// ── Suspensiones ─────────────────────────────────────────────────────────

export function useSuspensiones() {
  return useQuery({
    queryKey: KEYS.suspensiones,
    queryFn: suspensionesApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useCrearSuspension() {
  const invalidar = useInvalidarMutacion(KEYS.suspensiones, KEYS.cambiosDocente)
  return useMutation({
    mutationFn: (data: SuspensionRequest) => suspensionesApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useFinalizarSuspension() {
  const invalidar = useInvalidarMutacion(KEYS.suspensiones, KEYS.cambiosDocente)
  return useMutation({
    mutationFn: (id: number) => suspensionesApi.finalizar(id),
    onSuccess: invalidar,
  })
}

export function useEliminarSuspension() {
  const invalidar = useInvalidarMutacion(KEYS.suspensiones)
  return useMutation({
    mutationFn: (id: number) => suspensionesApi.eliminar(id),
    onSuccess: invalidar,
  })
}

// ── Cambios de Docente ───────────────────────────────────────────────────

export function useCambiosDocente() {
  return useQuery({
    queryKey: KEYS.cambiosDocente,
    queryFn: cambiosDocenteApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

// ── Recreos ──────────────────────────────────────────────────────────────

export function useRecreos() {
  return useQuery({
    queryKey: KEYS.recreos,
    queryFn: recreosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useRecreosPorNivel(idNivel: number | null) {
  return useQuery({
    queryKey: [...KEYS.recreos, "nivel", idNivel],
    queryFn: () => recreosApi.porNivel(idNivel as number),
    enabled: !!idNivel,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCrudRecreos() {
  return useCrud(
    KEYS.recreos,
    [],
    recreosApi.crear,
    ({ id, data }) => recreosApi.actualizar(id, data),
    (id) => recreosApi.eliminar(id)
  )
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useCrudDocentes() {
  return useCrud(
    KEYS.docentes,
    [],
    docentesApi.crear,
    ({ id, data }) => docentesApi.actualizar(id, data),
    (id) => docentesApi.eliminar(id)
  )
}

export function useSubirFotoDocente() {
  const invalidar = useInvalidarMutacion(KEYS.docentes)
  return useMutation({
    mutationFn: ({ idUsuario, file }: { idUsuario: number; file: File }) =>
      docentesApi.subirFoto(idUsuario, file),
    onSuccess: invalidar,
  })
}

export function useEliminarFotoDocente() {
  const invalidar = useInvalidarMutacion(KEYS.docentes)
  return useMutation({
    mutationFn: (idUsuario: number) => docentesApi.eliminarFoto(idUsuario),
    onSuccess: invalidar,
  })
}

export function useCrudCursos() {
  return useCrud(
    KEYS.cursos,
    [],
    cursosApi.crear,
    ({ id, data }) => cursosApi.actualizar(id, data),
    (id) => cursosApi.eliminar(id)
  )
}

export function useCrudTurnos() {
  return useCrud(
    KEYS.turnos,
    [],
    turnosApi.crear,
    ({ id, data }) => turnosApi.actualizar(id, data),
    (id) => turnosApi.eliminar(id)
  )
}

export function useCrudGrados() {
  return useCrud(
    KEYS.grados,
    [KEYS.asignaciones],
    gradosApi.crear,
    ({ id, data }) => gradosApi.actualizar(id, data),
    (id) => gradosApi.eliminar(id)
  )
}

export function useCrudAniosEscolares() {
  return useCrud(
    KEYS.anios,
    [KEYS.grados, KEYS.asignaciones],
    aniosEscolaresApi.crear,
    ({ id, data }) => aniosEscolaresApi.actualizar(id, data),
    (id) => aniosEscolaresApi.eliminar(id)
  )
}

export function useCrudAulas() {
  return useCrud(
    KEYS.aulas,
    [KEYS.asignaciones],
    aulasApi.crear,
    ({ id, data }) => aulasApi.actualizar(id, data),
    (id) => aulasApi.eliminar(id)
  )
}

export function useCrudAsignaciones() {
  return useCrud(
    KEYS.asignaciones,
    [],
    asignacionesApi.crear,
    ({ id, data }) => asignacionesApi.actualizar(id, data),
    (id) => asignacionesApi.eliminar(id)
  )
}
