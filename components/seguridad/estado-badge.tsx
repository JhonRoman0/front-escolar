import { Badge } from "@/components/ui/badge"

function badgeAcceso(accesoId: number | null | undefined) {
  if (accesoId === 2) {
    return <Badge variant="destructive">Eliminado</Badge>
  }
  if (accesoId === 3) {
    return <Badge variant="outline">Inactivo</Badge>
  }
  return <Badge variant="success">Activo</Badge>
}

export function EstadoBadge({ accesoId }: { accesoId?: number | null }) {
  return badgeAcceso(accesoId)
}

export function EstadoBadgeMenu({ accesoId }: { accesoId?: number | null }) {
  return badgeAcceso(accesoId)
}

export const NOMBRE_ACCESO: Record<number, string> = {
  1: "Activo",
  2: "Eliminado",
  3: "Inactivo",
}