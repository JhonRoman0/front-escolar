import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  matriculasApi,
  type InscripcionRequest,
  type MatriculaEdicionRequest,
} from "@/lib/api/matricula"

const KEYS = {
  matriculas: ["matriculas"] as const,
  // Alumnos y apoderados se crean desde la matrícula.
  alumnos: ["alumnos"] as const,
  apoderados: ["apoderados"] as const,
}

export function useMatriculas(page: number, size = 10) {
  return useQuery({
    queryKey: [...KEYS.matriculas, page, size],
    queryFn: () => matriculasApi.listar(page, size),
    placeholderData: keepPreviousData,
  })
}

export function useMatricula(id?: number) {
  return useQuery({
    queryKey: [...KEYS.matriculas, "detalle", id],
    queryFn: () => matriculasApi.porId(id as number),
    enabled: !!id,
  })
}

export function usePagosMatricula(id?: number) {
  return useQuery({
    queryKey: [...KEYS.matriculas, "pagos", id],
    queryFn: () => matriculasApi.pagos(id as number),
    enabled: !!id,
  })
}

/** Grados y secciones con cupo en los que el alumno puede matricularse ese año. */
export function useOpcionesMatricula(idAnio: number | null, idAlumno?: number | null, idMatricula?: number | null) {
  return useQuery({
    queryKey: [...KEYS.matriculas, "opciones", idAnio, idAlumno ?? null, idMatricula ?? null],
    queryFn: () => matriculasApi.opciones(idAnio as number, idAlumno, idMatricula),
    enabled: !!idAnio,
  })
}

export function useBuscarAlumnoInscripcion() {
  return useMutation({ mutationFn: (dni: string) => matriculasApi.buscarAlumno(dni) })
}

export function useBuscarApoderadoInscripcion() {
  return useMutation({
    mutationFn: ({ dni, idAlumno }: { dni: string; idAlumno?: number | null }) =>
      matriculasApi.buscarApoderado(dni, idAlumno),
  })
}

export function useCrudMatriculas() {
  const invalidar = useInvalidarMutacion(KEYS.matriculas, KEYS.alumnos, KEYS.apoderados)
  return {
    validar: useMutation({
      mutationFn: (data: InscripcionRequest) => matriculasApi.validar(data),
    }),
    inscribir: useMutation({
      mutationFn: ({ data, foto, comprobante }: { data: InscripcionRequest; foto: File | null; comprobante: File | null }) =>
        matriculasApi.inscribir(data, foto, comprobante),
      onSuccess: invalidar,
    }),
    editar: useMutation({
      mutationFn: ({ id, data, comprobante }: { id: number; data: MatriculaEdicionRequest; comprobante: File | null }) =>
        matriculasApi.editar(id, data, comprobante),
      onSuccess: invalidar,
    }),
    cambioSeccion: useMutation({
      mutationFn: ({
        id,
        idGradoSeccion,
        motivo,
      }: {
        id: number
        idGradoSeccion: number
        motivo?: string
      }) => matriculasApi.cambioSeccion(id, idGradoSeccion, motivo),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({
      mutationFn: (id: number) => matriculasApi.eliminar(id),
      onSuccess: invalidar,
    }),
  }
}
