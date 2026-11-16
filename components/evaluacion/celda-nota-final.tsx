"use client"

import { useState } from "react"
import { ListChecks, LockOpen, MessageSquareText } from "lucide-react"

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

/** Igual que en el backend (Nota.MOTIVO_MAXIMO). */
export const MOTIVO_MAXIMO = 500

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
        <ListChecks className={cn(celda.guia.length || celda.referencias.length ? "text-foreground" : "text-muted-foreground/50")} />
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
        {celda.referencias.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <p className="mb-1.5 text-xs font-semibold">De otra sección (referencia)</p>
            <ul className="flex flex-col gap-1.5">
              {celda.referencias.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-xs">
                  <span>
                    <span className="font-medium">{r.evaluacion}</span>
                    <span className="text-muted-foreground"> · {r.seccion} · {formatearFecha(r.fecha)}</span>
                  </span>
                  <span className="font-mono font-semibold">{r.calificacion}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">No entran al promedio.</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function Conclusion({ escala, valor, onChange, editable }: {
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

/**
 * nota: se escribe. conclusion: la nota la calcula el sistema (vigesimal) y solo
 * se escribe la conclusión. lectura: nada se edita.
 */
export type ModoCelda = "nota" | "conclusion" | "lectura"

/** Anula una nota final con su motivo para volver a registrarla. */
export function ReabrirNota({
  descripcion,
  onReabrir,
}: {
  descripcion: string
  /** true si se reabrió. */
  onReabrir: (motivo: string) => Promise<boolean>
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    setEnviando(true)
    const reabierta = await onReabrir(motivo.trim())
    setEnviando(false)
    if (reabierta) {
      setAbierto(false)
      setMotivo("")
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Reabrir la nota" title="Reabrir la nota" />}
      >
        <LockOpen className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <p className="text-xs font-semibold">Reabrir la nota</p>
        <p className="mb-2 text-xs text-muted-foreground">{descripcion}</p>
        <Textarea
          rows={3}
          maxLength={MOTIVO_MAXIMO}
          placeholder="Motivo *"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="outline" disabled={!motivo.trim() || enviando} onClick={confirmar}>
            Reabrir
          </Button>
        </div>
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
  modo,
  alumno,
  competencia,
  onReabrir,
}: {
  celda: CeldaNotaFinal
  escala: EscalaCalificacion
  valor: ValorNotaFinal
  onChange: (valor: ValorNotaFinal) => void
  modo: ModoCelda
  alumno: string
  competencia: string
  /** Solo si se puede reabrir. */
  onReabrir?: (motivo: string) => Promise<boolean>
}) {
  // Sin notas de evaluaciones no hay nota final (salvo el trasladado que registra dirección).
  const sinEvaluaciones = celda.calificacion == null && celda.guia.length === 0 && !celda.soloDireccion
  return (
    <div className="flex items-center justify-center gap-0.5">
      {sinEvaluaciones ? (
        <Tooltip>
          <TooltipTrigger render={<span className="text-center text-[11px] text-muted-foreground" />}>
            Sin evaluaciones
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">Primero califícalo en alguna evaluación de esta competencia.</TooltipContent>
        </Tooltip>
      ) : modo === "nota" ? (
        <CampoCalificacion
          escala={escala}
          value={valor.calificacion}
          onChange={(calificacion) => onChange({ ...valor, calificacion })}
          ariaLabel={`Nota de ${alumno} en la competencia ${competencia}`}
        />
      ) : modo === "conclusion" ? (
        <Tooltip>
          <TooltipTrigger render={<span className="min-w-8 text-center font-mono font-semibold" />}>
            {valor.calificacion || "—"}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {celda.calificacion == null
              ? "Promedio de las evaluaciones: se registra al guardar"
              : `Promedio registrado por ${celda.registradoPor}. Para cambiarlo, reábrela.`}
          </TooltipContent>
        </Tooltip>
      ) : celda.soloDireccion ? (
        <Tooltip>
          <TooltipTrigger render={<span className="text-center text-[11px] text-amber-700 dark:text-amber-400" />}>
            Pendiente · dirección
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Cursó este periodo en otra sección y quedó sin nota final: la registra quien puede corregir notas.
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span className="min-w-8 text-center font-mono font-semibold" />}>
            {celda.calificacion ?? "—"}
            {celda.seccionOrigen && <span className="ml-0.5 text-xs font-normal text-muted-foreground">↗</span>}
          </TooltipTrigger>
          <TooltipContent>
            {!celda.registradoPor
              ? "Sin nota registrada"
              : celda.seccionOrigen
                ? `Calificado en ${celda.seccionOrigen} por ${celda.registradoPor}`
                : `Registrada por ${celda.registradoPor}`}
          </TooltipContent>
        </Tooltip>
      )}
      <Guia celda={celda} escala={escala} />
      {!sinEvaluaciones && (
        <Conclusion
          escala={escala}
          valor={valor}
          editable={modo !== "lectura"}
          onChange={(conclusion) => onChange({ ...valor, conclusion })}
        />
      )}
      {onReabrir && (
        <ReabrirNota
          descripcion={`La nota de ${alumno} en la competencia ${competencia} se anula y sus evaluaciones se desbloquean para corregirlas.`}
          onReabrir={onReabrir}
        />
      )}
    </div>
  )
}
