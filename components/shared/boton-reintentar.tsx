import { Button } from "@/components/ui/button"

/**
 * Reintenta el refetch de React Query: el botón "Se cayó la carga" que repite
 * cada catálogo. `refetch` es el del hook de datos, así que este botón no
 * mantiene estado propio.
 */
export function BotonReintentar({ refetch }: { refetch: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={() => refetch()}>
      Reintentar
    </Button>
  )
}