"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { FilasCargando } from "@/components/shared/table-helpers"
import { AsistenciaEstadoBadge } from "./asistencia-estado-badge"
import type { MatrizSemanalResponse } from "@/lib/api/asistencia"
import { esFechaFutura, formatearFechaCorta } from "@/lib/fechas"

interface AsistenciaTablaSemanaProps {
  asistencias: MatrizSemanalResponse[]
  fechasDias: Date[]
  cargando?: boolean
}

const NOMBRES_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

export function AsistenciaTablaSemana({
  asistencias,
  fechasDias,
  cargando,
}: AsistenciaTablaSemanaProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-45">Estudiante</TableHead>
            {NOMBRES_DIAS.map((nombre, i) => (
              <TableHead key={nombre} className="text-center">
                <div className="flex flex-col">
                  <span>{nombre}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {fechasDias[i]
                      ? `(${formatearFechaCorta(fechasDias[i])})`
                      : ""}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <FilasCargando columnas={6} />
          ) : asistencias.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No hay alumnos que coincidan con la búsqueda.
              </TableCell>
            </TableRow>
          ) : (
            asistencias.map((a) => (
              <TableRow key={a.idAlumno}>
                <TableCell className="font-medium">{a.alumno}</TableCell>
                {a.estados.slice(0, 5).map((estado, i) => (
                  <TableCell key={i} className="text-center">
                    {fechasDias[i] && esFechaFutura(fechasDias[i]) ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <AsistenciaEstadoBadge estado={estado} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
