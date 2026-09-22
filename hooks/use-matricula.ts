import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  matriculasApi,
  type MatriculaRequest,
} from "@/lib/api/matricula"

const KEYS = {
  matriculas: ["matriculas"] as const,
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

export function useCrudMatriculas() {
  const invalidar = useInvalidarMutacion(KEYS.matriculas)
  return {
    crear: useMutation({
      mutationFn: (data: MatriculaRequest) => matriculasApi.crear(data),
      onSuccess: invalidar,
    }),
    actualizar: useMutation({
      mutationFn: ({ id, data }: { id: number; data: MatriculaRequest }) =>
        matriculasApi.actualizar(id, data),
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
    aprobar: useMutation({
      mutationFn: ({
        id,
        observaciones,
      }: {
        id: number
        observaciones?: string
      }) => matriculasApi.aprobar(id, observaciones),
      onSuccess: invalidar,
    }),
    rechazar: useMutation({
      mutationFn: ({
        id,
        observaciones,
      }: {
        id: number
        observaciones?: string
      }) => matriculasApi.rechazar(id, observaciones),
      onSuccess: invalidar,
    }),
    matricular: useMutation({
      mutationFn: ({
        id,
        fechaPago,
        montoPago,
      }: {
        id: number
        fechaPago: string
        montoPago: number
      }) => matriculasApi.matricular(id, fechaPago, montoPago),
      onSuccess: invalidar,
    }),
  }
}