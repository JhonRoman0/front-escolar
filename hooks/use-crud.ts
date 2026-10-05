import { useMutation } from "@tanstack/react-query"

import { useInvalidarMutacion } from "@/hooks/use-invalidar"

// Hook genérico de CRUD ≡ el patrón repetido en todos los catálogos:
// crea/actualiza/elimina e invalida la query del módulo (+ extras).
export function useCrud<T, R>(
  key: readonly unknown[],
  extraKeys: readonly (readonly unknown[])[],
  crearFn: (d: R) => Promise<T>,
  actualizarFn: (args: { id: number; data: R }) => Promise<T>,
  eliminarFn: (id: number) => Promise<void>
) {
  const invalidar = useInvalidarMutacion(key, ...extraKeys)
  return {
    crear: useMutation({ mutationFn: crearFn, onSuccess: invalidar }),
    actualizar: useMutation({
      mutationFn: actualizarFn,
      onSuccess: invalidar,
    }),
    eliminar: useMutation({ mutationFn: eliminarFn, onSuccess: invalidar }),
  }
}
