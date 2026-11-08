"use client"

import { ListChecks, MessageSquareText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { CampoCalificacion } from "@/components/shared/campo-calificacion"
import type { EscalaCalificacion } from "@/lib/api/academico"
import type { CeldaNotaFinal } from "@/lib/api/notas-finales"
import { CONCLUSION_MAXIMA, errorConclusion, requiereConclusion } from "@/lib/calificaciones"
import { formatearFecha } from "@/lib/fechas"
import { cn } from "@/lib/utils"

export interface ValorNotaFinal {
  calificacion: string
  conclusion: string
}

/** Notas de evaluaciones ligadas a la competencia; en vigesimal, también el promedio. */
function Guia({ celda, escala }: { celda: CeldaNotaFinal; escala: EscalaCalificacion }) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Ver notas de las evaluaciones" />}
      >
        <ListChecks className={cn(celda.guia.length ? "text-foreground" : "text-muted-foreground/50")} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <p className="mb-2 text-xs font-semibold">Evaluaciones del periodo</p>
        {celda.guia.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no tiene notas en evaluaciones de esta competencia.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {celda.guia.map((g, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-xs">
                <span>
                  <span className="font-medium">{g.evaluacion}</span>
                  <span className="text-muted-foreground"> · {g.curso} · {formatearFecha(g.fecha)}</span>
                </span>
                <span className="font-mono font-semibold">{g.calificacion}</span>
              </li>
            ))}
          </ul>
        )}
        {escala === "VIGESIMAL" && celda.promedio != null && (
          <p className="mt-2 border-t pt-2 text-xs">
            Promedio: <span className="font-mono font-semibold">{celda.promedio}</span>
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Conclusion({ escala, valor, onChange, editable }: {
  escala: EscalaCalificacion
  valor: ValorNotaFinal
  onChange: (conclusion: string) => void
  editable: boolean
}) {
  const error = errorConclusion(escala, valor.calificacion, valor.conclusion)
  const exigida = requiereConclusion(escala, valor.calificacion)
  if (!editable && !valor.conclusion) return null
  return (
    <Popover>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Conclusión descriptiva" />}
      >
        <MessageSquareText
          className={cn(
            error ? "text-destructive" : valor.conclusion ? "text-foreground" : exigida ? "text-amber-600" : "text-muted-foreground/50"
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <p className="mb-2 text-xs font-semibold">
          Conclusión descriptiva{exigida ? " (obligatoria)" : ""}
        </p>
        {editable ? (
          <>
            <Textarea
              rows={5}
              maxLength={CONCLUSION_MAXIMA}
              value={valor.conclusion}
              aria-invalid={!!error}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="mt-1 flex justify-between gap-2 text-xs">
              <span className="text-destructive">{error}</span>
              <span className="text-muted-foreground">{valor.conclusion.trim().length}/{CONCLUSION_MAXIMA}</span>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{valor.conclusion}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Nota final de una competencia: campo según la escala, guía y conclusión. */
export function CeldaNotaFinalEditable({
  celda,
  escala,
  valor,
  onChange,
  editable,
  alumno,
  competencia,
}: {
  celda: CeldaNotaFinal
  escala: EscalaCalificacion
  valor: ValorNotaFinal
  onChange: (valor: ValorNotaFinal) => void
  editable: boolean
  alumno: string
  competencia: string
}) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {editable ? (
        <CampoCalificacion
          escala={escala}
          value={valor.calificacion}
          onChange={(calificacion) => onChange({ ...valor, calificacion })}
          ariaLabel={`Nota de ${alumno} en la competencia ${competencia}`}
        />
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span className="min-w-8 text-center font-mono font-semibold" />}>
            {celda.calificacion ?? "—"}
          </TooltipTrigger>
          <TooltipContent>
            {celda.registradoPor ? `Registrada por ${celda.registradoPor}` : "Sin nota registrada"}
          </TooltipContent>
        </Tooltip>
      )}
      <Guia celda={celda} escala={escala} />
      <Conclusion
        escala={escala}
        valor={valor}
        editable={editable}
        onChange={(conclusion) => onChange({ ...valor, conclusion })}
      />
    </div>
  )
}
