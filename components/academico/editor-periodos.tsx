"use client"

import { Input } from "@/components/ui/input"

import { EstadoPeriodoBadge } from "@/components/shared/estado-periodo-badge"
import type { PeriodoEvaluacion, TipoPeriodo } from "@/lib/api/academico"
import { erroresPeriodos, nombrePeriodo, type RangoPeriodo } from "@/lib/calificaciones"
import { formatearFecha } from "@/lib/fechas"

/** Periodos guardados, de solo lectura, con su estado según la fecha de hoy. */
export function ListaPeriodos({ periodos }: { periodos: PeriodoEvaluacion[] }) {
  if (!periodos.length) {
    return <p className="text-xs text-muted-foreground">Aún no tiene periodos definidos.</p>
  }
  return (
    <ul className="flex flex-col divide-y rounded-md border text-xs">
      {periodos.map((p) => (
        <li key={p.numero} className="flex items-center gap-2 px-2.5 py-1.5">
          <span className="w-28 shrink-0 whitespace-nowrap font-medium">{p.nombre}</span>
          <span className="text-muted-foreground">
            {formatearFecha(p.fechaInicio)} – {formatearFecha(p.fechaFin)}
          </span>
          <EstadoPeriodoBadge estado={p.estado} className="ml-auto" />
        </li>
      ))}
    </ul>
  )
}

/** Fechas de cada periodo, limitadas a las del año. */
export function EditorPeriodos({
  tipo,
  value,
  onChange,
  inicioAnio,
  finAnio,
}: {
  tipo: TipoPeriodo
  value: RangoPeriodo[]
  onChange: (periodos: RangoPeriodo[]) => void
  inicioAnio: string | null
  finAnio: string | null
}) {
  const errores = erroresPeriodos(value, tipo, inicioAnio, finAnio)

  function cambiar(indice: number, campo: keyof RangoPeriodo, fecha: string) {
    onChange(value.map((p, i) => (i === indice ? { ...p, [campo]: fecha } : p)))
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((p, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="whitespace-nowrap text-xs font-medium">{nombrePeriodo(tipo, i + 1)}</span>
            <Input
              type="date"
              aria-label={`Inicio del ${nombrePeriodo(tipo, i + 1).toLowerCase()}`}
              value={p.fechaInicio}
              min={inicioAnio ?? undefined}
              max={finAnio ?? undefined}
              aria-invalid={!!errores[i] && !!p.fechaInicio}
              onChange={(e) => cambiar(i, "fechaInicio", e.target.value)}
              className="min-w-0"
            />
            <Input
              type="date"
              aria-label={`Fin del ${nombrePeriodo(tipo, i + 1).toLowerCase()}`}
              value={p.fechaFin}
              min={p.fechaInicio || inicioAnio || undefined}
              max={finAnio ?? undefined}
              aria-invalid={!!errores[i] && !!p.fechaFin}
              onChange={(e) => cambiar(i, "fechaFin", e.target.value)}
              className="min-w-0"
            />
          </div>
          {errores[i] && (p.fechaInicio || p.fechaFin) && (
            <p className="text-xs text-destructive">{errores[i]}</p>
          )}
        </div>
      ))}
    </div>
  )
}
