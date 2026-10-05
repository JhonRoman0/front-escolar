import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useCrud } from "@/hooks/use-crud"
import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  asistenciasApi,
  type AsistenciaFiltros,
  type AsistenciaRequest,
  type JustificarAsistenciaRequest,
  type RangoEstadisticas,
} from "@/lib/api/asistencia"
import {
  justificacionesApi,
  type JustificacionRequest,
} from "@/lib/api/justificacion"
import {
  diasFeriadosApi,
  type DiaFeriadoRequest,
} from "@/lib/api/dia-feriado"

const KEYS = {
  asistencias: ["asistencias"] as const,
  estadisticas: ["asistencia-estadisticas"] as const,
  justificaciones: ["justificaciones"] as const,
  feriados: ["dias-feriados"] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────

export function useAsistenciasHoy(params?: { page?: number; size?: number; fecha?: string } & AsistenciaFiltros) {
  return useQuery({
    queryKey: [...KEYS.asistencias, "hoy", params],
    queryFn: () => asistenciasApi.hoy(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export function useAsistenciaSemana(
  fecha: string | null,
  page = 0,
  size = 10,
  filtros?: AsistenciaFiltros
) {
  return useQuery({
    queryKey: [...KEYS.asistencias, "semana", fecha, page, size, filtros],
    queryFn: () => asistenciasApi.semana(fecha as string, page, size, filtros),
    enabled: !!fecha,
    placeholderData: keepPreviousData,
  })
}

export function useAsistenciaMes(
  fecha: string | null,
  page = 0,
  size = 10,
  filtros?: AsistenciaFiltros
) {
  return useQuery({
    queryKey: [...KEYS.asistencias, "mes", fecha, page, size, filtros],
    queryFn: () => asistenciasApi.mes(fecha as string, page, size, filtros),
    enabled: !!fecha,
    placeholderData: keepPreviousData,
  })
}

export function useEstadisticasAsistencia(rango: RangoEstadisticas, fecha: string) {
  return useQuery({
    queryKey: [...KEYS.estadisticas, rango, fecha],
    queryFn: () => asistenciasApi.estadisticas(rango, fecha),
    staleTime: 1000 * 30,
  })
}

// Catálogo de estados (GET /asistencias/estados): casi nunca cambia.
export function useEstadosAsistencia() {
  return useQuery({
    queryKey: [...KEYS.asistencias, "estados"],
    queryFn: asistenciasApi.estados,
    staleTime: 1000 * 60 * 60,
  })
}

// Catálogo de motivos de justificación (GET /justificaciones).
export function useJustificaciones() {
  return useQuery({
    queryKey: KEYS.justificaciones,
    queryFn: justificacionesApi.listar,
    staleTime: 1000 * 60 * 60,
  })
}

// Catálogo de días feriados (GET /dias-feriados).
export function useDiasFeriados() {
  return useQuery({
    queryKey: KEYS.feriados,
    queryFn: diasFeriadosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

// Consulta puntual del flujo QR/código: no invalida nada.
export function usePrevisualizarAsistencia() {
  return useMutation({
    mutationFn: (data: AsistenciaRequest) => asistenciasApi.previsualizar(data),
  })
}

export function useConfirmarAsistencia() {
  const invalidar = useInvalidarMutacion(KEYS.asistencias, KEYS.estadisticas)
  return useMutation({
    mutationFn: (data: AsistenciaRequest) => asistenciasApi.confirmar(data),
    onSuccess: invalidar,
  })
}

// Justificación retrospectiva (PUT /asistencias/{id}/justificar).
export function useJustificarAsistencia() {
  const invalidar = useInvalidarMutacion(KEYS.asistencias, KEYS.estadisticas)
  return useMutation({
    mutationFn: ({
      idAsistencia,
      data,
    }: {
      idAsistencia: number
      data: JustificarAsistenciaRequest
    }) => asistenciasApi.justificar(idAsistencia, data),
    onSuccess: invalidar,
  })
}

// Eliminar un registro de asistencia (DELETE /asistencias/{id}).
export function useEliminarAsistencia() {
  const invalidar = useInvalidarMutacion(KEYS.asistencias, KEYS.estadisticas)
  return useMutation({
    mutationFn: (idAsistencia: number) => asistenciasApi.eliminar(idAsistencia),
    onSuccess: invalidar,
  })
}

// ── CRUD catálogos (Fase 9) ──────────────────────────────────────────────

export function useCrudJustificaciones() {
  return useCrud(
    KEYS.justificaciones,
    [KEYS.asistencias],
    (data: JustificacionRequest) => justificacionesApi.crear(data),
    ({ id, data }) => justificacionesApi.actualizar(id, data),
    (id) => justificacionesApi.eliminar(id)
  )
}

export function useCrudFeriados() {
  return useCrud(
    KEYS.feriados,
    [],
    (data: DiaFeriadoRequest) => diasFeriadosApi.crear(data),
    ({ id, data }) => diasFeriadosApi.actualizar(id, data),
    (id) => diasFeriadosApi.eliminar(id)
  )
}
