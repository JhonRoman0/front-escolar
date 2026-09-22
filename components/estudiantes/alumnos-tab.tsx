"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown, Pencil, Plus, QrCode } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { TablaPaginacion } from "@/components/shared/paginacion-tabla"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useCrudAlumnos, useAlumnos } from "@/hooks/use-estudiantes"
import { usePuede } from "@/hooks/use-permisos"
import { formatoEdad } from "@/lib/edades"
import type { AlumnoResponse } from "@/lib/api/estudiantes"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfAlumnos } from "@/lib/reportes/generar-pdf"
import { generarExcelAlumnos } from "@/lib/reportes/generar-excel"
import { generarCsvAlumnos } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { AlumnoFormDialog } from "./alumno-form-dialog"
import { AlumnoQrModal } from "./alumno-qr-modal"

const TAMANIO_PAGINA = 10

export function AlumnosTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, refetch } = useAlumnos(
    page,
    TAMANIO_PAGINA
  )
  const crud = useCrudAlumnos()
  const puedeCrear = usePuede("ALUMNOS", "CREAR")
  const puedeActualizar = usePuede("ALUMNOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("ALUMNOS", "ELIMINAR")
  const puedeExportar = usePuede("ALUMNOS", "IMPRIMIR_EXPORTAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AlumnoResponse | null>(null)
  const [dialogSeq, setDialogSeq] = useState(0)
  const [qrAlumno, setQrAlumno] = useState<AlumnoResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    _filtros: Record<string, string>
  ) {
    const datos = await reportesApi.alumnos(inicio, fin, {
      idGradoSeccion: filtroGradoSeccion ?? undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay alumnos en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfAlumnos({ datos, inicio, fin })
    else if (formato === "excel") generarExcelAlumnos({ datos, inicio, fin })
    else generarCsvAlumnos({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  async function handleEliminar(alumno: AlumnoResponse) {
    try {
      await crud.eliminar.mutateAsync(alumno.idAlumno)
      toast.success(`Alumno "${alumno.nombre} ${alumno.apellidoPat}" eliminado`)
      if (data?.content.length === 1 && page > 0) {
        setPage((p) => p - 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Alumnos</h2>
            <p className="text-sm text-muted-foreground">
              Cada alumno tiene su código QR para la asistencia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puedeExportar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReporteOpen(true)}
              >
                <FileDown />
                Generar reporte
              </Button>
            )}
            {puedeCrear && (
              <Button
                onClick={() => {
                  setEditando(null)
                  setDialogSeq((s) => s + 1)
                  setDialogOpen(true)
                }}
              >
                <Plus />
                Nuevo alumno
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Apoderado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.content.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay alumnos." />
            ) : (
              data.content.map((alumno) => {
                const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPat} ${alumno.apellidoMat}`.trim()
                const iniciales = `${alumno.nombre[0] ?? ""}${alumno.apellidoPat[0] ?? ""}`.toUpperCase()
                const apoderado = alumno.apoderados[0]
                return (
                  <TableRow key={alumno.idAlumno}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {alumno.urlFoto ? (
                            <AvatarImage
                              src={alumno.urlFoto}
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
                            {alumno.direccion || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {alumno.codigo}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {alumno.documentoIdentidad || "—"}
                    </TableCell>
                    <TableCell>{formatoEdad(alumno.fechaNacimiento)}</TableCell>
                    <TableCell className="text-xs">
                      {alumno.apoderados.length ? (
                        <div className="space-y-0.5">
                          <p>
                            {`${apoderado.nombre} ${apoderado.apellidoPat} ${apoderado.apellidoMat}`.trim()}
                            <span className="ml-1 text-muted-foreground">
                              (principal)
                            </span>
                          </p>
                          {alumno.apoderados[1] && (
                            <p className="text-muted-foreground">
                              {`${alumno.apoderados[1].nombre} ${alumno.apoderados[1].apellidoPat} ${alumno.apoderados[1].apellidoMat}`.trim()}
                            </p>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={alumno.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`QR de ${nombreCompleto}`}
                          onClick={() => setQrAlumno(alumno)}
                        >
                          <QrCode />
                        </Button>
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar ${nombreCompleto}`}
                            onClick={() => {
                              setEditando(alumno)
                              setDialogSeq((s) => s + 1)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar alumno"
                            descripcion={`Se marcará a "${nombreCompleto}" como eliminado.`}
                            onConfirm={() => handleEliminar(alumno)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        {!!data?.totalPages && data.totalPages > 1 && (
          <TablaPaginacion data={data} onPage={setPage} />
        )}

        <AlumnoFormDialog
          key={`${editando ? `edit-${editando.idAlumno}` : "create"}-${dialogSeq}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          alumno={editando}
        />

        {qrAlumno && (
          <AlumnoQrModal
            alumno={qrAlumno}
            open={!!qrAlumno}
            onOpenChange={(open) => {
              if (!open) setQrAlumno(null)
            }}
          />
        )}

        <ReporteModal
          open={reporteOpen}
          onOpenChange={setReporteOpen}
          titulo="Reporte de alumnos"
          descripcion="Descarga el padrón de alumnos del rango en PDF, Excel o CSV."
          presets={["ultimos_7", "este_mes", "personalizado"]}
          filtros={[
            {
              id: "idGradoSeccion",
              label: "Grado y sección",
              opciones: [],
              valor: "",
              onChange: () => {},
              render: () => (
                <GradoSeccionCascada
                  value={filtroGradoSeccion}
                  onChange={setFiltroGradoSeccion}
                />
              ),
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}