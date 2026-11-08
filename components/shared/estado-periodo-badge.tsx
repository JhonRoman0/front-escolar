import { Badge } from "@/components/ui/badge"

import type { EstadoPeriodo } from "@/lib/api/academico"
import { ESTADO_PERIODO } from "@/lib/calificaciones"

export function EstadoPeriodoBadge({ estado }: { estado: EstadoPeriodo }) {
  const { texto, variant } = ESTADO_PERIODO[estado]
  return <Badge variant={variant}>{texto}</Badge>
}
