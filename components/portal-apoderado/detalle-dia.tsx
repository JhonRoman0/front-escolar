"use client"

import { useState } from "react"
import { Camera, Clock, FileText, Maximize2, UserRound } from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { AsistenciaEstadoBadge } from "@/components/asistencia/asistencia-estado-badge"
import type { DiaAsistencia } from "@/lib/api/portal-apoderado"
import { formatearHora } from "@/lib/fechas"
import { cn } from "@/lib/utils"

const ACENTO: Record<string, string> = {
  Puntual: "border-l-emerald-500",
  Tardanza: "border-l-amber-500",
  Justificada: "border-l-sky-500",
  Inasistencia: "border-l-rose-500",
}

const MENSAJE: Record<string, string> = {
  Inasistencia: "No registró su ingreso este día.",
  Pendiente: "Aún no registra su ingreso.",
  "Sin clases": "No hubo clases este día.",
}

/** "lunes 16 de noviembre de 2026" */
function fechaLarga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof Clock; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
        <Icono className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        <p className="break-words text-sm font-medium">{valor}</p>
      </div>
    </div>
  )
}

/** Detalle de un día del calendario: estado, ingreso y, si fue justificado, motivo, acompañante y foto. */
export function DetalleDia({ dia }: { dia: DiaAsistencia }) {
  const [verFoto, setVerFoto] = useState(false)
  const datos = [
    dia.horaEntrada && { icono: Clock, etiqueta: "Hora de ingreso", valor: formatearHora(dia.horaEntrada) },
    dia.justificacion && { icono: FileText, etiqueta: "Motivo", valor: dia.justificacion },
    dia.acompanante && { icono: UserRound, etiqueta: "Lo trajo", valor: dia.acompanante },
  ].filter(Boolean) as { icono: typeof Clock; etiqueta: string; valor: string }[]

  return (
    <div className={cn("rounded-2xl border border-l-4 bg-card p-4", dia.estado ? ACENTO[dia.estado] : undefined)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold first-letter:uppercase">{fechaLarga(dia.fecha)}</p>
        <AsistenciaEstadoBadge estado={dia.estado} />
      </div>

      {datos.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {(dia.estado && MENSAJE[dia.estado]) ?? "Este día aún no llega."}
        </p>
      ) : (
        <div className={cn("mt-3 grid gap-4", dia.urlEvidencia && "md:grid-cols-[minmax(0,1fr)_260px]")}>
          <div className="grid content-start gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {datos.map((d) => <Dato key={d.etiqueta} {...d} />)}
          </div>

          {dia.urlEvidencia && (
            <figure className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setVerFoto(true)}
                className="group relative overflow-hidden rounded-xl border bg-muted"
                aria-label="Ampliar la foto del ingreso"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- foto de Cloudinary */}
                <img src={dia.urlEvidencia} alt="Foto del ingreso justificado" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-80 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="size-3.5" />
                </span>
              </button>
              <figcaption className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="size-3.5" />
                Foto tomada al ingresar
              </figcaption>
            </figure>
          )}
        </div>
      )}

      {dia.urlEvidencia && (
        <Dialog open={verFoto} onOpenChange={setVerFoto}>
          <DialogContent className="max-w-2xl p-2 sm:max-w-2xl">
            <DialogTitle className="sr-only">Foto del ingreso justificado</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto de Cloudinary */}
            <img src={dia.urlEvidencia} alt="Foto del ingreso justificado" className="max-h-[80vh] w-full rounded-lg object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
