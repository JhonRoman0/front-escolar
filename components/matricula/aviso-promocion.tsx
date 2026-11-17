import { CircleCheck, RotateCcw } from "lucide-react"

import type { MatriculaOpciones } from "@/lib/api/matricula"

/** Promovido o repite según las notas del año anterior; nada si no aplica. */
export function AvisoPromocion({ opciones }: { opciones: MatriculaOpciones }) {
  if (!opciones.situacion) return null
  // Con la situación decidida solo queda un grado posible.
  const grado = opciones.grados[0]
  const destino = grado ? `${grado.grado} de ${grado.nivel}` : ""
  const areas = opciones.areasDesaprobadas ?? []

  if (opciones.situacion === "PROMOVIDO") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
        <span>
          <span className="font-semibold">Promovido{destino && ` a ${destino}`}</span>
          {areas.length > 0 && ` (desaprobó ${areas.join(", ")})`}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
      <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      <span>
        <span className="font-semibold">Repite{destino && ` ${destino}`}</span>: desaprobó {areas.length}{" "}
        {areas.length === 1 ? "área" : "áreas"} ({areas.join(", ")})
      </span>
    </div>
  )
}
