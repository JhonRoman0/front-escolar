"use client"

import { Badge } from "@/components/ui/badge"
import type { EstadoAsistencia } from "@/lib/api/asistencia"

const CONFIG: Record<EstadoAsistencia, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" | "outline" }> = {
  Puntual: { label: "Puntual", variant: "success" },
  Tardanza: { label: "Tardanza", variant: "warning" },
  Inasistencia: { label: "Falta", variant: "danger" },
  Justificada: { label: "Justificada", variant: "info" },
  Pendiente: { label: "Pendiente", variant: "secondary" },
  "Sin clases": { label: "Sin clases", variant: "outline" },
}

/** null: un día que aún no llega. */
export function AsistenciaEstadoBadge({ estado }: { estado: EstadoAsistencia | null }) {
  if (!estado) return <span className="text-xs text-muted-foreground">—</span>
  const config = CONFIG[estado] ?? { label: estado, variant: "secondary" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
