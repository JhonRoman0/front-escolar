import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query"

import { useAuth } from "@/components/auth-provider"
import { useDocenteDeUsuario } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import { horarioApi, type HorarioFiltros } from "@/lib/api/horario"

const KEYS = {
  horarios: ["horarios"] as const,
  hijos: ["horarios-hijos"] as const,
}

// ── Vista según el alcance en Horarios ──────────────────────────────────

// "admin": todos los horarios con filtros; "docente": los suyos; "apoderado": los de sus hijos.
export type RolHorario = "admin" | "docente" | "apoderado" | "ninguno"

/**
 * Con "Ver horarios del colegio" (o ADMIN) se ve el de cualquier sección. Sin
 * ella, el docente ve el suyo, el apoderado el de su hijo y los demás, nada.
 */
export function useRolHorario(): RolHorario {
  const { permisos } = useAuth()
  const verColegio = usePuede("HORARIOS", "VER_COLEGIO")
  if (verColegio) return "admin"
  if (permisos?.vinculo === "DOCENTE") return "docente"
  if (permisos?.vinculo === "APODERADO") return "apoderado"
  return "ninguno"
}

// ── Queries ──────────────────────────────────────────────────────────────

/** Admin: todos los horarios con filtros (ahora Page + vacio hasta cascada) */
export function useHorarios(filtros?: HorarioFiltros & { enabled?: boolean }) {
  const { enabled = true, ...rest } = filtros ?? {}
  return useQuery({
    queryKey: [...KEYS.horarios, "admin", rest],
    queryFn: () => horarioApi.listar(rest),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Admin: todas las páginas con los mismos filtros; sin datos parciales ni previousData. */
export function useHorariosCompletos(filtros?: HorarioFiltros & { enabled?: boolean; firma?: string }) {
  const { enabled = true, firma: firmaDada, ...rest } = filtros ?? {}
  const firma = firmaDada ?? JSON.stringify(rest)
  return useQuery({
    queryKey: [...KEYS.horarios, "admin-completo", firma],
    queryFn: async () => ({ firma, horarios: await horarioApi.listarTodo(rest) }),
    enabled,
  })
}

/** Docente: solo sus horarios (ahora Page) */
export function useHorarioDocente(
  idDocente: number | null,
  filtros?: { anioEscolar?: number; idAnio?: number; page?: number; size?: number }
) {
  return useQuery({
    queryKey: [...KEYS.horarios, "docente", idDocente, filtros],
    queryFn: () => horarioApi.porDocente(idDocente as number, filtros),
    enabled: !!idDocente,
    placeholderData: keepPreviousData,
  })
}

/** Docente: todas sus clases del año (lo identifica la sesión). */
export function useMiHorario(idAnio: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...KEYS.horarios, "mio", idAnio],
    queryFn: () => horarioApi.mio(idAnio),
    enabled,
  })
}

/** Recreos de una sección (horario del colegio). */
export function useRecreosSeccion(idGradoSeccion: number | null) {
  return useQuery({
    queryKey: [...KEYS.horarios, "recreos", idGradoSeccion],
    queryFn: () => horarioApi.recreosDeSeccion(idGradoSeccion as number),
    enabled: idGradoSeccion != null,
  })
}

/** Recreos de varias secciones, con la misma key que la consulta individual. */
export function useRecreosSecciones(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KEYS.horarios, "recreos", id],
      queryFn: () => horarioApi.recreosDeSeccion(id),
      enabled: id != null,
    })),
  })
}

/** Apoderado: horarios de un alumno específico (ahora Page) */
export function useHorarioAlumno(
  idAlumno: number | null,
  filtros?: { anioEscolar?: number; idAnio?: number; page?: number; size?: number }
) {
  return useQuery({
    queryKey: [...KEYS.horarios, "alumno", idAlumno, filtros],
    queryFn: () => horarioApi.porAlumno(idAlumno as number, filtros),
    enabled: !!idAlumno,
    placeholderData: keepPreviousData,
  })
}

// ── Hook compuesto: resuelve el horario según el rol ────────────────────

export function useHorarioSegunRol(filtrosAdmin?: HorarioFiltros) {
  const rol = useRolHorario()
  const { usuario } = useAuth()
  const docente = useDocenteDeUsuario(rol === "docente" ? usuario?.idUsuario : undefined)

  // Admin — vacio hasta que llegue idGradoSeccion/idNivel
  const debeCargarAdmin = rol === "admin" && !!filtrosAdmin?.idGradoSeccion
  const adminQuery = useHorarios(
    rol === "admin" ? { ...filtrosAdmin, enabled: debeCargarAdmin } : { enabled: false }
  )

  // Docente
  const docenteId = rol === "docente" ? docente?.idDocente ?? null : null
  const docenteQuery = useHorarioDocente(docenteId, filtrosAdmin as never)

  // El apoderado ve el horario de su hijo en el Portal, no aquí.
  const query = rol === "admin" ? adminQuery : docenteQuery

  // Normaliza Page.content vs List
  const raw = query.data as unknown
  const horarios = Array.isArray(raw) ? (raw as never[]) : ((raw as { content?: never[] })?.content ?? [])
  const paginated = !Array.isArray(raw) ? (raw as { totalElements?: number; totalPages?: number }) : null

  return {
    rol,
    docente,
    horarios,
    paginated,
    cargando: query.isLoading,
    error: query.isError,
    query,
  }
}
