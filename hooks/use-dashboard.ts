import { useQuery } from "@tanstack/react-query"

import {
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

export function useKpiAlumnos(idAnio: number | null, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-alumnos", idAnio],
    queryFn: () => totalAlumnos(idAnio as number),
    enabled: habilitado && idAnio !== null,
  })
}

export function useKpiDocentes(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-docentes"],
    queryFn: totalDocentes,
    enabled: habilitado,
  })
}

export function useKpiUsuarios(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-usuarios"],
    queryFn: totalUsuarios,
    enabled: habilitado,
  })
}

export function useKpiMatriculas(idAnio: number | null, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "total-matriculas", idAnio],
    queryFn: () => totalMatriculas(idAnio as number),
    enabled: habilitado && idAnio !== null,
  })
}

export function useEstadisticasHoy(fecha: string, idAnio: number | null, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "estadisticas-hoy", fecha, idAnio],
    queryFn: () => estadisticasHoy(fecha, idAnio as number),
    enabled: habilitado && idAnio !== null,
  })
}

export function useTendenciaSemana(fecha: string, idAnio: number | null, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "tendencia-semana", fecha, idAnio],
    queryFn: () => tendenciaSemana(fecha, idAnio as number),
    enabled: habilitado && idAnio !== null,
  })
}

export function useDistribucionGrado(idAnio: number | null, habilitado: boolean) {
  return useQuery({
    queryKey: [...KEYS.dashboard, "distribucion-grado", idAnio],
    queryFn: () => distribucionGrado(idAnio as number),
    enabled: habilitado && idAnio !== null,
  })
}
