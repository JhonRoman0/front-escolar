import { useQuery } from "@tanstack/react-query"

import {
  anioEscolarActivo,
  distribucionGrado,
  estadisticasHoy,
  tendenciaSemana,
  totalAlumnos,
  totalDocentes,
  totalMatriculas,
  totalUsuarios,
} from "@/lib/api/dashboard"

const KEYS = {
  dashboard: ["dashboard"] as const,
}

// Los totales casi nunca cambian en la sesión: staleTime alto.
const STALE_TOTALES = 1000 * 60 * 5

export function useKpiAlumnos(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-alumnos"],
    queryFn: totalAlumnos,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}

export function useKpiDocentes(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-docentes"],
    queryFn: totalDocentes,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}

export function useKpiUsuarios(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-usuarios"],
    queryFn: totalUsuarios,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}

export function useKpiMatriculas(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-matriculas"],
    queryFn: totalMatriculas,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}

export function useAnioEscolarActivo(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "anio-activo"],
    queryFn: anioEscolarActivo,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}

// Estadísticas de hoy: igual de frescas que las de /asistencia (30 s).
export function useEstadisticasHoy(fecha: string, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "estadisticas-hoy", fecha],
    queryFn: () => estadisticasHoy(fecha),
    enabled: habilitado,
    staleTime: 1000 * 30,
  })
}

export function useTendenciaSemana(fecha: string, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "tendencia-semana", fecha],
    queryFn: () => tendenciaSemana(fecha),
    enabled: habilitado,
    staleTime: 1000 * 60,
  })
}

export function useDistribucionGrado(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "distribucion-grado"],
    queryFn: distribucionGrado,
    enabled: habilitado,
    staleTime: STALE_TOTALES,
  })
}
