import type { Procedencia } from "@/lib/api/evaluaciones"

/** Marca de una nota usada de otra sección. */
export function ProcedenciaCalificacion({ procedencia }: { procedencia?: Procedencia | null }) {
  if (!procedencia) return null
  const texto = `Nota de ${procedencia.seccion}: ${procedencia.evaluacion}`
  return (
    <span className="ml-1 text-xs text-muted-foreground" title={texto} aria-label={texto}>
      ↗
    </span>
  )
}
