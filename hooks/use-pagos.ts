import { useMutation, useQuery } from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"
import {
  pagosApi,
  type MetodoPagoRequest,
  type MontoMatriculaRequest,
} from "@/lib/api/pagos"

const KEYS = {
  metodos: ["metodos-pago"] as const,
  montos: ["montos-matricula"] as const,
  // El monto de cada grado viaja en las opciones de matrícula.
  matriculas: ["matriculas"] as const,
}

export function useMetodosPago(soloActivos = false) {
  return useQuery({
    queryKey: [...KEYS.metodos, soloActivos],
    queryFn: () => pagosApi.metodos(soloActivos),
  })
}

export function useMontosMatricula(idAnio: number | null) {
  return useQuery({
    queryKey: [...KEYS.montos, idAnio],
    queryFn: () => pagosApi.montos(idAnio as number),
    enabled: !!idAnio,
  })
}

export function useParentescos() {
  return useQuery({ queryKey: ["parentescos"], queryFn: pagosApi.parentescos, staleTime: Infinity })
}

export function useSexos() {
  return useQuery({ queryKey: ["sexos"], queryFn: pagosApi.sexos, staleTime: Infinity })
}

export function useCrudMetodosPago() {
  const invalidar = useInvalidarMutacion(KEYS.metodos)
  return {
    crear: useMutation({
      mutationFn: (data: MetodoPagoRequest) => pagosApi.crearMetodo(data),
      onSuccess: invalidar,
    }),
    actualizar: useMutation({
      mutationFn: ({ id, data }: { id: number; data: MetodoPagoRequest }) => pagosApi.actualizarMetodo(id, data),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({
      mutationFn: (id: number) => pagosApi.eliminarMetodo(id),
      onSuccess: invalidar,
    }),
  }
}

export function useGuardarMontos() {
  const invalidar = useInvalidarMutacion(KEYS.montos, KEYS.matriculas)
  return useMutation({
    mutationFn: (data: MontoMatriculaRequest) => pagosApi.guardarMontos(data),
    onSuccess: invalidar,
  })
}
