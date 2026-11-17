"use client"

import { Input } from "@/components/ui/input"

import { BotonLimpiarFiltros } from "@/components/shared/boton-limpiar-filtros"
import { BuscadorTabla } from "@/components/shared/buscador-tabla"
import { FilterSelect } from "@/components/shared/filter-select"
import { useGradosPorNivel, useNiveles, useSeccionesPorGrado, useTurnos } from "@/hooks/use-academico"
import { fechaHoyISO } from "@/lib/fechas"

export type RangoFecha = "hoy" | "semana" | "mes"

/** Dónde buscar: cada nivel ya filtra, sin tener que llegar a la sección. */
export interface UbicacionFiltro {
  idNivel: number | null
  idGrado: number | null
  idGradoSeccion: number | null
}

export const SIN_UBICACION: UbicacionFiltro = { idNivel: null, idGrado: null, idGradoSeccion: null }

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

  ubicacion: UbicacionFiltro
  onUbicacionChange: (value: UbicacionFiltro) => void

  /** null: todos. En la vista de hoy empieza en el turno en curso. */
  idTurno: number | null
  onIdTurnoChange: (value: number | null) => void

  rango: RangoFecha
  onRangoChange: (value: RangoFecha) => void

  /** Fecha de referencia YYYY-MM-DD (semana/mes la normaliza el back). */
  fecha: string
  onFechaChange: (value: string) => void

  /** Solo en la vista de hoy. */
  filtroEstado: string | null
  onFiltroEstadoChange: (value: string | null) => void

  busqueda: string
  onBusquedaChange: (value: string) => void

  /** Hay algo distinto de lo inicial: se muestra "Limpiar filtros". */
  hayFiltros: boolean
  onLimpiar: () => void
}

export function AsistenciaToolbar({
  anios,
  idAnio,
  onIdAnioChange,
  ubicacion,
  onUbicacionChange,
  idTurno,
  onIdTurnoChange,
  rango,
  onRangoChange,
  fecha,
  onFechaChange,
  filtroEstado,
  onFiltroEstadoChange,
  busqueda,
  onBusquedaChange,
  hayFiltros,
  onLimpiar,
}: AsistenciaToolbarProps) {
  const { data: niveles = [] } = useNiveles()
  const { data: gradosNivel = [] } = useGradosPorNivel(ubicacion.idNivel)
  // Solo los grados del año elegido.
  const grados = gradosNivel.filter((g) => idAnio == null || g.idAnio === idAnio)
  const { data: seccionesGrado = [] } = useSeccionesPorGrado(ubicacion.idGrado)
  const secciones = seccionesGrado.filter((s) => idTurno == null || s.idTurno === idTurno)
  const { data: turnos = [] } = useTurnos()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BuscadorTabla
        value={busqueda}
        onValueChange={onBusquedaChange}
        placeholder="Buscar por nombre, código o DNI..."
        className="min-w-[200px] flex-1 max-w-[358px]"
      />
      {/* Cuándo: año, vista y el estado (hoy) o la fecha (semana/mes). */}
      <FilterSelect
        label="Año"
        value={idAnio ? String(idAnio) : ""}
        onValueChange={(v) => onIdAnioChange(Number(v))}
        options={anios}
        includeAll={false}
        className="w-[120px]"
      />
      <FilterSelect
        label="Vista"
        value={rango}
        onValueChange={(v) => onRangoChange(v as RangoFecha)}
        options={RANGOS}
        includeAll={false}
        className="w-[130px]"
      />
      {/* El back normaliza: semana → lunes, mes → día 1 */}
      {rango === "hoy" ? (
        <FilterSelect
          value={filtroEstado ?? ""}
          onValueChange={(v) => onFiltroEstadoChange(v || null)}
          options={ESTADOS}
          allLabel="Todos los estados"
          className="w-[170px]"
        />
      ) : (
        <Input
          type="date"
          value={fecha}
          max={fechaHoyISO()}
          onChange={(e) => e.target.value && onFechaChange(e.target.value)}
          className="h-8 w-[150px]"
          aria-label={rango === "semana" ? "Semana de" : "Mes de"}
        />
      )}
      <FilterSelect
        value={idTurno ? String(idTurno) : ""}
        onValueChange={(v) => {
          const nuevo = v ? Number(v) : null
          onIdTurnoChange(nuevo)
          // La sección elegida deja de valer si es de otro turno.
          const sec = seccionesGrado.find((s) => s.idGradoSeccion === ubicacion.idGradoSeccion)
          if (sec && nuevo != null && sec.idTurno !== nuevo) onUbicacionChange({ ...ubicacion, idGradoSeccion: null })
        }}
        options={turnos.filter((t) => t.accesoId == null || t.accesoId === 1).map((t) => ({ value: String(t.idTurno), label: t.nombre }))}
        allLabel="Todos los turnos"
        className="w-[170px]"
      />
      {/* Dónde: cada nivel ya filtra. */}
      <FilterSelect
        value={ubicacion.idNivel ? String(ubicacion.idNivel) : ""}
        onValueChange={(v) => onUbicacionChange({ ...SIN_UBICACION, idNivel: v ? Number(v) : null })}
        options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
        allLabel="Todos los niveles"
        className="w-[170px]"
      />
      <FilterSelect
        value={ubicacion.idGrado ? String(ubicacion.idGrado) : ""}
        onValueChange={(v) => onUbicacionChange({ ...ubicacion, idGrado: v ? Number(v) : null, idGradoSeccion: null })}
        options={grados.map((g) => ({ value: String(g.idGrado), label: g.nombre }))}
        allLabel="Todos los grados"
        className="w-[160px]"
        disabled={!ubicacion.idNivel}
      />
      <FilterSelect
        value={ubicacion.idGradoSeccion ? String(ubicacion.idGradoSeccion) : ""}
        onValueChange={(v) => onUbicacionChange({ ...ubicacion, idGradoSeccion: v ? Number(v) : null })}
        options={secciones.map((s) => ({ value: String(s.idGradoSeccion), label: idTurno ? `Sección ${s.nombre}` : `Sección ${s.nombre} (${s.turno})` }))}
        allLabel="Todas las secciones"
        className="w-[190px]"
        disabled={!ubicacion.idGrado || secciones.length === 0}
      />
      <BotonLimpiarFiltros visible={hayFiltros} onClick={onLimpiar} />
    </div>
  )
}
