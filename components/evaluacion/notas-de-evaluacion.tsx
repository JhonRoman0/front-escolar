"use client"

import { useMemo, useState } from "react"

import { FilterSelect } from "@/components/shared/filter-select"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useRegistroAuxiliar } from "@/hooks/use-evaluaciones"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { esNotaDesaprobada } from "@/lib/calificaciones"
import { cn } from "@/lib/utils"
import { HistorialCalificacionesDialog } from "./historial-calificaciones-dialog"
import { ProcedenciaCalificacion } from "./procedencia-calificacion"

type FiltroNotas = "todos" | "aprobados" | "desaprobados"

const OPCIONES_FILTRO_NOTAS: { value: FiltroNotas; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aprobados", label: "Aprobados" },
  { value: "desaprobados", label: "Desaprobados" },
]

/** Desplegable de una evaluación: cada alumno con su nota en ella. Solo consulta. */
export function NotasDeEvaluacion({
  idAsignacion,
  periodo,
  periodos,
  idEvaluacion,
}: {
  idAsignacion: number
  periodo: number
  periodos: PeriodoEvaluacion[]
  idEvaluacion: number
}) {
  // Misma consulta para todas las evaluaciones del curso y periodo: se pide una vez.
  const { data, isLoading } = useRegistroAuxiliar(idAsignacion, periodo)
  const [filtro, setFiltro] = useState<FiltroNotas>("todos")
  const notasVisibles = useMemo(() => {
    if (!data) return []
    return data.alumnos.filter((a) => {
      const nota = a.notas[idEvaluacion]
      if (!nota) return filtro === "todos"
      if (filtro === "todos") return true
      const desaprobada = esNotaDesaprobada(data.escala, nota, data.notaMinima)
      return filtro === "desaprobados" ? desaprobada : !desaprobada
    })
  }, [data, filtro, idEvaluacion])

  if (isLoading || !data) return <CargandoTarjetas filas={1} />
  if (!data.alumnos.length) {
    return <p className="text-[12px] text-muted-foreground">No hay alumnos matriculados en esta sección.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold text-[#495057]">Notas de los alumnos</p>
        <FilterSelect
          label="Filtro"
          value={filtro}
          onValueChange={(value) => setFiltro(value as FiltroNotas)}
          options={OPCIONES_FILTRO_NOTAS}
          includeAll={false}
          className="w-40"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {notasVisibles.map((a) => {
          const nota = a.notas[idEvaluacion]
          const desaprobada = !!nota && esNotaDesaprobada(data.escala, nota, data.notaMinima)
          return (
            <div key={a.idMatricula} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{a.nombre}</p>
                  {a.tieneHistorial && (
                    <HistorialCalificacionesDialog periodos={periodos} idMatricula={a.idMatricula} idAsignacion={idAsignacion} nombre={a.nombre} />
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground">{a.codigo}</p>
              </div>
              <span className={cn("shrink-0 font-mono text-sm font-semibold", desaprobada && "text-destructive")}>
                {nota ?? <span className="font-normal text-muted-foreground">—</span>}
                <ProcedenciaCalificacion procedencia={a.procedencias[idEvaluacion]} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
