"use client"

import { CalendarCheck, CalendarClock, CalendarX, ShieldCheck } from "lucide-react"

import { useResumenPortal } from "@/hooks/use-portal-apoderado"
import type { AsistenciaMes } from "@/lib/api/portal-apoderado"
import { formatearFecha, formatearHora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { Cargando, ErrorCarga, NotaBadge, Seccion, Vacio, nombreMes } from "./comunes"

/** Puntuales, tardanzas, justificadas y faltas del mes. */
export function KpisAsistencia({ asistencia }: { asistencia: AsistenciaMes }) {
  const kpis = [
    { label: "Puntuales", valor: asistencia.puntuales, icono: CalendarCheck, tono: "text-emerald-600 bg-emerald-500/10" },
    { label: "Tardanzas", valor: asistencia.tardanzas, icono: CalendarClock, tono: "text-amber-600 bg-amber-500/10" },
    { label: "Justificadas", valor: asistencia.justificadas, icono: ShieldCheck, tono: "text-sky-600 bg-sky-500/10" },
    { label: "Faltas", valor: asistencia.faltas, icono: CalendarX, tono: "text-rose-600 bg-rose-500/10" },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="flex items-center gap-3 rounded-xl border p-3">
          <span className={cn("flex size-9 items-center justify-center rounded-lg", k.tono)}>
            <k.icono className="size-4" />
          </span>
          <div>
            <p className="text-lg font-bold leading-none">{k.valor}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResumenTab({ idMatricula }: { idMatricula: number }) {
  const { data, isLoading, error } = useResumenPortal(idMatricula)
  if (isLoading) return <Cargando />
  if (error || !data) return <ErrorCarga error={error} />

  return (
    <div className="flex flex-col gap-4">
      <Seccion titulo={`Asistencia de ${nombreMes(data.asistencia.anio, data.asistencia.mes)}`}>
        <KpisAsistencia asistencia={data.asistencia} />
      </Seccion>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Últimas notas">
          {data.ultimasNotas.length === 0 ? (
            <Vacio>Aún no hay notas registradas.</Vacio>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.ultimasNotas.map((n, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.evaluacion}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.curso}{n.fecha ? ` · ${formatearFecha(n.fecha)}` : ""}
                    </p>
                  </div>
                  <NotaBadge calificacion={n.calificacion} />
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Clases de hoy">
          {data.clasesDeHoy.length === 0 ? (
            <Vacio>Hoy no hay clases.</Vacio>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.clasesDeHoy.map((c) => (
                <li key={c.idHorario} className="flex items-center gap-3 py-2">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                    {formatearHora(c.horaInicio)}–{formatearHora(c.horaFin)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.curso}</p>
                    <p className="truncate text-xs text-muted-foreground">{[c.docente, c.aula].filter(Boolean).join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </div>
  )
}
