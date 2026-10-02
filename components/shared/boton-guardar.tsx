import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Botón de envío de los formularios de catálogo. Unifica el spinner, el color de
 * marca y el bloqueo durante el guardado. El botón Cancelar NO se incluye: su
 * mecánica cambia según el contenedor (cierra el diálogo vía DialogTrigger o
 * descarta un formulario embebido en una tarjeta).
 */
export function BotonGuardar({
  etiqueta,
  enviando,
  disabled,
  size,
}: {
  etiqueta: string
  enviando: boolean
  disabled?: boolean
  size?: "sm" | "default"
}) {
  return (
    <Button type="submit" variant="brand" size={size} disabled={enviando || disabled}>
      {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
      {etiqueta}
    </Button>
  )
}
