import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
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
  type SeccionRequest,
  type SeccionesBatchRequest,
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
  // Vive en use-horario.ts. Se replica aquí porque un aula y un turno se
  // muestran por nombre dentro de otras respuestas, así que hay que invalidar
  // esos catálogos al crear o renombrar el aula. Ver use-horario.ts KEYS.
  horarios: ["horarios"] as const,
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

/**
 * Cambio de estado del año escolar por PATCH. Se invalida también grados y
 * asignaciones porque al activar un VIGENTE el backend cierra el anterior, lo
 * que cambia qué años quedan disponibles para cargar horarios y notas.
 */
export function useCambiarEstadoAnioEscolar() {
  const invalidar = useInvalidarMutacion(
    KEYS.anios,
    KEYS.grados,
    KEYS.asignaciones
  )
  return useMutation({
    mutationFn: ({ idAnio, estado }: { idAnio: number; estado: number }) =>
      aniosEscolaresApi.cambiarEstado(idAnio, estado),
    onSuccess: invalidar,
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

/**
 * Alta y baja de una seccion suelta sobre un grado existente. Se invalidan
 * grados y asignaciones porque las dos listas muestran el nombre de la seccion
 * y, ademas, crear una seccion en el anio vigente suma un turno nuevo en la
 * cascada de matricula.
 */
export function useCrearSeccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SeccionRequest) => gradoSeccionApi.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.grados })
      queryClient.invalidateQueries({ queryKey: KEYS.secciones })
      queryClient.invalidateQueries({ queryKey: KEYS.asignaciones })
    },
  })
}

/**
 * Alta de varias secciones de golpe sobre la misma combinacion de grado, turno
 * y anio. Se invalidan las mismas tres listas que la alta simple: grados porque
 * es la tabla que las muestra, secciones porque las lista el dialogo de editar,
 * y asignaciones porque courses quedan colgados de ellas.
 */
export function useCrearSeccionesLote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SeccionesBatchRequest) => gradoSeccionApi.crearLote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.grados })
      queryClient.invalidateQueries({ queryKey: KEYS.secciones })
      queryClient.invalidateQueries({ queryKey: KEYS.asignaciones })
    },
  })
}

export function useEliminarSeccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idGradoSeccion: number) => gradoSeccionApi.eliminar(idGradoSeccion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.grados })
      queryClient.invalidateQueries({ queryKey: KEYS.secciones })
      queryClient.invalidateQueries({ queryKey: KEYS.asignaciones })
    },
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
    // AsignacionResponse trae `turno` ya resuelto a texto: sin invalidar, la
    // pestaña Asignaciones muestra el nombre anterior tras crear o renombrar.
    [KEYS.asignaciones],
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
    // HorarioResponse trae `aula` resuelta a texto (la consulta vive en
    // use-horario.ts), y AsignacionResponse anida horarios[].
    [KEYS.asignaciones, KEYS.horarios],
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
