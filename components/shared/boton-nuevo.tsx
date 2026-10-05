import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Botón de alta de un catálogo. Renderiza null cuando el usuario no tiene
 * permiso CREAR, para que el call site no tenga que envolverlo en un condicional.
 */
export function BotonNuevo({
  texto,
  onClick,
  puedeCrear = true,
}: {
  texto: string
  onClick: () => void
  puedeCrear?: boolean
}) {
  if (!puedeCrear) return null

  return (
    <Button variant="brand" onClick={onClick}>
      <Plus data-icon="inline-start" />
      {texto}
    </Button>
  )
}
