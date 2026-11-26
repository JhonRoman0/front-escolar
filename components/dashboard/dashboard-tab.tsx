"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AsistenciaHoyChart } from "@/components/dashboard/asistencia-hoy-chart"
import { DashboardKpiCards } from "@/components/dashboard/kpi-cards"
import { DistribucionGradoChart } from "@/components/dashboard/distribucion-grado-chart"
import { TendenciaChart } from "@/components/dashboard/tendencia-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FilterSelect } from "@/components/shared/filter-select"
import {
  useDistribucionGrado,
  useEstadisticasHoy,
  useKpiAlumnos,
  useKpiDocentes,
  useKpiMatriculas,
  useKpiUsuarios,
  useTendenciaSemana,
} from "@/hooks/use-dashboard"
import { useAniosEscolares } from "@/hooks/use-academico"
import { useIdentidadInstitucional } from "@/hooks/use-colegio"
import { ACCESO, anioParaFiltro } from "@/lib/api/academico"
import type { EstadoDato } from "@/lib/api/dashboard"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"
import { NOMBRE_SISTEMA } from "@/lib/navegacion"
import { generarPdfResumen } from "@/lib/reportes/generar-pdf"
import { usePuedeLeer } from "@/hooks/use-permisos"

interface ConsultaBasica<T> {
  data: T | undefined
  isLoading: boolean
  isError: boolean
}

function estadoConsulta<T>(
  consulta: ConsultaBasica<T>,
  anual: boolean,
  anioResuelto: boolean,
  sinDatos?: (data: T) => boolean,
): EstadoDato {
  if (anual && !anioResuelto) return "sin-anio"
  if (consulta.isError) return "error"
  if (consulta.isLoading) return "cargando"
  if (consulta.data === undefined) return "sin-datos"
  if (sinDatos?.(consulta.data)) return "sin-datos"
  return "listo"
}

export function DashboardTab() {
  const { usuario } = useAuth()
  const [generandoResumen, setGenerandoResumen] = useState(false)
  const [idAnioSeleccionado, setIdAnioSeleccionado] = useState<number | null>(null)

  const puedeAlumnos = usePuedeLeer("ALUMNOS")
  const puedeDocentes = usePuedeLeer("DOCENTES")
  const puedeUsuarios = usePuedeLeer("USUARIOS")
  const puedeMatriculas = usePuedeLeer("MATRICULAS")
  const puedeAsistencia = usePuedeLeer("ASISTENCIAS")
  const puedeAnios = usePuedeLeer("ANIOS_ESCOLARES")
  const puedeVerAnio = puedeAnios || puedeAlumnos || puedeMatriculas || puedeAsistencia

  const identidad = useIdentidadInstitucional()
  const hayWidgets = puedeAsistencia || puedeMatriculas
  const hoy = fechaHoyISO()

  const consultaAnios = useAniosEscolares(puedeVerAnio)
  const anios = consultaAnios.data ?? []
  const aniosVisibles = anios.filter((anio) => anio.accesoId !== ACCESO.ELIMINADO)
  const anioPorDefecto = anioParaFiltro(aniosVisibles)
  const anioElegido = aniosVisibles.find((anio) => anio.idAnio === idAnioSeleccionado)
  const anioSeleccionado = anioElegido ?? anioPorDefecto ?? null
  const idAnio = anioSeleccionado?.idAnio ?? null
  const anioResuelto = idAnio !== null

  const consultaAlumnos = useKpiAlumnos(idAnio, puedeAlumnos)
  const consultaDocentes = useKpiDocentes(puedeDocentes)
  const consultaUsuarios = useKpiUsuarios(puedeUsuarios)
  const consultaMatriculas = useKpiMatriculas(idAnio, puedeMatriculas)
  const consultaAsistencia = useEstadisticasHoy(hoy, idAnio, puedeAsistencia)
  const consultaTendencia = useTendenciaSemana(hoy, idAnio, puedeAsistencia)
  const consultaDistribucion = useDistribucionGrado(idAnio, puedeMatriculas)

  const estados = {
    alumnos: estadoConsulta(consultaAlumnos, true, anioResuelto),
    docentes: estadoConsulta(consultaDocentes, false, anioResuelto),
    usuarios: estadoConsulta(consultaUsuarios, false, anioResuelto),
    matriculas: estadoConsulta(consultaMatriculas, true, anioResuelto),
    asistencia: estadoConsulta(
      consultaAsistencia,
      true,
      anioResuelto,
      (datos) => datos.totalEsperado === 0,
    ),
    tendencia: estadoConsulta(
      consultaTendencia,
      true,
      anioResuelto,
      (datos) => datos.length === 0 || !datos.some((dia) => dia.porcentaje !== null),
    ),
    distribucion: estadoConsulta(
      consultaDistribucion,
      true,
      anioResuelto,
      (datos) => datos.length === 0,
    ),
  }

  const opcionesAnios = [...aniosVisibles]
    .sort((a, b) => b.anio.localeCompare(a.anio, "es"))
    .map((anio) => ({ value: String(anio.idAnio), label: anio.anio }))

  const consultasResumen = [consultaAsistencia, consultaTendencia, consultaDistribucion]
  const resumenCargando =
    consultaAnios.isLoading ||
    consultaAnios.isFetching ||
    consultasResumen.some((consulta) => consulta.isLoading || consulta.isFetching)
  const resumenConErrores =
    consultaAnios.isError || consultasResumen.some((consulta) => consulta.isError)
  const puedeDescargarResumen =
    puedeAsistencia &&
    anioResuelto &&
    !resumenCargando &&
    !resumenConErrores &&
    !generandoResumen

  function handleDescargarResumen() {
    if (!puedeDescargarResumen) return
    setGenerandoResumen(true)
    try {
      generarPdfResumen({
        fecha: hoy,
        anioEscolar: anioSeleccionado?.anio,
        estadisticas: puedeAsistencia ? consultaAsistencia.data : undefined,
        tendencia: puedeAsistencia ? consultaTendencia.data : undefined,
        distribucion: puedeMatriculas ? consultaDistribucion.data : undefined,
        nombreColegio: identidad.data?.nombre?.trim() || NOMBRE_SISTEMA,
      })
      toast.success("Resumen PDF generado")
    } catch {
      toast.error("No se pudo generar el resumen PDF")
    } finally {
      setGenerandoResumen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            Hola, {usuario?.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel de control — {formatearFecha(hoy)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeVerAnio && opcionesAnios.length > 0 && (
            <FilterSelect
              label="Año escolar"
              value={String(idAnio)}
              onValueChange={(valor) => setIdAnioSeleccionado(Number(valor))}
              options={opcionesAnios}
              includeAll={false}
              className="w-[190px] max-w-full shrink-0"
            />
          )}
          {puedeAsistencia && (
            <span
              className="inline-flex"
              title={
                puedeDescargarResumen
                  ? "Descargar resumen en PDF"
                  : "Espere a que los datos del año seleccionado estén listos"
              }
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleDescargarResumen}
                disabled={!puedeDescargarResumen}
              >
                {generandoResumen ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FileDown />
                )}
                Descargar resumen
              </Button>
            </span>
          )}
        </div>
      </div>

      <DashboardKpiCards
        fechaHoy={hoy}
        anioSeleccionado={anioSeleccionado}
        puedeAlumnos={puedeAlumnos}
        puedeDocentes={puedeDocentes}
        puedeUsuarios={puedeUsuarios}
        puedeMatriculas={puedeMatriculas}
        puedeVerAnio={puedeVerAnio}
        puedeAsistencia={puedeAsistencia}
        alumnos={consultaAlumnos.data}
        docentes={consultaDocentes.data}
        usuarios={consultaUsuarios.data}
        matriculas={consultaMatriculas.data}
        estadisticas={consultaAsistencia.data}
        estados={estados}
      />

      {!hayWidgets ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tienes módulos asignados. Contacta a un administrador.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {puedeAsistencia && (
              <AsistenciaHoyChart
                estadisticas={consultaAsistencia.data}
                estado={estados.asistencia}
              />
            )}
            {puedeMatriculas && (
              <DistribucionGradoChart
                datos={consultaDistribucion.data}
                estado={estados.distribucion}
              />
            )}
          </div>
          {puedeAsistencia && (
            <TendenciaChart datos={consultaTendencia.data} estado={estados.tendencia} />
          )}
        </>
      )}
    </div>
  )
}
