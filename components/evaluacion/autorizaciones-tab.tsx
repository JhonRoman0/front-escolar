"use client"

import { FileSpreadsheet, FileText, RefreshCw, Table as TablaIcono } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  CargandoTarjetas,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useAutorizaciones } from "@/hooks/use-evaluacion"
import type { AutorizacionRegistroResponse } from "@/lib/api/evaluacion"
import { generarCsvAutorizaciones } from "@/lib/reportes/generar-csv"
import { generarExcelAutorizaciones } from "@/lib/reportes/generar-excel"
import { generarPdfAutorizaciones } from "@/lib/reportes/generar-pdf"

function formatearFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function EstadoBadge({ estado }: { estado: AutorizacionRegistroResponse["estado"] }) {
  if (estado === "ACTIVA") {
    return <Badge variant="success">ACTIVA</Badge>
  }
  if (estado === "USADA") {
    return <Badge variant="secondary">USADA</Badge>
  }
  return <Badge variant="destructive">EXPIRADA</Badge>
}

export default function AutorizacionesTab() {
  const { data: autorizaciones = [], isLoading, isFetching, refetch } = useAutorizaciones()

  const ordenadas = [...autorizaciones].sort((a, b) =>
    b.fechaGeneracion.localeCompare(a.fechaGeneracion)
  )

  function descargar(formato: "pdf" | "excel" | "csv") {
    if (ordenadas.length === 0) {
      toast.warning("No hay códigos de autorización para exportar")
      return
    }
    if (formato === "pdf") generarPdfAutorizaciones({ datos: ordenadas })
    else if (formato === "excel") generarExcelAutorizaciones({ datos: ordenadas })
    else generarCsvAutorizaciones({ datos: ordenadas })
    toast.success(`Auditoría ${formato.toUpperCase()} descargada`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Autorizaciones</h2>
              <p className="text-sm text-muted-foreground">
                Códigos generados para modificar notas, con su estado de
                auditoría (se conservan usados y expirados).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => descargar("csv")}
                disabled={ordenadas.length === 0}
              >
                <TablaIcono />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => descargar("excel")}
                disabled={ordenadas.length === 0}
              >
                <FileSpreadsheet />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => descargar("pdf")}
                disabled={ordenadas.length === 0}
              >
                <FileText />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={isFetching ? "animate-spin" : ""} />
                Actualizar
              </Button>
            </div>
          </div>

          {isLoading ? (
            <CargandoTarjetas filas={2} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Emisor</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead>Generado</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Consumidor</TableHead>
                    <TableHead>Usado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenadas.length === 0 ? (
                    <MensajeSinDatos
                      columnas={9}
                      mensaje="Aún no se han generado códigos de autorización."
                    />
                  ) : (
                    ordenadas.map((a) => (
                      <TableRow key={a.idNotaAutorizacion}>
                        <TableCell>
                          <span className="font-mono text-sm font-semibold tracking-wider">
                            {a.codigo || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{a.emisor}</TableCell>
                        <TableCell className="text-xs">{a.destinatario}</TableCell>
                        <TableCell className="text-xs">
                          {formatearFecha(a.fechaAsignacion)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatearFecha(a.fechaGeneracion)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatearFecha(a.fechaExpiracion)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={a.estado} />
                        </TableCell>
                        <TableCell className="text-xs">{a.consumidor || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {formatearFecha(a.fechaUso)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}