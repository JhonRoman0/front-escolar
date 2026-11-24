import { Badge } from "@/components/ui/badge"
import {
  ESTADOS_VIGENCIA,
  ETIQUETAS_ESTADO_VIGENCIA,
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
      return <Badge variant="success">{ETIQUETAS_ESTADO_VIGENCIA.VIGENTE}</Badge>
    case ESTADOS_VIGENCIA.INDEFINIDA:
      return <Badge variant="outline">{ETIQUETAS_ESTADO_VIGENCIA.INDEFINIDA}</Badge>
    case ESTADOS_VIGENCIA.NO_INICIADA:
      return <Badge variant="warning">{ETIQUETAS_ESTADO_VIGENCIA.NO_INICIADA}</Badge>
    case ESTADOS_VIGENCIA.VENCIDA:
      return <Badge variant="destructive">{ETIQUETAS_ESTADO_VIGENCIA.VENCIDA}</Badge>
  }
}
