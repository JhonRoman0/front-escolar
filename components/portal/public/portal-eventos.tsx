"use client"

import Link from "next/link"
import { Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEventos } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

export function PortalEventosPreview() {
  const { data: eventos = [] } = useEventos()
  const proximos = eventos
    .filter((e) => e.esPublico === 1 && e.accesoId === 1)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    .slice(0, 4)

  if (proximos.length === 0) return null

  return (
    <section className="bg-[#fdf3b0]/30 py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-[#0f1e3d]">
            Próximos Eventos
          </h2>
          <p className="mt-2 text-muted-foreground">
            No te pierdas las actividades del colegio
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {proximos.map((evento) => (
            <div
              key={evento.idEvento}
              className="flex gap-4 rounded-2xl border border-[#e1e7f0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#004497] text-white">
                <span className="text-xs font-medium uppercase">
                  {new Date(evento.fechaInicio).toLocaleDateString("es-PE", { month: "short" })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {new Date(evento.fechaInicio).getDate()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#0f1e3d]">{evento.titulo}</h3>
                {evento.descripcion && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {evento.descripcion}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatearFecha(new Date(evento.fechaInicio))}
                  </span>
                  {evento.lugar && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {evento.lugar}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button render={<Link href="/portal/eventos" />} variant="outline" nativeButton={false}>
            Ver todos los eventos →
          </Button>
        </div>
      </div>
    </section>
  )
}
