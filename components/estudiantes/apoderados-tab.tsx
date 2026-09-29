"use client"

import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useApoderados } from "@/hooks/use-estudiantes"
import { formatoEdad } from "@/lib/edades"

export function ApoderadosTab() {
  const { data, isLoading, isError, refetch } = useApoderados()

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Apoderados</h2>
            <p className="text-sm text-muted-foreground">
              Se registran al crear o editar un alumno.
            </p>
          </div>
          {isError && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw />
              Reintentar
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apoderado</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Parentesco</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos
                columnas={7}
                mensaje="No se pudo cargar. Reintenta."
              />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay apoderados." />
            ) : (
              data.map((apoderado) => {
                const nombreCompleto = `${apoderado.nombre} ${apoderado.apellidoPat} ${apoderado.apellidoMat}`.trim()
                const iniciales = `${apoderado.nombre[0] ?? ""}${apoderado.apellidoPat[0] ?? ""}`.toUpperCase()
                return (
                  <TableRow key={apoderado.idApoderado}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {apoderado.urlFoto ? (
                            <AvatarImage
                              src={apoderado.urlFoto}
                              alt={nombreCompleto}
                            />
                          ) : (
                            <AvatarFallback className="rounded-full text-xs">
                              {iniciales}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{nombreCompleto}</p>
                          <p className="text-xs text-muted-foreground">
                            {apoderado.codigo}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {apoderado.documentoIdentidad || "—"}
                    </TableCell>
                    <TableCell>{formatoEdad(apoderado.fechaNaci)}</TableCell>
                    <TableCell className="text-xs">
                      {apoderado.gmail || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {apoderado.celular || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {apoderado.parentesco || "—"}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={apoderado.accesoId} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}