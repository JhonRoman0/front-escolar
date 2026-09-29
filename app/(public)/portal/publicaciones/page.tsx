"use client"

import Link from "next/link"
import { usePublicaciones } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

export default function PublicacionesPage() {
  const { data: publicaciones = [] } = usePublicaciones()
  const visibles = publicaciones.filter((p) => p.estado === 1 && p.accesoId === 1)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#0f1e3d]">Publicaciones</h1>
        <p className="mt-2 text-muted-foreground">
          Noticias y novedades del colegio
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No hay publicaciones disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibles.map((pub) => (
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
                <h2 className="mb-2 text-lg font-semibold text-[#0f1e3d] group-hover:text-[#004497]">
                  {pub.titulo}
                </h2>
                {pub.contenido && (
                  <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
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
      )}
    </div>
  )
}
