import { toast } from "sonner"

/**
 * Envuelve el guardado de un diálogo (crear/actualizar) con el toast de error
 * que repite cada catálogo: el texto del backend cuando la excepción lo trae,
 * o un mensaje genérico. El toast de éxito y el cierre del diálogo quedan a
 * cargo del bloque que se pasa, que solo se ejecuta si no hay error.
 */
export async function guardarConToast(accion: () => Promise<void>) {
  try {
    await accion()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Error al guardar")
  }
}