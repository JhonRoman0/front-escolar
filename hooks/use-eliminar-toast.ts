import { toast } from "sonner"

/**
 * Envuelve la mutación de eliminar con los toasts que repite cada catálogo:
 * confirmación de éxito con el nombre del registro y un mensaje de error con el
 * texto del backend, o genérico si la excepción no lo trae.
 */
export function useEliminarConToast() {
  return async function eliminar(
    eliminarFn: (id: number) => Promise<void>,
    { id, mensaje }: { id: number; mensaje: string }
  ) {
    try {
      await eliminarFn(id)
      toast.success(mensaje)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }
}
