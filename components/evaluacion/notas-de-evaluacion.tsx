"use client"

import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useRegistroAuxiliar } from "@/hooks/use-evaluaciones"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { HistorialCalificacionesDialog } from "./historial-calificaciones-dialog"
import { ProcedenciaCalificacion } from "./procedencia-calificacion"

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
  if (isLoading || !data) return <CargandoTarjetas filas={1} />
  if (!data.alumnos.length) {
    return <p className="text-[12px] text-muted-foreground">No hay alumnos matriculados en esta sección.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-semibold text-[#495057]">Notas de los alumnos</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.alumnos.map((a) => (
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
            <span className="shrink-0 font-mono text-sm font-semibold">
              {a.notas[idEvaluacion] ?? <span className="font-normal text-muted-foreground">—</span>}
              <ProcedenciaCalificacion procedencia={a.procedencias[idEvaluacion]} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
