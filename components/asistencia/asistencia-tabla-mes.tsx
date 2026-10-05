"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { cn } from "@/lib/utils"
import { FilasCargando } from "@/components/shared/table-helpers"
import type { ResumenMensualResponse } from "@/lib/api/asistencia"

interface AsistenciaTablaMesProps {
  asistencias: ResumenMensualResponse[]
  cargando?: boolean
}

// Color según % de asistencia
function colorPorcentaje(porcentaje: number): string {
  if (porcentaje >= 90) return "text-emerald-700 dark:text-emerald-400"
  if (porcentaje >= 75) return "text-amber-700 dark:text-amber-400"
  return "text-rose-700 dark:text-rose-400"
}

export function AsistenciaTablaMes({
  asistencias,
  cargando,
}: AsistenciaTablaMesProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-50">Estudiante</TableHead>
            <TableHead>Grado - Sección</TableHead>
            <TableHead className="text-center">Días asistidos</TableHead>
            <TableHead className="text-center">Inasistencias</TableHead>
            <TableHead className="text-right">% Asistencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <FilasCargando columnas={5} />
          ) : asistencias.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No hay alumnos que coincidan con la búsqueda.
              </TableCell>
            </TableRow>
          ) : (
            asistencias.map((a) => (
              <TableRow key={a.idAlumno}>
                <TableCell className="font-medium">{a.alumno}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.grado} - Sección {a.seccion}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {a.diasAsistidos}
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">
                  {a.inasistencias}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono font-semibold",
                    colorPorcentaje(a.porcentajeAsistencia)
                  )}
                >
                  {a.porcentajeAsistencia}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
