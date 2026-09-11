import { Badge } from "@/components/ui/badge"

export function EstadoBadge({ acceso }: { acceso: number }) {
  if (acceso === 2) {
    return (
      <Badge variant="destructive" className="capitalize">
        Eliminado
      </Badge>
    )
  }
  if (acceso === 0) {
    return <Badge variant="outline">Inactivo</Badge>
  }
  return <Badge variant="success">Activo</Badge>
}

export function EstadoBadgeMenu({ acceso }: { acceso: number }) {
  if (acceso === 0) return <Badge variant="outline">Inactivo</Badge>
  if (acceso === 2) return <Badge variant="destructive">Eliminado</Badge>
  return <Badge variant="success">Activo</Badge>
}

export const NOMBRE_ACCESO: Record<number, string> = {
  0: "Inactivo",
  1: "Activo",
  2: "Eliminado",
}