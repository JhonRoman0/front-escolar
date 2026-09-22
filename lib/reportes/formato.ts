import type { ReporteGeneralItem } from "@/lib/api/reportes"
import { formatearFecha } from "@/lib/fechas"

/** Fecha ISO "YYYY-MM-DD" → "dd/mm/yyyy" (para celdas y encabezados). */
export function fechaCorta(iso: string): string {
  return formatearFecha(iso)
}

/** LocalDateTime del back ("YYYY-MM-DDTHH:mm:ss") → "dd/mm/yy HH:mm". */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.toLocaleDateString("es-PE")} ${d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

export interface ConteoEstados {
  puntual: number
  tardanza: number
  justificada: number
  inasistencia: number
}

/** Resumen por estado para encabezados de reportes. */
export function contarEstados(datos: ReporteGeneralItem[]): ConteoEstados {
  const conteo: ConteoEstados = {
    puntual: 0,
    tardanza: 0,
    justificada: 0,
    inasistencia: 0,
  }
  for (const d of datos) {
    switch (d.estado) {
      case "Puntual":
        conteo.puntual += 1
        break
      case "Tardanza":
        conteo.tardanza += 1
        break
      case "Justificada":
        conteo.justificada += 1
        break
      default:
        conteo.inasistencia += 1
    }
  }
  return conteo
}
