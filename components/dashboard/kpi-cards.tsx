import type { LucideIcon } from "lucide-react"
import {
  CalendarRange,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
  UserSquare2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  estadoAnioTexto,
  type AnioEscolarResponse,
} from "@/lib/api/academico"
import type { EstadisticasResponse } from "@/lib/api/asistencia"
import type { EstadoDato } from "@/lib/api/dashboard"
import { formatearFecha } from "@/lib/fechas"

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
const GRIS = {
  bg: "bg-muted",
  valor: "text-muted-foreground",
  icono: "text-muted-foreground",
}

type Paleta = typeof AZUL

const ESTADO_TITULO: Record<Exclude<EstadoDato, "listo">, string> = {
  cargando: "Cargando…",
  error: "No se pudo cargar",
  "sin-anio": "Año escolar no resuelto",
  "sin-datos": "Sin datos",
}

interface KpiItem {
  label: string
  valor: string
  subtitulo: string
  icono: LucideIcon
  paleta: Paleta
  estado: EstadoDato
}

interface EstadosKpi {
  alumnos: EstadoDato
  docentes: EstadoDato
  usuarios: EstadoDato
  matriculas: EstadoDato
  asistencia: EstadoDato
}

interface DashboardKpiCardsProps {
  fechaHoy: string
  anioSeleccionado: AnioEscolarResponse | null
  puedeAlumnos: boolean
  puedeDocentes: boolean
  puedeUsuarios: boolean
  puedeMatriculas: boolean
  puedeVerAnio: boolean
  puedeAsistencia: boolean
  alumnos?: number
  docentes?: number
  usuarios?: number
  matriculas?: number
  estadisticas?: EstadisticasResponse
  estados: EstadosKpi
}

function valorPorEstado(valor: string | number | undefined, estado: EstadoDato) {
  if (estado === "cargando") return "…"
  if (estado !== "listo" || valor === undefined) return "—"
  return String(valor)
}

export function DashboardKpiCards({
  fechaHoy,
  anioSeleccionado,
  puedeAlumnos,
  puedeDocentes,
  puedeUsuarios,
  puedeMatriculas,
  puedeVerAnio,
  puedeAsistencia,
  alumnos,
  docentes,
  usuarios,
  matriculas,
  estadisticas,
  estados,
}: DashboardKpiCardsProps) {
  const anio = anioSeleccionado?.anio
  const anioReferencia = anio ? `en ${anio}` : "en el año seleccionado"
  const asistenciaLista =
    estados.asistencia === "listo" &&
    estadisticas !== undefined &&
    estadisticas.totalEsperado > 0
  const porcentajeAsistencia =
    asistenciaLista && estadisticas ? estadisticas.porcentajeAsistencia : null
  const paletaAsistencia: Paleta =
    porcentajeAsistencia === null
      ? GRIS
      : porcentajeAsistencia < 75
        ? ROJO
        : porcentajeAsistencia >= 90
          ? VERDE
          : NARANJA

  const items: KpiItem[] = []

  if (puedeAlumnos) {
    items.push({
      label: "Alumnos",
      valor: valorPorEstado(alumnos, estados.alumnos),
      subtitulo: `matriculados ${anioReferencia}`,
      icono: Users,
      paleta: AZUL,
      estado: estados.alumnos,
    })
  }

  if (puedeDocentes) {
    items.push({
      label: "Docentes",
      valor: valorPorEstado(docentes, estados.docentes),
      subtitulo: "en planilla",
      icono: GraduationCap,
      paleta: AZUL,
      estado: estados.docentes,
    })
  }

  if (puedeUsuarios) {
    items.push({
      label: "Usuarios",
      valor: valorPorEstado(usuarios, estados.usuarios),
      subtitulo: "con acceso al sistema",
      icono: UserSquare2,
      paleta: AZUL,
      estado: estados.usuarios,
    })
  }

  if (puedeMatriculas) {
    items.push({
      label: "Matrículas",
      valor: valorPorEstado(matriculas, estados.matriculas),
      subtitulo: `activas ${anioReferencia}`,
      icono: ClipboardList,
      paleta: AZUL,
      estado: estados.matriculas,
    })
  }

  if (puedeVerAnio && anioSeleccionado) {
    items.push({
      label: "Año escolar",
      valor: anioSeleccionado.anio,
      subtitulo: estadoAnioTexto(anioSeleccionado.estado),
      icono: CalendarRange,
      paleta: NARANJA,
      estado: "listo",
    })
  }

  if (puedeAsistencia) {
    items.push({
      label: "Asistencia hoy",
      valor: valorPorEstado(
        porcentajeAsistencia === null ? undefined : `${porcentajeAsistencia}%`,
        estados.asistencia,
      ),
      subtitulo: formatearFecha(fechaHoy),
      icono: TrendingUp,
      paleta: paletaAsistencia,
      estado: estados.asistencia,
    })
  }

  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
      {items.map((kpi) => {
        const Icono = kpi.icono
        return (
          <div
            key={kpi.label}
            className={cn(
              "flex items-start justify-between rounded-xl border p-4",
              kpi.paleta.bg,
            )}
          >
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-2xl font-bold sm:text-3xl",
                  kpi.paleta.valor,
                )}
                title={kpi.estado === "listo" ? undefined : ESTADO_TITULO[kpi.estado]}
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
