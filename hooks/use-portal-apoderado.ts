"use client"

import { useQuery } from "@tanstack/react-query"

import { portalApoderadoApi } from "@/lib/api/portal-apoderado"

const KEY = ["portal-apoderado"] as const
// Las notas se ven "en vivo": se vuelven a pedir al volver a la pestaña y cada minuto.
const EN_VIVO = { refetchOnWindowFocus: true, refetchInterval: 60_000 } as const

export function useHijos() {
  return useQuery({ queryKey: [...KEY, "hijos"], queryFn: portalApoderadoApi.hijos })
}

export function useResumenPortal(idMatricula: number | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "resumen"],
    queryFn: () => portalApoderadoApi.resumen(idMatricula!),
    enabled: idMatricula != null,
    ...EN_VIVO,
  })
}

export function useNotasPortal(idMatricula: number | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "notas"],
    queryFn: () => portalApoderadoApi.notas(idMatricula!),
    enabled: idMatricula != null,
    ...EN_VIVO,
  })
}

/** mes null: el que elige el back (el actual dentro del año escolar). */
export function useAsistenciaPortal(idMatricula: number | null, mes: string | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "asistencia", mes],
    queryFn: () => portalApoderadoApi.asistencia(idMatricula!, mes ?? undefined),
    enabled: idMatricula != null,
  })
}

export function useHorarioPortal(idMatricula: number | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "horario"],
    queryFn: () => portalApoderadoApi.horario(idMatricula!),
    enabled: idMatricula != null,
  })
}

export function useRecreosPortal(idMatricula: number | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "recreos"],
    queryFn: () => portalApoderadoApi.recreos(idMatricula!),
    enabled: idMatricula != null,
  })
}

export function usePagosPortal(idMatricula: number | null) {
  return useQuery({
    queryKey: [...KEY, idMatricula, "pagos"],
    queryFn: () => portalApoderadoApi.pagos(idMatricula!),
    enabled: idMatricula != null,
  })
}
