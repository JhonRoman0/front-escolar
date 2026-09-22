"use client"

import { UserCheck, UserMinus, UserRoundCog, UserX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EstadisticasResponse } from "@/lib/api/asistencia"

interface AsistenciaKpiCardsProps {
  estadisticas?: EstadisticasResponse
  cargando?: boolean
}

function porcentaje(valor: number, total: number): string {
  if (!total) return "sin datos"
  return `${((valor / total) * 100).toFixed(1)}%`
}

export function AsistenciaKpiCards({
  estadisticas,
  cargando,
}: AsistenciaKpiCardsProps) {
  const total = estadisticas?.totalEsperado ?? 0
  const subtitulo = (valor: number) =>
    total > 0 ? `${porcentaje(valor, total)} del total` : "sin datos"

  const kpis = [
    {
      label: "Puntuales",
      valor: estadisticas?.presentes ?? 0,
      icono: UserCheck,
      colorBg: "bg-emerald-50 dark:bg-emerald-950/40",
      colorText: "text-emerald-700 dark:text-emerald-300",
      colorAccent: "text-emerald-600 dark:text-emerald-400",
      subtitulo: total > 0 ? `de ${total}` : "sin datos",
    },
    {
      label: "Tardanzas",
      valor: estadisticas?.tardanzas ?? 0,
      icono: UserMinus,
      colorBg: "bg-amber-50 dark:bg-amber-950/40",
      colorText: "text-amber-700 dark:text-amber-300",
      colorAccent: "text-amber-600 dark:text-amber-400",
      subtitulo: subtitulo(estadisticas?.tardanzas ?? 0),
    },
    {
      label: "Inasistencias",
      valor: estadisticas?.inasistencias ?? 0,
      icono: UserX,
      colorBg: "bg-rose-50 dark:bg-rose-950/40",
      colorText: "text-rose-700 dark:text-rose-300",
      colorAccent: "text-rose-600 dark:text-rose-400",
      subtitulo: subtitulo(estadisticas?.inasistencias ?? 0),
    },
    {
      label: "Justificadas",
      valor: estadisticas?.justificados ?? 0,
      icono: UserRoundCog,
      colorBg: "bg-violet-50 dark:bg-violet-950/40",
      colorText: "text-violet-700 dark:text-violet-300",
      colorAccent: "text-violet-600 dark:text-violet-400",
      subtitulo: subtitulo(estadisticas?.justificados ?? 0),
    },
  ]

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {kpis.map((kpi) => {
          const Icono = kpi.icono
          return (
            <div
              key={kpi.label}
              className={cn(
                "flex items-start justify-between rounded-xl border p-4",
                kpi.colorBg
              )}
            >
              <div className="flex flex-col">
                <span
                  className={cn("text-2xl font-bold sm:text-3xl", kpi.colorText)}
                >
                  {cargando ? "..." : kpi.valor}
                </span>
                <span className={cn("text-sm font-medium", kpi.colorText)}>
                  {kpi.label}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {kpi.subtitulo}
                </span>
              </div>
              <Icono className={cn("h-5 w-5 shrink-0", kpi.colorAccent)} />
            </div>
          )
        })}
      </div>
      {!cargando && estadisticas && (
        <p className="text-sm text-muted-foreground">
          Asistencia general:{" "}
          <span className="font-semibold text-foreground">
            {estadisticas.porcentajeAsistencia}%
          </span>{" "}
          ({estadisticas.totalEsperado} registros esperados)
        </p>
      )}
    </div>
  )
}
