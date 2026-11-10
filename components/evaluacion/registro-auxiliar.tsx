"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useRegistroAuxiliar } from "@/hooks/use-evaluaciones"
import { formatearFecha } from "@/lib/fechas"
import { HistorialCalificacionesDialog } from "./historial-calificaciones-dialog"
import { ProcedenciaCalificacion } from "./procedencia-calificacion"

/**
 * Registro auxiliar del curso en el periodo: cada alumno con sus notas en todas
 * las evaluaciones y, por competencia, las notas que la afectan (en vigesimal,
 * su promedio). Pulsar una evaluación abre sus notas.
 */
export function RegistroAuxiliar({
  idAsignacion,
  periodo,
  onAbrirEvaluacion,
}: {
  idAsignacion: number
  periodo: number
  onAbrirEvaluacion: (idEvaluacion: number) => void
}) {
  const { data, isLoading } = useRegistroAuxiliar(idAsignacion, periodo)
  if (isLoading || !data) return <CargandoTarjetas filas={2} />
  const vigesimal = data.escala === "VIGESIMAL"

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="min-w-[220px]">Alumno</TableHead>
            {data.evaluaciones.map((e) => (
              <TableHead key={e.idEvaluacion} className="min-w-[110px] text-center align-bottom">
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-0.5 rounded px-1 py-1 hover:bg-muted"
                  title="Ver o registrar sus notas"
                  onClick={() => onAbrirEvaluacion(e.idEvaluacion)}
                >
                  <span className="line-clamp-2 font-medium text-foreground">{e.nombre}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{formatearFecha(e.fecha)}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    C{e.competencias.map((c) => c.codigo).join(", C")}
                  </span>
                </button>
              </TableHead>
            ))}
            {data.competencias.map((c) => (
              <TableHead key={c.idCompetencia} className="min-w-[100px] bg-muted/50 text-center">
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}>
                    Comp. {c.codigo}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{c.nombre}</TooltipContent>
                </Tooltip>
                <p className="text-[11px] font-normal text-muted-foreground">{vigesimal ? "Promedio" : "Notas"}</p>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.alumnos.map((a, i) => (
            <TableRow key={a.idMatricula}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <p className="font-medium">{a.nombre}</p>
                {a.tieneHistorial && <HistorialCalificacionesDialog idMatricula={a.idMatricula} idAsignacion={idAsignacion} nombre={a.nombre} />}
                <p className="text-xs text-muted-foreground">{a.codigo}</p>
              </TableCell>
              {data.evaluaciones.map((e) => (
                <TableCell key={e.idEvaluacion} className="text-center font-mono">
                  {a.notas[e.idEvaluacion] ?? <span className="text-muted-foreground">—</span>}
                  <ProcedenciaCalificacion procedencia={a.procedencias[e.idEvaluacion]} />
                </TableCell>
              ))}
              {a.competencias.map((c) => (
                <TableCell key={c.idCompetencia} className="bg-muted/30 text-center font-mono">
                  {vigesimal ? (
                    c.promedio != null ? <span className="font-semibold">{c.promedio}</span> : <span className="text-muted-foreground">—</span>
                  ) : c.notas.length ? (
                    c.notas.join(" · ")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
