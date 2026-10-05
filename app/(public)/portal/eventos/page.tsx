"use client"

import { Calendar, MapPin } from "lucide-react"
import { useEventos } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

export default function EventosPage() {
  const { data: eventos = [] } = useEventos()
  const visibles = eventos
    .filter((e) => e.esPublico === 1 && e.accesoId === 1)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#0f1e3d]">Eventos</h1>
        <p className="mt-2 text-muted-foreground">
          Actividades y eventos del colegio
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No hay eventos programados.
        </p>
      ) : (
        <div className="space-y-4">
          {visibles.map((evento) => (
            <div
              key={evento.idEvento}
              className="flex gap-5 rounded-2xl border border-[#e1e7f0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#004497] text-white">
                <span className="text-xs font-medium uppercase">
                  {new Date(evento.fechaInicio).toLocaleDateString("es-PE", {
                    month: "short",
                  })}
                </span>
                <span className="text-xl font-bold leading-none">
                  {new Date(evento.fechaInicio).getDate()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[#0f1e3d]">
                  {evento.titulo}
                </h2>
                {evento.descripcion && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {evento.descripcion}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatearFecha(new Date(evento.fechaInicio))}
                  </span>
                  {evento.lugar && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {evento.lugar}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
