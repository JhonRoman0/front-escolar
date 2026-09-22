"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useCambiosDocente } from "@/hooks/use-academico"

export default function CambiosDocenteTab() {
  const { data: cambios = [], isLoading, isError, refetch } = useCambiosDocente()

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">Historial de Cambios de Docente</h2>
          <p className="text-sm text-muted-foreground">
            Registro histórico de todas las sustituciones y cambios de asignaciones.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asignación</TableHead>
              <TableHead>Docente anterior</TableHead>
              <TableHead>Docente nuevo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={6} />
            ) : isError ? (
              <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !cambios.length ? (
              <MensajeSinDatos columnas={6} mensaje="Aún no hay cambios registrados." />
            ) : (
              cambios.map((c) => (
                <TableRow key={c.idCambio}>
                  <TableCell className="font-mono text-xs">
                    #{c.idAsignacion}
                  </TableCell>
                  <TableCell>{c.docenteAnterior}</TableCell>
                  <TableCell>{c.docenteNuevo}</TableCell>
                  <TableCell className="text-xs">{c.motivo}</TableCell>
                  <TableCell className="text-xs">{c.fechaCambio}</TableCell>
                  <TableCell className="text-xs">{c.usuarioRegistro}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
