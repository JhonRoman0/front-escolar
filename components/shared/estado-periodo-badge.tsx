import { Badge } from "@/components/ui/badge"

import type { EstadoPeriodo } from "@/lib/api/academico"
import { ESTADO_PERIODO } from "@/lib/calificaciones"

export function EstadoPeriodoBadge({ estado, className }: { estado: EstadoPeriodo; className?: string }) {
  const { texto, variant } = ESTADO_PERIODO[estado]
  return (
    <Badge variant={variant} className={className}>
      {texto}
    </Badge>
  )
}
