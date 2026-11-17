"use client"

import { ChevronDown } from "lucide-react"

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { useNotasPortal } from "@/hooks/use-portal-apoderado"
import type { PeriodoNotas } from "@/lib/api/portal-apoderado"
import { formatearFecha } from "@/lib/fechas"
import { Cargando, ErrorCarga, NotaBadge, Vacio } from "./comunes"

const ESTADO_PERIODO: Record<string, { label: string; variant: "secondary" | "info" | "outline" }> = {
  ABIERTO: { label: "En curso", variant: "info" },
  CERRADO: { label: "Cerrado", variant: "secondary" },
  POR_COMENZAR: { label: "Por comenzar", variant: "outline" },
}

function Periodo({ periodo }: { periodo: PeriodoNotas }) {
  const estado = ESTADO_PERIODO[periodo.estado]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{periodo.nombre}</p>
        {estado && <Badge variant={estado.variant}>{estado.label}</Badge>}
      </div>
      {periodo.evaluaciones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin evaluaciones aún.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {periodo.evaluaciones.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{e.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.fecha && formatearFecha(e.fecha), e.otraSeccion && `Sección anterior: ${e.otraSeccion}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <NotaBadge calificacion={e.calificacion} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Notas en vivo de las evaluaciones: cada una aparece con su nota apenas el docente la guarda. */
export function NotasTab({ idMatricula }: { idMatricula: number }) {
  const { data, isLoading, error } = useNotasPortal(idMatricula)
  if (isLoading) return <Cargando />
  if (error || !data) return <ErrorCarga error={error} />
  if (data.length === 0) return <Vacio>No hay cursos registrados para este año.</Vacio>

  return (
    <Accordion multiple className="flex flex-col gap-2">
      {data.map((curso) => {
        const evaluadas = curso.periodos.flatMap((p) => p.evaluaciones).filter((e) => e.calificacion).length
        return (
          <AccordionItem key={curso.curso} value={curso.curso} className="overflow-hidden rounded-2xl border bg-card">
            <AccordionTrigger className="rounded-none px-4">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180" />
              <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{curso.curso}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {evaluadas} {evaluadas === 1 ? "nota" : "notas"}
              </span>
            </AccordionTrigger>
            <AccordionPanel>
              <div className="flex flex-col gap-4 px-4 pb-4">
                {curso.periodos.map((p) => <Periodo key={p.numero} periodo={p} />)}
              </div>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
