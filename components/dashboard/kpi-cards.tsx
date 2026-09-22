"use client"

import {
  CalendarRange,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
  UserSquare2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  useAnioEscolarActivo,
  useEstadisticasHoy,
  useKpiAlumnos,
  useKpiDocentes,
  useKpiMatriculas,
  useKpiUsuarios,
} from "@/hooks/use-dashboard"
import { usePuedeLeer } from "@/hooks/use-permisos"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"

// Paleta de tarjetas (claro/oscuro), mismo estilo que las KPI de asistencia.
const AZUL = {
  bg: "bg-blue-50 dark:bg-blue-950/40",
  valor: "text-blue-700 dark:text-blue-300",
  icono: "text-blue-600 dark:text-blue-400",
}
const NARANJA = {
  bg: "bg-orange-50 dark:bg-orange-950/40",
  valor: "text-orange-700 dark:text-orange-300",
  icono: "text-orange-600 dark:text-orange-400",
}
const VERDE = {
  bg: "bg-emerald-50 dark:bg-emerald-950/40",
  valor: "text-emerald-700 dark:text-emerald-300",
  icono: "text-emerald-600 dark:text-emerald-400",
}
const ROJO = {
  bg: "bg-rose-50 dark:bg-rose-950/40",
  valor: "text-rose-700 dark:text-rose-300",
  icono: "text-rose-600 dark:text-rose-400",
}

interface KpiItem {
  label: string
  valor: string | number
  subtitulo: string
  icono: LucideIcon
  paleta: typeof AZUL
}

export function DashboardKpiCards() {
  const puedeAlumnos = usePuedeLeer("ALUMNOS")
  const puedeDocentes = usePuedeLeer("DOCENTES")
  const puedeUsuarios = usePuedeLeer("USUARIOS")
  const puedeMatriculas = usePuedeLeer("MATRICULAS")
  const puedeAnios = usePuedeLeer("ANIOS_ESCOLARES")
  const puedeAsistencia = usePuedeLeer("ASISTENCIAS")

  const qAlumnos = useKpiAlumnos(puedeAlumnos)
  const qDocentes = useKpiDocentes(puedeDocentes)
  const qUsuarios = useKpiUsuarios(puedeUsuarios)
  const qMatriculas = useKpiMatriculas(puedeMatriculas)
  const qAnio = useAnioEscolarActivo(puedeAnios)
  const qAsistencia = useEstadisticasHoy(fechaHoyISO(), puedeAsistencia)

  const items: KpiItem[] = []

  if (puedeAlumnos) {
    items.push({
      label: "Alumnos",
      valor: qAlumnos.isLoading ? "…" : (qAlumnos.data ?? "—"),
      subtitulo: "registrados en el sistema",
      icono: Users,
      paleta: AZUL,
    })
  }
  if (puedeDocentes) {
    items.push({
      label: "Docentes",
      valor: qDocentes.isLoading ? "…" : (qDocentes.data ?? "—"),
      subtitulo: "en planilla",
      icono: GraduationCap,
      paleta: AZUL,
    })
  }
  if (puedeUsuarios) {
    items.push({
      label: "Usuarios",
      valor: qUsuarios.isLoading ? "…" : (qUsuarios.data ?? "—"),
      subtitulo: "con acceso al sistema",
      icono: UserSquare2,
      paleta: AZUL,
    })
  }
  if (puedeMatriculas) {
    items.push({
      label: "Matrículas",
      valor: qMatriculas.isLoading ? "…" : (qMatriculas.data ?? "—"),
      subtitulo: "gestionadas",
      icono: ClipboardList,
      paleta: AZUL,
    })
  }
  if (puedeAnios) {
    items.push({
      label: "Año escolar",
      valor: qAnio.isLoading ? "…" : (qAnio.data?.anio ?? "—"),
      subtitulo: qAnio.data ? "activo actualmente" : "ninguno activo",
      icono: CalendarRange,
      paleta: NARANJA,
    })
  }

  // % de asistencia de hoy con semáforo según umbral.
  if (puedeAsistencia) {
    const pct = qAsistencia.data?.porcentajeAsistencia
    const paleta =
      pct == null || pct < 75 ? ROJO : pct >= 90 ? VERDE : NARANJA

    items.push({
      label: "Asistencia hoy",
      valor: qAsistencia.isLoading ? "…" : (pct != null ? `${pct}%` : "—"),
      subtitulo: formatearFecha(new Date()),
      icono: TrendingUp,
      paleta,
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
      {items.map((kpi) => {
        const Icono = kpi.icono
        return (
          <div
            key={kpi.label}
            className={cn(
              "flex items-start justify-between rounded-xl border p-4",
              kpi.paleta.bg
            )}
          >
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-2xl font-bold sm:text-3xl",
                  kpi.paleta.valor
                )}
              >
                {kpi.valor}
              </span>
              <span className={cn("text-sm font-medium", kpi.paleta.valor)}>
                {kpi.label}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {kpi.subtitulo}
              </span>
            </div>
            <Icono className={cn("h-5 w-5 shrink-0", kpi.paleta.icono)} />
          </div>
        )
      })}
    </div>
  )
}
