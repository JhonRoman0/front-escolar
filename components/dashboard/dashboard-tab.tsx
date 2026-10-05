"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { AsistenciaHoyChart } from "@/components/dashboard/asistencia-hoy-chart"
import { DashboardKpiCards } from "@/components/dashboard/kpi-cards"
import { DistribucionGradoChart } from "@/components/dashboard/distribucion-grado-chart"
import { TendenciaChart } from "@/components/dashboard/tendencia-chart"
import {
  useDistribucionGrado,
  useEstadisticasHoy,
  useTendenciaSemana,
} from "@/hooks/use-dashboard"
import { usePuedeLeer } from "@/hooks/use-permisos"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"
import { generarPdfResumen } from "@/lib/reportes/generar-pdf"

export function DashboardTab() {
  const { usuario } = useAuth()
  const puedeAsistencia = usePuedeLeer("ASISTENCIAS")
  const puedeMatriculas = usePuedeLeer("MATRICULAS")
  const [generandoResumen, setGenerandoResumen] = useState(false)

  const hoy = fechaHoyISO()
  const qAsistencia = useEstadisticasHoy(hoy, puedeAsistencia)
  const qTendencia = useTendenciaSemana(hoy, puedeAsistencia)
  const qDistribucion = useDistribucionGrado(puedeMatriculas)

  const hayWidgets =
    puedeAsistencia || puedeMatriculas

  function descargarResumen() {
    setGenerandoResumen(true)
    try {
      generarPdfResumen({
        fecha: hoy,
        estadisticas: qAsistencia.data,
        tendencia: qTendencia.data,
        distribucion: qDistribucion.data,
      })
      toast.success("Resumen ejecutivo descargado")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el resumen"
      )
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
            Panel de control — {formatearFecha(new Date())}
          </p>
        </div>
        {puedeAsistencia && (
          <Button
            variant="outline"
            size="sm"
            onClick={descargarResumen}
            disabled={generandoResumen}
          >
            {generandoResumen ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileDown />
            )}
            Descargar resumen
          </Button>
        )}
      </div>

      <DashboardKpiCards />

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
                estadisticas={qAsistencia.data}
                cargando={qAsistencia.isLoading}
              />
            )}
            {puedeMatriculas && (
              <DistribucionGradoChart
                datos={qDistribucion.data}
                cargando={qDistribucion.isLoading}
              />
            )}
          </div>
          {puedeAsistencia && (
            <TendenciaChart
              datos={qTendencia.data}
              cargando={qTendencia.isLoading}
            />
          )}
        </>
      )}
    </div>
  )
}
