"use client"

import { Camera, ClipboardCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { FilasCargando } from "@/components/shared/table-helpers"
import { AnularMarca } from "./anular-marca"
import { AsistenciaEstadoBadge } from "./asistencia-estado-badge"
import type { AsistenciaDiaResponse } from "@/lib/api/asistencia"
import { formatearHora } from "@/lib/fechas"

interface AsistenciaTablaHoyProps {
  asistencias: AsistenciaDiaResponse[]
  cargando?: boolean
  puedeJustificar?: boolean
  puedeAnular?: boolean
  onJustificar?: (a: AsistenciaDiaResponse) => void
  /** Debe rechazar si falla para que el diálogo no se cierre. */
  onAnular?: (a: AsistenciaDiaResponse, motivo: string) => Promise<void>
}

export function AsistenciaTablaHoy({
  asistencias,
  cargando,
  puedeJustificar = false,
  puedeAnular = false,
  onJustificar,
  onAnular,
}: AsistenciaTablaHoyProps) {
  const mostrarAcciones = puedeJustificar || puedeAnular
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
                  <div className="flex items-center gap-1">
                    <AsistenciaEstadoBadge estado={a.estado} />
                    {a.acompanante && <EvidenciaIngreso fila={a} />}
                  </div>
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
                      {puedeAnular && onAnular && a.idAsistencia && (
                        <AnularMarca
                          alumno={a.alumno}
                          hora={formatearHora(a.horaEntrada)}
                          onAnular={(motivo) => onAnular(a, motivo)}
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

/** Ingreso justificado: motivo, quién lo trajo y la foto de evidencia. */
function EvidenciaIngreso({ fila }: { fila: AsistenciaDiaResponse }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Evidencia del ingreso de ${fila.alumno}`} />}>
        <Camera className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs">
        <p className="font-semibold">Ingreso justificado</p>
        {fila.justificacion && <p className="text-muted-foreground">Motivo: {fila.justificacion}</p>}
        <p className="text-muted-foreground">Lo trajo: {fila.acompanante}</p>
        {fila.urlEvidencia && (
          <a href={fila.urlEvidencia} target="_blank" rel="noreferrer" className="mt-2 block">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto de Cloudinary */}
            <img src={fila.urlEvidencia} alt="Foto de evidencia" className="w-full rounded-md border object-cover" />
          </a>
        )}
      </PopoverContent>
    </Popover>
  )
}
