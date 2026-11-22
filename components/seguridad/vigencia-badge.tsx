import { Badge } from "@/components/ui/badge"
import {
  ESTADOS_VIGENCIA,
  estadoVigenciaEfectivo,
} from "@/lib/vigencia"

interface VigenciaBadgeProps {
  estado?: string | null
  inicio?: string | null
  fin?: string | null
}

export function VigenciaBadge({ estado, inicio, fin }: VigenciaBadgeProps) {
  const vigencia = estadoVigenciaEfectivo({ estado, inicio, fin })

  switch (vigencia) {
    case ESTADOS_VIGENCIA.VIGENTE:
      return <Badge variant="success">Vigente</Badge>
    case ESTADOS_VIGENCIA.INDEFINIDA:
      return <Badge variant="outline">Indefinida</Badge>
    case ESTADOS_VIGENCIA.NO_INICIADA:
      return <Badge variant="warning">No iniciada</Badge>
    case ESTADOS_VIGENCIA.VENCIDA:
      return <Badge variant="destructive">Vencida</Badge>
  }
}
