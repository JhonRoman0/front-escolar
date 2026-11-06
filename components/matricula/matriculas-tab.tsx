"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown, History, Pencil, Plus, Receipt } from "lucide-react"

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
import { FilterSelect } from "@/components/shared/filter-select"
import { ACCESO, anioParaFiltro, estadoAnioTexto, OPCIONES_ESTADO_ACCESO } from "@/lib/api/academico"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useCrudMatriculas, useMatriculas } from "@/hooks/use-matricula"
import { usePuede } from "@/hooks/use-permisos"
import { useAniosEscolares } from "@/hooks/use-academico"
import { ANIO_POR_COMENZAR, type MatriculaResponse } from "@/lib/api/matricula"
import { reportesApi } from "@/lib/api/reportes"
import { descargarTabla, tablaMatriculas, type FormatoReporte } from "@/lib/reportes/tablas"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { useFiltrosAcademicos } from "@/components/reportes/use-filtros-academicos"
import { formatoSoles } from "./campos-pago"
import { EditarMatriculaDialog } from "./editar-matricula-dialog"
import { BotonFicha } from "./boton-ficha"
import { HistorialDialog } from "./historial-dialog"
import { NuevaMatriculaDialog } from "./nueva-matricula-dialog"
import { PagosDialog } from "./pagos-dialog"

const TAMANIO_PAGINA = 10

export function MatriculasTab() {
  const [page, setPage] = useState(0)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const { data: aniosEscolares = [], isLoading: cargandoAnios } = useAniosEscolares()
  const idAnio = idAnioElegido ?? anioParaFiltro(aniosEscolares)?.idAnio
  const { data, isLoading: cargandoMatriculas, isError, refetch } = useMatriculas(
    page,
    TAMANIO_PAGINA,
    filtroEstado ? Number(filtroEstado) : undefined,
    idAnio,
    idAnio != null
  )
  const isLoading = cargandoAnios || cargandoMatriculas
  const crud = useCrudMatriculas()
  const puedeCrear = usePuede("MATRICULAS", "CREAR")
  const puedeActualizar = usePuede("MATRICULAS", "ACTUALIZAR")
  const puedeEliminar = usePuede("MATRICULAS", "ELIMINAR")
  const puedeExportar = usePuede("MATRICULAS", "IMPRIMIR_EXPORTAR")
  const puedeImprimirFicha = usePuede("MATRICULAS", "IMPRIMIR_FICHA")

  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [editando, setEditando] = useState<MatriculaResponse | null>(null)
  const [pagos, setPagos] = useState<MatriculaResponse | null>(null)
  const [historial, setHistorial] = useState<MatriculaResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const filtrosReporte = useFiltrosAcademicos()
  const [reporteEstado, setReporteEstado] = useState("")

  async function handleDescargarReporte(
    formato: FormatoReporte,
    inicio: string,
    fin: string,
    filtros: Record<string, string>,
    contexto: { colegio: string; filtros: string[] }
  ) {
    const datos = await reportesApi.matriculas(inicio, fin, filtros)
    if (datos.length === 0) {
      toast.warning("No hay matrículas en el rango y filtros seleccionados")
      return
    }
    descargarTabla(formato, tablaMatriculas(datos, { inicio, fin, ...contexto }))
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  const visibles = data?.content ?? []

  function cambiarEstadoFiltro(value: string) {
    setFiltroEstado(value)
    setPage(0)
  }

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
            <div className="flex max-w-full flex-wrap items-center gap-3">
              <FilterSelect
                value={idAnio ? String(idAnio) : ""}
                onValueChange={(valor) => {
                  setIdAnioElegido(Number(valor))
                  setPage(0)
                }}
                options={[...aniosEscolares]
                  .sort((a, b) => b.anio.localeCompare(a.anio))
                  .map((a) => ({ value: String(a.idAnio), label: `${a.anio} · ${estadoAnioTexto(a.estado)}` }))}
                includeAll={false}
                className="w-[180px] max-w-full shrink-0"
              />
              <FilterSelect
                value={filtroEstado}
                onValueChange={cambiarEstadoFiltro}
                options={OPCIONES_ESTADO_ACCESO}
                allLabel="Todos los estados"
                className="w-[180px] max-w-full shrink-0"
              />
              {puedeExportar && (
                <Button variant="outline" size="sm" className="h-8 rounded-[8px] border-[#A9A9AA] text-[12px]" onClick={() => {
                    filtrosReporte.iniciar({ idAnio: idAnio ?? null })
                    setReporteEstado(filtroEstado)
                    setReporteOpen(true)
                  }}>
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
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Apoderado</TableHead>
                <TableHead>Grado - Sección</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-center">Año</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
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
                    filtroEstado
                      ? filtroEstado === String(ACCESO.ACTIVO)
                        ? "No hay matrículas activas para mostrar."
                        : "No hay matrículas inactivas para mostrar."
                      : "Aún no hay matrículas."
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
                    <TableCell className="text-center">{matricula.anio}</TableCell>
                    <TableCell className="text-right text-xs">
                      <div className="space-y-0.5">
                        <p>{formatoSoles(matricula.pagadoNeto)}</p>
                        <p className="text-muted-foreground">{matricula.metodoPago ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">
                      {matricula.observaciones || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <EstadoBadge accesoId={matricula.accesoId} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
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
                        {puedeImprimirFicha && (
                          <BotonFicha idMatricula={matricula.idMatricula} alumno={matricula.alumno} />
                        )}
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

          <NuevaMatriculaDialog
            open={nuevaOpen}
            onOpenChange={setNuevaOpen}
            onCreada={(matricula) => {
              // Muestra la matrícula recién creada aunque sea de otro año o estado.
              setIdAnioElegido(matricula.idAnio)
              setFiltroEstado("")
              setPage(0)
            }}
          />
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
            descripcion="Descarga las matrículas del año en PDF, Excel o CSV."
            presets={["todo", "ultimos_7", "este_mes", "personalizado"]}
          etiquetaTodo="Todo el año escolar"
            filtros={[
              ...filtrosReporte.filtros,
              {
                id: "idAcceso",
                label: "Estado",
                opciones: [
                  { value: "1", label: "Activa" },
                  { value: "3", label: "Inactiva" },
                ],
                valor: reporteEstado,
                onChange: setReporteEstado,
              },
            ]}
            onDescargar={handleDescargarReporte}
          />

        </CardContent>
      </Card>
    </div>
  )
}
