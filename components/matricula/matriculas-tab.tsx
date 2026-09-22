"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { FileDown, History, Pencil, Plus, CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { TablaPaginacion } from "@/components/shared/paginacion-tabla"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useCrudMatriculas, useMatriculas } from "@/hooks/use-matricula"
import { usePuede } from "@/hooks/use-permisos"
import { useAniosEscolares } from "@/hooks/use-academico"
import type { MatriculaResponse } from "@/lib/api/matricula"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfMatriculas } from "@/lib/reportes/generar-pdf"
import { generarExcelMatriculas } from "@/lib/reportes/generar-excel"
import { generarCsvMatriculas } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { formatoMonto, SolicitudBadge } from "./matricula-badges"
import { HistorialDialog } from "./historial-dialog"
import { MatriculaFormDialog } from "./matricula-form-dialog"

const TAMANIO_PAGINA = 10

export function MatriculasTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, refetch } = useMatriculas(
    page,
    TAMANIO_PAGINA
  )
  const crud = useCrudMatriculas()
  const puedeCrear = usePuede("MATRICULAS", "CREAR")
  const puedeActualizar = usePuede("MATRICULAS", "ACTUALIZAR")
  const puedeEliminar = usePuede("MATRICULAS", "ELIMINAR")
  const puedeExportar = usePuede("MATRICULAS", "IMPRIMIR_EXPORTAR")
  const { data: aniosEscolares = [] } = useAniosEscolares()

  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<MatriculaResponse | null>(null)
  const [historial, setHistorial] = useState<MatriculaResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroAnio, setFiltroAnio] = useState("")
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)
  const [aprobarOpen, setAprobarOpen] = useState(false)
  const [rechazarOpen, setRechazarOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [matriculaSel, setMatriculaSel] = useState<MatriculaResponse | null>(null)

  const opcionesAnio = useMemo(
    () =>
      aniosEscolares
        .filter((a) => a.accesoId === 1)
        .map((a) => ({ value: String(a.idAnio), label: a.anio })),
    [aniosEscolares]
  )

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.matriculas(inicio, fin, {
      idAnio: filtros.idAnio ? Number(filtros.idAnio) : undefined,
      idGradoSeccion: filtroGradoSeccion ?? undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay matrículas en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfMatriculas({ datos, inicio, fin })
    else if (formato === "excel") generarExcelMatriculas({ datos, inicio, fin })
    else generarCsvMatriculas({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  const visibles =
    data?.content.filter(
      (m) => mostrarInactivas || m.accesoId === 1
    ) ?? []

  async function handleEliminar(matricula: MatriculaResponse) {
    try {
      await crud.eliminar.mutateAsync(matricula.idMatricula)
      toast.success(
        `Matrícula de "${matricula.alumno}" (${matricula.grado} ${matricula.seccion}) eliminada`
      )
      if (visibles.length === 1 && page > 0) {
        setPage((p) => p - 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Matrículas</h2>
              <p className="text-sm text-muted-foreground">
                Alumnos matriculados por año escolar y sección.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={mostrarInactivas}
                  onCheckedChange={setMostrarInactivas}
                />
                Ver inactivas
              </label>
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
                    setDialogOpen(true)
                  }}
                >
                  <Plus />
                  Nueva matrícula
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Apoderado</TableHead>
                <TableHead>Grado - Sección</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={10} />
              ) : isError ? (
                <MensajeSinDatos columnas={10} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos
                  columnas={10}
                  mensaje={
                    mostrarInactivas
                      ? "Aún no hay matrículas."
                      : "Aún no hay matrículas activas."
                  }
                />
              ) : (
                visibles.map((matricula) => (
                  <TableRow key={matricula.idMatricula}>
                    <TableCell>
                      <p className="font-medium">{matricula.alumno}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {matricula.codigoAlumno}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {matricula.apoderado}
                    </TableCell>
                    <TableCell>
                      {matricula.grado} {matricula.seccion}
                    </TableCell>
                    <TableCell>{matricula.turno}</TableCell>
                    <TableCell>{matricula.anio}</TableCell>
                    <TableCell>
                      <SolicitudBadge solicitud={matricula.solicitudMatricula} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <p>{formatoMonto(matricula.montoPago)}</p>
                        <p className="text-muted-foreground">
                          {matricula.fechaPago || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">
                      {matricula.observaciones || "—"}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={matricula.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Historial de ${matricula.alumno}`}
                          onClick={() => setHistorial(matricula)}
                        >
                          <History />
                        </Button>
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar matrícula de ${matricula.alumno}`}
                            onClick={() => {
                              setEditando(matricula)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {matricula.solicitudMatricula === 1 && puedeActualizar && (
                          <>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              aria-label="Aprobar"
                              onClick={() => {
                                setMatriculaSel(matricula)
                                setAprobarOpen(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="text-red-600 hover:text-red-700"
                              aria-label="Rechazar"
                              onClick={() => {
                                setMatriculaSel(matricula)
                                setRechazarOpen(true)
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {matricula.solicitudMatricula === 2 &&
                          !matricula.fechaPago &&
                          puedeActualizar && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="text-blue-600 hover:text-blue-700"
                              aria-label="Registrar pago"
                              onClick={() => {
                                setMatriculaSel(matricula)
                                setPagoOpen(true)
                              }}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar matrícula"
                            descripcion={`Se marcará la matrícula de "${matricula.alumno}" como eliminada.`}
                            onConfirm={() => handleEliminar(matricula)}
                          />
                        )}
                      </div>
                    </TableCell>
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

          {!!data?.totalPages && data.totalPages > 1 && (
            <TablaPaginacion data={data} onPage={setPage} />
          )}

          <MatriculaFormDialog
            key={editando?.idMatricula ?? "nuevo"}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            matricula={editando}
          />

          {historial && (
            <HistorialDialog
              matricula={historial}
              open={!!historial}
              onOpenChange={(open) => {
                if (!open) setHistorial(null)
              }}
            />
          )}

          <ReporteModal
            open={reporteOpen}
            onOpenChange={setReporteOpen}
            titulo="Reporte de matrícula"
            descripcion="Descarga todas las matrículas del rango en PDF, Excel o CSV."
            presets={["ultimos_7", "este_mes", "personalizado"]}
            filtros={[
              {
                id: "idAnio",
                label: "Año escolar",
                opciones: opcionesAnio,
                valor: filtroAnio,
                onChange: setFiltroAnio,
              },
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

          <AprobarDialog
            open={aprobarOpen}
            onOpenChange={setAprobarOpen}
            matricula={matriculaSel}
            crud={crud}
          />
          <RechazarDialog
            open={rechazarOpen}
            onOpenChange={setRechazarOpen}
            matricula={matriculaSel}
            crud={crud}
          />
          <RegistroPagoDialog
            open={pagoOpen}
            onOpenChange={setPagoOpen}
            matricula={matriculaSel}
            crud={crud}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Modal Aprobar ────────────────────────────────────────────────────────

function AprobarDialog({
  open,
  onOpenChange,
  matricula,
  crud,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  matricula: MatriculaResponse | null
  crud: ReturnType<typeof useCrudMatriculas>
}) {
  const [observaciones, setObservaciones] = useState("")

  async function handleAprobar() {
    if (!matricula) return
    try {
      await crud.aprobar.mutateAsync({
        id: matricula.idMatricula,
        observaciones: observaciones || undefined,
      })
      toast.success("Matrícula aprobada")
      onOpenChange(false)
      setObservaciones("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar matrícula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se aprobará la matrícula de{" "}
            <strong>{matricula?.alumno}</strong>.
          </p>
          <Field>
            <FieldLabel>Observaciones (opcional)</FieldLabel>
            <FieldContent>
              <Input
                placeholder="Motivo de aprobación"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button
              onClick={handleAprobar}
              disabled={crud.aprobar.isPending}
            >
              {crud.aprobar.isPending && <Loader2 className="animate-spin" />}
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Rechazar ───────────────────────────────────────────────────────

function RechazarDialog({
  open,
  onOpenChange,
  matricula,
  crud,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  matricula: MatriculaResponse | null
  crud: ReturnType<typeof useCrudMatriculas>
}) {
  const [observaciones, setObservaciones] = useState("")

  async function handleRechazar() {
    if (!matricula) return
    try {
      await crud.rechazar.mutateAsync({
        id: matricula.idMatricula,
        observaciones: observaciones || undefined,
      })
      toast.success("Matrícula rechazada")
      onOpenChange(false)
      setObservaciones("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar matrícula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se rechazará la matrícula de{" "}
            <strong>{matricula?.alumno}</strong>.
          </p>
          <Field>
            <FieldLabel>Motivo del rechazo</FieldLabel>
            <FieldContent>
              <Input
                placeholder="Indica el motivo del rechazo"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={crud.rechazar.isPending}
            >
              {crud.rechazar.isPending && <Loader2 className="animate-spin" />}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal Registrar Pago ─────────────────────────────────────────────────

function RegistroPagoDialog({
  open,
  onOpenChange,
  matricula,
  crud,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  matricula: MatriculaResponse | null
  crud: ReturnType<typeof useCrudMatriculas>
}) {
  const [fechaPago, setFechaPago] = useState("")
  const [montoPago, setMontoPago] = useState<number | undefined>(undefined)

  async function handleMatricular() {
    if (!matricula || !fechaPago || montoPago === undefined) return
    try {
      await crud.matricular.mutateAsync({
        id: matricula.idMatricula,
        fechaPago,
        montoPago,
      })
      toast.success("Pago registrado y matrícula activada")
      onOpenChange(false)
      setFechaPago("")
      setMontoPago(undefined)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar pago")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registra el pago de la matrícula de{" "}
            <strong>{matricula?.alumno}</strong>.
          </p>
          <Field>
            <FieldLabel>Fecha de pago</FieldLabel>
            <FieldContent>
              <Input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Monto (S/)</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={montoPago ?? ""}
                onChange={(e) =>
                  setMontoPago(
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button
              onClick={handleMatricular}
              disabled={
                crud.matricular.isPending || !fechaPago || montoPago === undefined
              }
            >
              {crud.matricular.isPending && <Loader2 className="animate-spin" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}