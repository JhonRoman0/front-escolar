"use client"

import { useEffect, useMemo, useState } from "react"
import { QrCode, Keyboard, FileDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { TablaPaginacion } from "@/components/shared/paginacion-tabla"

import {
  useAsistenciaMes,
  useAsistenciaSemana,
  useAsistenciasHoy,
  useEliminarAsistencia,
  useEstadisticasAsistencia,
  useEstadosAsistencia,
  useJustificarAsistencia,
} from "@/hooks/use-asistencia"
import { usePuede } from "@/hooks/use-permisos"
import { useGrados } from "@/hooks/use-academico"
import { diasSemana, fechaHoyISO } from "@/lib/fechas"
import type { AsistenciaDiaResponse } from "@/lib/api/asistencia"

import { AsistenciaKpiCards } from "./asistencia-kpi-cards"
import { AsistenciaToolbar, type RangoFecha } from "./asistencia-toolbar"
import { AsistenciaTablaHoy } from "./asistencia-tabla-hoy"
import { AsistenciaTablaSemana } from "./asistencia-tabla-semana"
import { AsistenciaTablaMes } from "./asistencia-tabla-mes"
import { JustificarAsistenciaDialog } from "./justificar-dialog"
import { RegistrarCamaraModal } from "./registrar-camara-modal"
import { RegistrarCodigoModal } from "./registrar-codigo-modal"
import { GenerarReporteModal } from "@/components/reportes/generar-reporte-modal"

const TAMANIO_PAGINA = 10

export function RegistroTab() {
  const puedeCrear = usePuede("ASISTENCIAS", "CREAR")
  const puedeJustificar = usePuede("ASISTENCIAS", "ACTUALIZAR")
  const puedeEliminar = usePuede("ASISTENCIAS", "ELIMINAR")
  const puedeExportar = usePuede("ASISTENCIAS", "IMPRIMIR_EXPORTAR")

  // ── Filtros ──
  const [rango, setRango] = useState<RangoFecha>("hoy")
  const [fecha, setFecha] = useState(fechaHoyISO())
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [idGradoSeccionFiltro, setIdGradoSeccionFiltro] = useState<number | null>(null)
  const [pageHoy, setPageHoy] = useState(0)
  const [pageSemana, setPageSemana] = useState(0)
  const [pageMes, setPageMes] = useState(0)

  // ── Modales de registro / acciones ──
  const [camaraOpen, setCamaraOpen] = useState(false)
  const [codigoOpen, setCodigoOpen] = useState(false)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [justificarTarget, setJustificarTarget] =
    useState<AsistenciaDiaResponse | null>(null)

  // ── Datos ── (ahora todo paginado + filtros server)
  const hoyQuery = useAsistenciasHoy({
    page: pageHoy,
    size: TAMANIO_PAGINA,
    idGradoSeccion: idGradoSeccionFiltro ?? undefined,
    estado: filtroEstado as never,
    search: busqueda || undefined,
  })
  const semanaQuery = useAsistenciaSemana(
    rango === "semana" ? fecha : null,
    pageSemana,
    TAMANIO_PAGINA,
    {
      idGradoSeccion: idGradoSeccionFiltro ?? undefined,
      estado: filtroEstado as never,
      search: busqueda || undefined,
    }
  )
  const mesQuery = useAsistenciaMes(
    rango === "mes" ? fecha : null,
    pageMes,
    TAMANIO_PAGINA,
    {
      idGradoSeccion: idGradoSeccionFiltro ?? undefined,
      estado: filtroEstado as never,
      search: busqueda || undefined,
    }
  )
  const estadisticasQuery = useEstadisticasAsistencia(rango, fecha)
  const estadosQuery = useEstadosAsistencia()
  const justificar = useJustificarAsistencia()
  const eliminar = useEliminarAsistencia()
  const { data: gradosCatalogo = [] } = useGrados()

  const fechasDias = useMemo(() => diasSemana(fecha), [fecha])

  function cambiaRango(nuevo: RangoFecha) {
    setRango(nuevo)
    setPageHoy(0)
    setPageSemana(0)
    setPageMes(0)
  }

  // Reset page cuando cambian filtros server
  useEffect(() => {
    setPageHoy(0)
    setPageSemana(0)
    setPageMes(0)
  }, [idGradoSeccionFiltro, filtroEstado, busqueda])

  // Datos ya filtrados server-side
  const hoyFiltradas = hoyQuery.data?.content ?? []
  const semanaFiltradas = semanaQuery.data?.content ?? []
  const mesFiltradas = mesQuery.data?.content ?? []

  const cargandoTabla =
    (rango === "hoy" && hoyQuery.isLoading) ||
    (rango === "semana" && semanaQuery.isLoading) ||
    (rango === "mes" && mesQuery.isLoading)

  const errorTabla =
    (rango === "hoy" && hoyQuery.isError) ||
    (rango === "semana" && semanaQuery.isError) ||
    (rango === "mes" && mesQuery.isError)

  const refetchTabla =
    rango === "hoy"
      ? hoyQuery.refetch
      : rango === "semana"
        ? semanaQuery.refetch
        : mesQuery.refetch

  async function handleJustificar(idJustificacion: number) {
    if (!justificarTarget?.idAsistencia) return
    try {
      const resultado = await justificar.mutateAsync({
        idAsistencia: justificarTarget.idAsistencia,
        data: { idJustificacion },
      })
      toast.success(
        `${resultado.alumno} ahora figura como ${resultado.estado}`
      )
      setJustificarTarget(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo justificar"
      )
    }
  }

  async function handleEliminar(a: AsistenciaDiaResponse) {
    if (!a.idAsistencia) return
    try {
      await eliminar.mutateAsync(a.idAsistencia)
      toast.success(`Asistencia de ${a.alumno} eliminada`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar"
      )
      throw error
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-end gap-2">
        {puedeExportar && (
          <Button variant="outline" onClick={() => setReporteOpen(true)}>
            <FileDown />
            Generar reporte
          </Button>
        )}
        {puedeCrear && (
          <>
            <Button onClick={() => setCamaraOpen(true)}>
              <QrCode />
              Registrar con cámara
            </Button>
            <Button variant="outline" onClick={() => setCodigoOpen(true)}>
              <Keyboard />
              Registrar por código
            </Button>
          </>
        )}
      </div>

      <AsistenciaKpiCards
        estadisticas={estadisticasQuery.data}
        cargando={estadisticasQuery.isLoading}
      />

      <AsistenciaToolbar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        rango={rango}
        onRangoChange={cambiaRango}
        fecha={fecha}
        onFechaChange={(v) => {
          setFecha(v)
          setPageSemana(0)
          setPageMes(0)
        }}
        idGradoSeccionFiltro={idGradoSeccionFiltro}
        onIdGradoSeccionChange={setIdGradoSeccionFiltro}
        estadosDisponibles={estadosQuery.data ?? []}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={setFiltroEstado}
      />

      {errorTabla && (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p>No se pudo cargar la asistencia.</p>
          <Button variant="outline" size="sm" onClick={() => refetchTabla()}>
            Reintentar
          </Button>
        </div>
      )}

      {rango === "hoy" && (
        <>
          <AsistenciaTablaHoy
            asistencias={hoyFiltradas}
            cargando={cargandoTabla}
            puedeJustificar={puedeJustificar}
            puedeEliminar={puedeEliminar}
            onJustificar={setJustificarTarget}
            onEliminar={handleEliminar}
          />
          <TablaPaginacion data={hoyQuery.data} onPage={setPageHoy} />
        </>
      )}

      {rango === "semana" && (
        <>
          <AsistenciaTablaSemana
            asistencias={semanaFiltradas}
            fechasDias={fechasDias}
            cargando={cargandoTabla}
          />
          <TablaPaginacion data={semanaQuery.data} onPage={setPageSemana} />
        </>
      )}

      {rango === "mes" && (
        <>
          <AsistenciaTablaMes
            asistencias={mesFiltradas}
            cargando={cargandoTabla}
          />
          <TablaPaginacion data={mesQuery.data} onPage={setPageMes} />
        </>
      )}

      <RegistrarCamaraModal open={camaraOpen} onOpenChange={setCamaraOpen} />
      <RegistrarCodigoModal open={codigoOpen} onOpenChange={setCodigoOpen} />
      <GenerarReporteModal open={reporteOpen} onOpenChange={setReporteOpen} />

      {/* key: remonta por alumno → la selección de motivo siempre inicia limpia */}
      <JustificarAsistenciaDialog
        key={justificarTarget?.idAlumno ?? "ninguno"}
        target={justificarTarget}
        open={!!justificarTarget}
        onOpenChange={(open) => {
          if (!open) setJustificarTarget(null)
        }}
        onConfirm={handleJustificar}
        registrando={justificar.isPending}
      />
    </div>
  )
}
