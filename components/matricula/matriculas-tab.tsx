"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { FileDown, History, Pencil, Plus, Receipt } from "lucide-react"

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
import { ANIO_POR_COMENZAR, type MatriculaResponse } from "@/lib/api/matricula"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfMatriculas } from "@/lib/reportes/generar-pdf"
import { generarExcelMatriculas } from "@/lib/reportes/generar-excel"
import { generarCsvMatriculas } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { formatoSoles } from "./campos-pago"
import { EditarMatriculaDialog } from "./editar-matricula-dialog"
import { HistorialDialog } from "./historial-dialog"
import { NuevaMatriculaDialog } from "./nueva-matricula-dialog"
import { PagosDialog } from "./pagos-dialog"

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
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [editando, setEditando] = useState<MatriculaResponse | null>(null)
  const [pagos, setPagos] = useState<MatriculaResponse | null>(null)
  const [historial, setHistorial] = useState<MatriculaResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroAnio, setFiltroAnio] = useState("")
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)

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
    <div className="flex flex-col gap-4">
      <Card className="rounded-[20px] border-[0.80px] border-[#D9DBE9]">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-[20px] font-semibold tracking-tight">Matrículas</h2>
              <p className="text-[14px] leading-5 text-muted-foreground">Alumnos matriculados por año escolar y sección.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={mostrarInactivas} onCheckedChange={setMostrarInactivas} />
                Ver inactivas
              </label>
              {puedeExportar && (
                <Button variant="outline" size="sm" className="h-8 rounded-[8px] border-[#A9A9AA] text-[12px]" onClick={() => setReporteOpen(true)}>
                  <FileDown data-icon="inline-start" />
                  Generar reporte
                </Button>
              )}
              {puedeCrear && (
                <Button
                  variant="brand"
                  className="rounded-[8px] text-[12px] font-semibold"
                  onClick={() => setNuevaOpen(true)}
                >
                  <Plus data-icon="inline-start" />
                  Nueva matrícula
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-[8px] border border-[#D9DBE9]">
            <Table>
            <TableHeader>
              <TableRow className="bg-[#F8F9FA] hover:bg-[#F8F9FA]">
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Alumno</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Apoderado</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Grado - Sección</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Turno</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Año</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Pago</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Observaciones</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Estado</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[12px] font-semibold text-[#495057]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={9} />
              ) : isError ? (
                <MensajeSinDatos columnas={9} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos
                  columnas={9}
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
                      <p>{matricula.grado} {matricula.seccion}</p>
                      <p className="text-xs text-muted-foreground">{matricula.nivel}</p>
                    </TableCell>
                    <TableCell>{matricula.turno}</TableCell>
                    <TableCell>{matricula.anio}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <p>{formatoSoles(matricula.pagadoNeto)}</p>
                        <p className="text-muted-foreground">{matricula.metodoPago ?? "—"}</p>
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
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Pagos de ${matricula.alumno}`}
                          onClick={() => setPagos(matricula)}
                        >
                          <Receipt />
                        </Button>
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar matrícula de ${matricula.alumno}`}
                            onClick={() => setEditando(matricula)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && matricula.estadoAnio === ANIO_POR_COMENZAR && (
                          <ConfirmarEliminar
                            titulo="Eliminar matrícula"
                            descripcion={`Se eliminará la matrícula de "${matricula.alumno}" y se liberará su cupo. Si era su primera matrícula, también se quitan el alumno y los apoderados sin otros hijos. El pago no se devuelve.`}
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
          </div>

          {isError && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          )}

          {!!data?.totalPages && data.totalPages > 1 && <TablaPaginacion data={data} onPage={setPage} />}

          <NuevaMatriculaDialog open={nuevaOpen} onOpenChange={setNuevaOpen} />
          <EditarMatriculaDialog
            matricula={editando}
            open={!!editando}
            onOpenChange={(open) => {
              if (!open) setEditando(null)
            }}
          />
          <PagosDialog
            matricula={pagos}
            onOpenChange={(open) => {
              if (!open) setPagos(null)
            }}
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

        </CardContent>
      </Card>
    </div>
  )
}
