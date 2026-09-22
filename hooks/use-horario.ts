import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/components/auth-provider"
import { useDocenteDeUsuario } from "@/hooks/use-academico"
import { asistenciasApi } from "@/lib/api/asistencia"
import { horarioApi } from "@/lib/api/horario"

const KEYS = {
  horarios: ["horarios"] as const,
  hijos: ["horarios-hijos"] as const,
}

// ── Detección de rol ────────────────────────────────────────────────────

export type RolHorario = "admin" | "docente" | "apoderado"

export function useRolHorario(): RolHorario {
  const { esAdmin, usuario } = useAuth()
  if (esAdmin) return "admin"
  const rol = usuario?.nombreRol?.trim().toUpperCase()
  if (rol === "DOCENTE") return "docente"
  return "apoderado"
}

// ── Queries ──────────────────────────────────────────────────────────────

/** Admin: todos los horarios con filtros */
export function useHorarios(filtros?: {
  grado?: string
  seccion?: string
  docente?: number
  anioEscolar?: number
}) {
  return useQuery({
    queryKey: [...KEYS.horarios, "admin", filtros],
    queryFn: () => horarioApi.listar(filtros),
    staleTime: 1000 * 60 * 5,
  })
}

/** Docente: solo sus horarios */
export function useHorarioDocente(idDocente: number | null) {
  return useQuery({
    queryKey: [...KEYS.horarios, "docente", idDocente],
    queryFn: () => horarioApi.porDocente(idDocente as number),
    enabled: !!idDocente,
    staleTime: 1000 * 60 * 5,
  })
}

/** Apoderado: horarios de un alumno específico */
export function useHorarioAlumno(idAlumno: number | null) {
  return useQuery({
    queryKey: [...KEYS.horarios, "alumno", idAlumno],
    queryFn: () => horarioApi.porAlumno(idAlumno as number),
    enabled: !!idAlumno,
    staleTime: 1000 * 60 * 5,
  })
}

/** Apoderado: lista de hijos para el selector */
export function useHijosApoderado() {
  return useQuery({
    queryKey: KEYS.hijos,
    queryFn: asistenciasApi.hijos,
    staleTime: 1000 * 60 * 10,
  })
}

// ── Hook compuesto: resuelve el horario según el rol ────────────────────

export function useHorarioSegunRol(filtrosAdmin?: {
  grado?: string
  seccion?: string
  docente?: number
  anioEscolar?: number
}) {
  const rol = useRolHorario()
  const { usuario } = useAuth()
  const docente = useDocenteDeUsuario(rol === "docente" ? usuario?.idUsuario : undefined)
  const hijos = useHijosApoderado()

  // Admin
  const adminQuery = useHorarios(rol === "admin" ? filtrosAdmin : undefined)

  // Docente
  const docenteId = rol === "docente" ? docente?.idDocente ?? null : null
  const docenteQuery = useHorarioDocente(docenteId)

  // Apoderado — primer hijo por defecto (el selector lo cambia)
  const primerHijo = rol === "apoderado" ? (hijos.data?.[0]?.idAlumno ?? null) : null
  const alumnoQuery = useHorarioAlumno(primerHijo)

  const query =
    rol === "admin" ? adminQuery : rol === "docente" ? docenteQuery : alumnoQuery

  return {
    rol,
    docente,
    hijos: hijos.data ?? [],
    hijosCargando: hijos.isLoading,
    horarios: query.data ?? [],
    cargando: query.isLoading,
    error: query.isError,
  }
}
