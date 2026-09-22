import { Badge } from "@/components/ui/badge"

export const NOMBRE_SOLICITUD: Record<number, string> = {
  1: "Pendiente",
  2: "Aprobada",
  3: "Rechazada",
}

export function SolicitudBadge({ solicitud }: { solicitud: number }) {
  if (solicitud === 2) {
    return <Badge variant="success">Aprobada</Badge>
  }
  if (solicitud === 3) {
    return <Badge variant="destructive">Rechazada</Badge>
  }
  return <Badge variant="info">Pendiente</Badge>
}

export function formatoMonto(monto: number | null | undefined): string {
  if (monto == null) return "—"
  return `S/ ${monto.toFixed(2)}`
}