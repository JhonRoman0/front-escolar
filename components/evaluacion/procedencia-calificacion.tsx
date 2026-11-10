import type { Procedencia } from "@/lib/api/evaluaciones"
export function ProcedenciaCalificacion({ procedencia }: { procedencia?: Procedencia | null }) {
  if (!procedencia) return null
  return <span className="ml-1 text-xs text-muted-foreground" title={`Reconocida de ${procedencia.seccion}: ${procedencia.evaluacion}`} aria-label={`Reconocida de ${procedencia.seccion}: ${procedencia.evaluacion}`}>↗</span>
}
