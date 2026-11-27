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
  configuracionAcademicaApi,
  docentesApi,
  gradosAcademicosApi,
  gradosApi,
  gradoSeccionApi,
  motivosCambioDocenteApi,
  nivelesApi,
  recreosApi,
  suspensionesApi,
  tiposContratoApi,
  turnosApi,
  type CambioDocenteRequest,
  type ConfiguracionAcademicaRequest,
  type MotivoCambioDocenteRequest,
  type CursoCopiaRequest,
  type DocenteRequest,
  type RecreoRequest,
  type RecreoUpdateRequest,
  type ResolverIncidenciaRequest,
  type SeccionRequest,
  type SeccionesBatchRequest,
  type SubcursoRequest,
  type SuspensionRequest,
} from "@/lib/api/academico"
import type { TipoCambioDocente } from "@/lib/schemas/academico"

const KEYS = {
  docentes: ["docentes"] as const,
  gradosAcademicos: ["grados-academicos"] as const,
  tiposContrato: ["tipos-contrato"] as const,
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
  motivosCambioDocente: ["motivos-cambio-docente"] as const,
  recreos: ["recreos"] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useDocentes(habilitado = true) {
  return useQuery({
    queryKey: KEYS.docentes,
    queryFn: docentesApi.listar,
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })
}

export function useGradosAcademicos() {
  return useQuery({
    queryKey: KEYS.gradosAcademicos,
    queryFn: gradosAcademicosApi.listar,
  })
}

export function useTiposContrato() {
  return useQuery({
    queryKey: KEYS.tiposContrato,
    queryFn: tiposContratoApi.listar,
  })
}

export function useDocenteDeUsuario(idUsuario: number | null | undefined) {
  const { data: docentes = [] } = useDocentes()
  if (!idUsuario) return null
  return docentes.find((d) => d.idUsuario === idUsuario) ?? null
}

/**
 * Sin filtros trae todos los cursos de todos los años (lo usa Asignaciones).
 * Con filtros espera a tener año y nivel para no traer la lista completa.
 */
export function useCursos(filtros?: { idAnio: number | null; idNivel: number | null }) {
  return useQuery({
    queryKey: [...KEYS.cursos, filtros?.idAnio ?? null, filtros?.idNivel ?? null],
    queryFn: () => cursosApi.listar(filtros?.idAnio, filtros?.idNivel),
    enabled: !filtros || (!!filtros.idAnio && !!filtros.idNivel),
  })
}

export function useTurnos() {
  return useQuery({
    queryKey: KEYS.turnos,
    queryFn: turnosApi.listar,
  })
}

export function useGrados() {
  return useQuery({
    queryKey: KEYS.grados,
    queryFn: gradosApi.listar,
  })
}

export function useAniosEscolares(habilitado = true) {
  return useQuery({
    queryKey: KEYS.anios,
    queryFn: aniosEscolaresApi.listar,
    enabled: habilitado,
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
  })
}

export function useAula(id: number | null) {
  return useQuery({
    queryKey: [...KEYS.aulas, id],
    queryFn: () => aulasApi.porId(id as number),
    enabled: id !== null,
  })
}

export function useAsignaciones(enabled = true) {
  return useQuery({
    queryKey: KEYS.asignaciones,
    queryFn: asignacionesApi.listar,
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useNiveles() {
  return useQuery({
    queryKey: KEYS.niveles,
    queryFn: nivelesApi.listar,
  })
}

export function useGradosPorNivel(idNivel: number | null) {
  return useQuery({
    queryKey: [...KEYS.grados, "nivel", idNivel],
    queryFn: () => gradosApi.porNivel(idNivel as number),
    enabled: !!idNivel,
  })
}

/** Grados del nivel con secciones en ese año (cada sección trae su turno). */
export function useGradosDelAnio(idNivel: number | null, idAnio: number | null) {
  return useQuery({
    queryKey: [...KEYS.grados, "nivel", idNivel, "anio", idAnio],
    queryFn: () => gradosApi.porNivel(idNivel as number, idAnio),
    enabled: !!idNivel && !!idAnio,
  })
}

export function useSeccionesPorGrado(idGrado: number | null) {
  return useQuery({
    queryKey: [...KEYS.secciones, idGrado],
    queryFn: () => gradoSeccionApi.porGrado(idGrado as number),
    enabled: !!idGrado,
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
      // Aulas muestra de qué sección es salón cada aula.
      queryClient.invalidateQueries({ queryKey: KEYS.aulas })
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
      // Aulas muestra de qué sección es salón cada aula.
      queryClient.invalidateQueries({ queryKey: KEYS.aulas })
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
      // Aulas muestra de qué sección es salón cada aula.
      queryClient.invalidateQueries({ queryKey: KEYS.aulas })
    },
  })
}

export function useActualizarSeccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idGradoSeccion, nombre, idAula }: { idGradoSeccion: number; nombre: string; idAula: number }) =>
      gradoSeccionApi.actualizar(idGradoSeccion, { nombre, idAula }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.grados })
      queryClient.invalidateQueries({ queryKey: KEYS.secciones })
      queryClient.invalidateQueries({ queryKey: KEYS.asignaciones })
      // Aulas muestra de qué sección es salón cada aula.
      queryClient.invalidateQueries({ queryKey: KEYS.aulas })
    },
  })
}

export function useEliminarSeccionesLote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => gradoSeccionApi.eliminarLote(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.grados })
      queryClient.invalidateQueries({ queryKey: KEYS.secciones })
      queryClient.invalidateQueries({ queryKey: KEYS.asignaciones })
      // Aulas muestra de qué sección es salón cada aula.
      queryClient.invalidateQueries({ queryKey: KEYS.aulas })
    },
  })
}

export function useAsignacionesDocente(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.asignaciones, "docente", idDocente],
    queryFn: () => asignacionesApi.porDocente(idDocente as number),
    enabled: !!idDocente,
    placeholderData: keepPreviousData,
  })
}

export function useHorasDocente(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.asignaciones, "horas", idDocente],
    queryFn: () => asignacionesApi.horasDocente(idDocente as number),
    enabled: !!idDocente,
  })
}

// ── Suspensiones ─────────────────────────────────────────────────────────

export function useSuspensiones(habilitado = true) {
  return useQuery({
    queryKey: KEYS.suspensiones,
    queryFn: suspensionesApi.listar,
    enabled: habilitado,
  })
}

export function useCrearSuspension() {
  const invalidar = useInvalidarMutacion(
    KEYS.suspensiones,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: (data: SuspensionRequest) => suspensionesApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useActualizarSuspension() {
  const invalidar = useInvalidarMutacion(
    KEYS.suspensiones,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: ({ id, data, vigente }: { id: number; data: SuspensionRequest; vigente?: boolean }) =>
      vigente ? suspensionesApi.editarVigente(id, data) : suspensionesApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useFinalizarSuspension() {
  const invalidar = useInvalidarMutacion(
    KEYS.suspensiones,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      suspensionesApi.finalizar(id, motivo),
    onSuccess: invalidar,
  })
}

export function useCancelarSuspension() {
  const invalidar = useInvalidarMutacion(
    KEYS.suspensiones,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      suspensionesApi.cancelar(id, motivo),
    onSuccess: invalidar,
  })
}

// ── Cambios de Docente ───────────────────────────────────────────────────

export function useAsignacionesParaCambio(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.asignaciones, "para-cambio", idDocente],
    queryFn: () => cambiosDocenteApi.asignacionesParaCambio(idDocente!),
    enabled: idDocente != null,
  })
}

export function useCambiosDocente(habilitado = true) {
  return useQuery({
    queryKey: KEYS.cambiosDocente,
    queryFn: cambiosDocenteApi.listar,
    enabled: habilitado,
  })
}

export function useCrearCambioDocente() {
  const invalidar = useInvalidarMutacion(
    KEYS.cambiosDocente,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: (data: CambioDocenteRequest) => cambiosDocenteApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useActualizarCambioDocente() {
  const invalidarCambio = useInvalidarMutacion(KEYS.cambiosDocente)
  const invalidarTransferencia = useInvalidarMutacion(KEYS.asignaciones, KEYS.docentes)
  return useMutation({
    mutationFn: ({ id, data, vigente }: { id: number; data: CambioDocenteRequest; vigente?: boolean }) =>
      vigente ? cambiosDocenteApi.editarVigente(id, data) : cambiosDocenteApi.actualizar(id, data),
    onSuccess: (_data, variables) => {
      invalidarCambio()
      if (!variables.vigente) invalidarTransferencia()
    },
  })
}

export function useResolverIncidencia() {
  const invalidar = useInvalidarMutacion(KEYS.cambiosDocente)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ResolverIncidenciaRequest }) =>
      cambiosDocenteApi.resolverIncidencia(id, data),
    onSuccess: invalidar,
  })
}

export function useFinalizarCambio() {
  const invalidar = useInvalidarMutacion(
    KEYS.cambiosDocente,
    KEYS.asignaciones,
    KEYS.docentes
  )
  return useMutation({
    mutationFn: (id: number) => cambiosDocenteApi.finalizar(id),
    onSuccess: invalidar,
  })
}

export function useCancelarCambio() {
  const invalidar = useInvalidarMutacion(KEYS.cambiosDocente)
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      cambiosDocenteApi.cancelar(id, motivo),
    onSuccess: invalidar,
  })
}

export function useMotivosCambioDocente(
  tipo?: TipoCambioDocente,
  habilitado = true
) {
  return useQuery({
    queryKey: [...KEYS.motivosCambioDocente, tipo ?? null],
    queryFn: () => motivosCambioDocenteApi.listar(tipo),
    enabled: habilitado,
  })
}

export function useCrearMotivoCambioDocente() {
  const invalidar = useInvalidarMutacion(KEYS.motivosCambioDocente)
  return useMutation({
    mutationFn: (data: MotivoCambioDocenteRequest) => motivosCambioDocenteApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useActualizarMotivoCambioDocente() {
  const invalidar = useInvalidarMutacion(KEYS.motivosCambioDocente)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MotivoCambioDocenteRequest }) =>
      motivosCambioDocenteApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarMotivoCambioDocente() {
  const invalidar = useInvalidarMutacion(KEYS.motivosCambioDocente)
  return useMutation({
    mutationFn: (id: number) => motivosCambioDocenteApi.eliminar(id),
    onSuccess: invalidar,
  })
}

// ── Recreos ──────────────────────────────────────────────────────────────

/** Espera a tener el año para no traer los recreos de todos los años. */
export function useRecreos(filtros: { idAnio: number | null; idNivel?: number | null; idTurno?: number | null }) {
  return useQuery({
    queryKey: [...KEYS.recreos, filtros.idAnio, filtros.idNivel ?? null, filtros.idTurno ?? null],
    queryFn: () => recreosApi.listar(filtros),
    enabled: !!filtros.idAnio,
  })
}

export function useCrearRecreos() {
  const invalidar = useInvalidarMutacion(KEYS.recreos)
  return useMutation({
    mutationFn: (data: RecreoRequest) => recreosApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useActualizarRecreo() {
  const invalidar = useInvalidarMutacion(KEYS.recreos)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecreoUpdateRequest }) => recreosApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarRecreo() {
  const invalidar = useInvalidarMutacion(KEYS.recreos)
  return useMutation({
    mutationFn: (id: number) => recreosApi.eliminar(id),
    onSuccess: invalidar,
  })
}

export function useEliminarRecreosDelGrado() {
  const invalidar = useInvalidarMutacion(KEYS.recreos)
  return useMutation({
    mutationFn: ({ idAnio, idTurno, idGrado }: { idAnio: number; idTurno: number; idGrado: number }) =>
      recreosApi.eliminarDelGrado(idAnio, idTurno, idGrado),
    onSuccess: invalidar,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useActualizarDocente() {
  const invalidar = useInvalidarMutacion(KEYS.docentes)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocenteRequest }) =>
      docentesApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarDocente() {
  const invalidar = useInvalidarMutacion(
    KEYS.docentes,
    KEYS.asignaciones,
    KEYS.suspensiones
  )
  return useMutation({
    mutationFn: (id: number) => docentesApi.eliminar(id),
    onSuccess: invalidar,
  })
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

// Importar, copiar y cambiar subcursos también tocan las competencias.
const KEY_COMPETENCIAS = ["competencias"] as const

export function useCambiarEstadoCurso() {
  const invalidar = useInvalidarMutacion(KEYS.cursos)
  return useMutation({
    mutationFn: ({ id, accesoId }: { id: number; accesoId: number }) =>
      cursosApi.cambiarEstado(id, accesoId),
    onSuccess: invalidar,
  })
}

export function useCambiarSubcursos() {
  const invalidar = useInvalidarMutacion(KEYS.cursos, KEY_COMPETENCIAS)
  return useMutation({
    mutationFn: ({ id, tieneSubcursos }: { id: number; tieneSubcursos: boolean }) =>
      cursosApi.cambiarSubcursos(id, tieneSubcursos),
    onSuccess: invalidar,
  })
}

export function useGuardarSubcurso() {
  const invalidar = useInvalidarMutacion(KEYS.cursos, KEY_COMPETENCIAS)
  return useMutation({
    // Con idSubcurso edita; sin él crea dentro del área.
    mutationFn: ({ idArea, idSubcurso, data }: { idArea: number; idSubcurso?: number; data: SubcursoRequest }) =>
      idSubcurso ? cursosApi.actualizarSubcurso(idSubcurso, data) : cursosApi.crearSubcurso(idArea, data),
    onSuccess: invalidar,
  })
}

export function useEliminarCurso() {
  const invalidar = useInvalidarMutacion(KEYS.cursos)
  return useMutation({
    mutationFn: (id: number) => cursosApi.eliminar(id),
    onSuccess: invalidar,
  })
}

export function useVistaPreviaCursos() {
  return useMutation({
    mutationFn: ({ archivo, idAnio }: { archivo: File; idAnio: number }) =>
      cursosApi.vistaPrevia(archivo, idAnio),
  })
}

export function useImportarCursos() {
  const invalidar = useInvalidarMutacion(KEYS.cursos, KEY_COMPETENCIAS)
  return useMutation({
    mutationFn: ({ archivo, idAnio }: { archivo: File; idAnio: number }) =>
      cursosApi.importar(archivo, idAnio),
    onSuccess: invalidar,
  })
}

export function useCopiarCursos() {
  const invalidar = useInvalidarMutacion(KEYS.cursos, KEY_COMPETENCIAS)
  return useMutation({
    mutationFn: (data: CursoCopiaRequest) => cursosApi.copiar(data),
    onSuccess: invalidar,
  })
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

/** Orden de niveles y grados, y si un grado repite: cambian la secuencia de matrícula. */
export function useOrdenGrados() {
  const invalidar = useInvalidarMutacion(KEYS.grados, KEYS.niveles, ["matriculas"])
  return {
    moverGrado: useMutation({
      mutationFn: ({ id, subir }: { id: number; subir: boolean }) => gradosApi.mover(id, subir),
      onSuccess: invalidar,
    }),
    moverNivel: useMutation({
      mutationFn: ({ id, subir }: { id: number; subir: boolean }) => nivelesApi.mover(id, subir),
      onSuccess: invalidar,
    }),
    cambiarRepite: useMutation({
      mutationFn: ({ id, repite }: { id: number; repite: boolean }) => gradosApi.cambiarRepite(id, repite),
      onSuccess: invalidar,
    }),
  }
}

export function useCrudGrados() {
  return useCrud(
    KEYS.grados,
    [KEYS.asignaciones, KEYS.aulas],
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

// ── Configuración académica ──────────────────────────────────────────────

const KEY_CONFIGURACION = ["configuracion-academica"] as const

export function useConfiguracionAcademica(idAnio: number | null) {
  return useQuery({
    queryKey: [...KEY_CONFIGURACION, idAnio],
    queryFn: () => configuracionAcademicaApi.listar(idAnio as number),
    enabled: !!idAnio,
  })
}

/** Hora académica de un año y nivel, para el formulario de asignaciones. */
export function useHoraAcademica(idAnio: number | null, idNivel: number | null) {
  return useQuery({
    queryKey: [...KEY_CONFIGURACION, "hora", idAnio, idNivel],
    queryFn: () => configuracionAcademicaApi.horaAcademica(idAnio as number, idNivel as number),
    enabled: !!idAnio && !!idNivel,
  })
}

export function useGuardarConfiguracionAcademica() {
  const invalidar = useInvalidarMutacion(KEY_CONFIGURACION)
  return useMutation({
    mutationFn: (data: ConfiguracionAcademicaRequest) => configuracionAcademicaApi.guardar(data),
    onSuccess: invalidar,
  })
}
