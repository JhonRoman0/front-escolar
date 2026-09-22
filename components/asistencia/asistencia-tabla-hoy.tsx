"use client"

import { ClipboardCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { FilasCargando } from "@/components/shared/table-helpers"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { AsistenciaEstadoBadge } from "./asistencia-estado-badge"
import type { AsistenciaDiaResponse } from "@/lib/api/asistencia"
import { formatearHora } from "@/lib/fechas"

interface AsistenciaTablaHoyProps {
  asistencias: AsistenciaDiaResponse[]
  cargando?: boolean
  puedeJustificar?: boolean
  puedeEliminar?: boolean
  onJustificar?: (a: AsistenciaDiaResponse) => void
  /** Debe rechazar si falla para que el diálogo no se cierre. */
  onEliminar?: (a: AsistenciaDiaResponse) => Promise<void>
}

export function AsistenciaTablaHoy({
  asistencias,
  cargando,
  puedeJustificar = false,
  puedeEliminar = false,
  onJustificar,
  onEliminar,
}: AsistenciaTablaHoyProps) {
  const mostrarAcciones = puedeJustificar || puedeEliminar
  const columnas = 5 + (mostrarAcciones ? 1 : 0)

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alumno</TableHead>
            <TableHead>Grado - Sección</TableHead>
            <TableHead>Hora entrada</TableHead>
            <TableHead>Marcado por</TableHead>
            <TableHead>Estado</TableHead>
            {mostrarAcciones && (
              <TableHead className="text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <FilasCargando columnas={columnas} />
          ) : asistencias.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnas}
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
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {formatearHora(a.horaEntrada)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.marcadoPor ?? "—"}
                </TableCell>
                <TableCell>
                  <AsistenciaEstadoBadge estado={a.estado} />
                </TableCell>
                {mostrarAcciones && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {puedeJustificar && onJustificar && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Justificar asistencia de ${a.alumno}`}
                          title={
                            a.estado === "Justificada"
                              ? "Ya está justificada"
                              : "Cambiar a Justificada"
                          }
                          disabled={!a.idAsistencia || a.estado === "Justificada"}
                          onClick={() => onJustificar(a)}
                        >
                          <ClipboardCheck />
                        </Button>
                      )}
                      {puedeEliminar && onEliminar && a.idAsistencia && (
                        <ConfirmarEliminar
                          titulo="Eliminar asistencia"
                          descripcion={`Se eliminará el registro de ${a.alumno} (${formatearHora(a.horaEntrada)}). El alumno volverá a figurar como Inasistencia.`}
                          onConfirm={() => onEliminar(a)}
                        />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
