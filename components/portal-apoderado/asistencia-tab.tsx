"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAsistenciaPortal } from "@/hooks/use-portal-apoderado"
import type { DiaAsistencia } from "@/lib/api/portal-apoderado"
import { formatearFecha } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { Cargando, ErrorCarga, Seccion, nombreMes } from "./comunes"
import { DetalleDia } from "./detalle-dia"
import { KpisAsistencia } from "./resumen-tab"

const CABECERA = ["L", "M", "M", "J", "V", "S", "D"]

const COLOR: Record<string, string> = {
  Puntual: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Tardanza: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Justificada: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Inasistencia: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Pendiente: "bg-muted text-foreground",
  "Sin clases": "text-muted-foreground/60",
}

function mesISO(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`
}

function desplazar(anio: number, mes: number, delta: number) {
  const d = new Date(anio, mes - 1 + delta, 1)
  return mesISO(d.getFullYear(), d.getMonth() + 1)
}

/** Calendario del mes con el color de cada día; al tocar un día se ve el detalle. */
export function AsistenciaTab({ idMatricula }: { idMatricula: number }) {
  // null: el mes que elige el back (el actual dentro del año escolar).
  const [mes, setMes] = useState<string | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const { data, isLoading, error } = useAsistenciaPortal(idMatricula, mes)

  if (isLoading) return <Cargando />
  if (error || !data) return <ErrorCarga error={error} />

  const primerDia = new Date(data.anio, data.mes - 1, 1).getDay()
  const huecos = (primerDia + 6) % 7
  const detalle: DiaAsistencia | undefined = data.dias.find((d) => d.fecha === elegido)

  function cambiarMes(delta: number) {
    setMes(desplazar(data!.anio, data!.mes, delta))
    setElegido(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <KpisAsistencia asistencia={data} />
      <Seccion
        titulo={nombreMes(data.anio, data.mes)}
        extra={
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>
              <ChevronRight />
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1 text-center">
          {CABECERA.map((c, i) => (
            <span key={i} className="pb-1 text-xs font-medium text-muted-foreground">{c}</span>
          ))}
          {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
          {data.dias.map((d) => {
            const dia = Number(d.fecha.slice(8, 10))
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={() => setElegido(d.fecha)}
                aria-label={`${formatearFecha(d.fecha)}: ${d.estado ?? "sin registro"}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-shadow sm:aspect-auto sm:h-11",
                  d.estado ? COLOR[d.estado] : "text-muted-foreground",
                  elegido === d.fecha && "ring-2 ring-primary"
                )}
              >
                {dia}
              </button>
            )
          })}
        </div>

        {detalle && (
          <DetalleDia dia={detalle} />
        )}
      </Seccion>
    </div>
  )
}
