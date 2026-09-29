"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { fechaHoyISO } from "@/lib/fechas"

export type RangoFecha = "hoy" | "semana" | "mes"

const LABELS: Record<RangoFecha, string> = {
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Este mes",
}

const TODOS = "__todos__"

interface AsistenciaToolbarProps {
  busqueda: string
  onBusquedaChange: (value: string) => void

  rango: RangoFecha
  onRangoChange: (value: RangoFecha) => void

  /** Fecha de referencia YYYY-MM-DD (semana/mes la normaliza el back). */
  fecha: string
  onFechaChange: (value: string) => void

  idGradoSeccionFiltro: number | null
  onIdGradoSeccionChange: (value: number | null) => void

  estadosDisponibles: { idEstado: number; nombre: string }[]

  filtroEstado: string | null
  onFiltroEstadoChange: (value: string | null) => void
}

export function AsistenciaToolbar({
  busqueda,
  onBusquedaChange,
  rango,
  onRangoChange,
  fecha,
  onFechaChange,
  idGradoSeccionFiltro,
  onIdGradoSeccionChange,
  estadosDisponibles,
  filtroEstado,
  onFiltroEstadoChange,
}: AsistenciaToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* FILA 1: rango + fecha + buscador */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={rango}
            onValueChange={(v) => onRangoChange(v as RangoFecha)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue>{LABELS[rango]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
            </SelectContent>
          </Select>

          {/* El back normaliza: semana → lunes, mes → día 1 */}
          {rango !== "hoy" && (
            <Input
              type="date"
              value={fecha}
              max={fechaHoyISO()}
              onChange={(e) => e.target.value && onFechaChange(e.target.value)}
              className="w-full sm:w-40"
            />
          )}
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* FILA 2: filtros cascada + estado — ahora para hoy/semana/mes (vacío hasta que llegue para admin) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[320px]">
          <GradoSeccionCascada value={idGradoSeccionFiltro} onChange={onIdGradoSeccionChange} />
        </div>
        {/* Estado */}
        <Select
          value={filtroEstado ?? TODOS}
          onValueChange={(value) => onFiltroEstadoChange(value === TODOS ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado">{filtroEstado ?? "Todos los estados"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {estadosDisponibles.map((e) => (
              <SelectItem key={e.idEstado} value={e.nombre}>
                {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
