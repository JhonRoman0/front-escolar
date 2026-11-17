"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

import { FilterSelect } from "@/components/shared/filter-select"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { fechaHoyISO } from "@/lib/fechas"

export type RangoFecha = "hoy" | "semana" | "mes"

const RANGOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
]

// Los estados que se filtran en la vista de hoy (Inasistencia se muestra como Falta).
const ESTADOS = [
  { value: "Puntual", label: "Puntual" },
  { value: "Tardanza", label: "Tardanza" },
  { value: "Justificada", label: "Justificada" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Inasistencia", label: "Falta" },
]

interface AsistenciaToolbarProps {
  anios: { value: string; label: string }[]
  idAnio: number | null
  onIdAnioChange: (value: number) => void

  rango: RangoFecha
  onRangoChange: (value: RangoFecha) => void

  /** Fecha de referencia YYYY-MM-DD (semana/mes la normaliza el back). */
  fecha: string
  onFechaChange: (value: string) => void

  idGradoSeccionFiltro: number | null
  onIdGradoSeccionChange: (value: number | null) => void

  /** Solo en la vista de hoy. */
  filtroEstado: string | null
  onFiltroEstadoChange: (value: string | null) => void

  busqueda: string
  onBusquedaChange: (value: string) => void
}

export function AsistenciaToolbar({
  anios,
  idAnio,
  onIdAnioChange,
  rango,
  onRangoChange,
  fecha,
  onFechaChange,
  idGradoSeccionFiltro,
  onIdGradoSeccionChange,
  filtroEstado,
  onFiltroEstadoChange,
  busqueda,
  onBusquedaChange,
}: AsistenciaToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Año"
          value={idAnio ? String(idAnio) : ""}
          onValueChange={(v) => onIdAnioChange(Number(v))}
          options={anios}
          includeAll={false}
          className="w-[150px]"
        />
        {/* La key reinicia la cascada al cambiar de año: sus grados son de ese año. */}
        <GradoSeccionCascada
          key={idAnio ?? 0}
          compacta
          value={idGradoSeccionFiltro}
          onChange={onIdGradoSeccionChange}
          allowedAnios={idAnio != null ? new Set([idAnio]) : undefined}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Vista"
          value={rango}
          onValueChange={(v) => onRangoChange(v as RangoFecha)}
          options={RANGOS}
          includeAll={false}
          className="w-[150px]"
        />
        {/* El back normaliza: semana → lunes, mes → día 1 */}
        {rango !== "hoy" && (
          <Input
            type="date"
            value={fecha}
            max={fechaHoyISO()}
            onChange={(e) => e.target.value && onFechaChange(e.target.value)}
            className="h-8 w-[160px]"
          />
        )}
        {rango === "hoy" && (
          <FilterSelect
            label="Estado"
            value={filtroEstado ?? ""}
            onValueChange={(v) => onFiltroEstadoChange(v || null)}
            options={ESTADOS}
            className="w-[180px]"
          />
        )}
        <div className="relative ml-auto w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o DNI"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="h-8 pl-9"
          />
        </div>
      </div>
    </div>
  )
}
