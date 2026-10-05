"use client"

import { Badge } from "@/components/ui/badge"
import type { EstadoAsistencia } from "@/lib/api/asistencia"

const CONFIG: Record<EstadoAsistencia, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
  Puntual: { label: "Puntual", variant: "success" },
  Tardanza: { label: "Tardanza", variant: "warning" },
  Inasistencia: { label: "Inasistencia", variant: "danger" },
  Justificada: { label: "Justificada", variant: "info" },
}

export function AsistenciaEstadoBadge({ estado }: { estado: EstadoAsistencia }) {
  const config = CONFIG[estado] ?? {
    label: estado,
    variant: "secondary" as const,
  }
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
