"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePublicaciones } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

export function PortalPublicacionesPreview() {
  const { data: publicaciones = [] } = usePublicaciones()
  const destacadas = publicaciones
    .filter((p) => p.estado === 1 && p.accesoId === 1)
    .slice(0, 3)

  if (destacadas.length === 0) return null

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-[#0f1e3d]">
            Publicaciones Destacadas
          </h2>
          <p className="mt-2 text-muted-foreground">
            Mantente informado con las últimas novedades del colegio
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {destacadas.map((pub) => (
            <Link
              key={pub.idPublicacion}
              href={`/portal/publicaciones/${pub.slug ?? pub.idPublicacion}`}
              className="group block overflow-hidden rounded-2xl border border-[#e1e7f0] shadow-sm transition-all hover:shadow-md"
            >
              {pub.imagenPortadaUrl && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={pub.imagenPortadaUrl}
                    alt={pub.titulo}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-5">
                {pub.categoria && (
                  <span className="mb-2 inline-block rounded-full bg-[#fdf3b0] px-3 py-1 text-xs font-medium text-[#4a3d00]">
                    {pub.categoria}
                  </span>
                )}
                <h3 className="mb-2 text-lg font-semibold text-[#0f1e3d] group-hover:text-[#004497]">
                  {pub.titulo}
                </h3>
                {pub.contenido && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {pub.contenido}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(new Date(pub.fechaPublicacion))}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button render={<Link href="/portal/publicaciones" />} variant="outline" nativeButton={false}>
            Ver todas las publicaciones →
          </Button>
        </div>
      </div>
    </section>
  )
}
