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
    <ul className="flex flex-col divide-y rounded-md border">
      {periodos.map((p) => (
        <li key={p.numero} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{p.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {formatearFecha(p.fechaInicio)} al {formatearFecha(p.fechaFin)}
            </p>
          </div>
          <EstadoPeriodoBadge estado={p.estado} />
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
          <p className="text-xs font-medium">{nombrePeriodo(tipo, i + 1)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              aria-label={`Inicio del ${nombrePeriodo(tipo, i + 1).toLowerCase()}`}
              value={p.fechaInicio}
              min={inicioAnio ?? undefined}
              max={finAnio ?? undefined}
              aria-invalid={!!errores[i] && !!p.fechaInicio}
              onChange={(e) => cambiar(i, "fechaInicio", e.target.value)}
            />
            <Input
              type="date"
              aria-label={`Fin del ${nombrePeriodo(tipo, i + 1).toLowerCase()}`}
              value={p.fechaFin}
              min={p.fechaInicio || inicioAnio || undefined}
              max={finAnio ?? undefined}
              aria-invalid={!!errores[i] && !!p.fechaFin}
              onChange={(e) => cambiar(i, "fechaFin", e.target.value)}
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
