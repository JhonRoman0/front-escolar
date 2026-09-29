"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicaciones } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

export default function PublicacionDetallePage() {
  const params = useParams()
  const slug = params.slug as string
  const { data: publicaciones = [] } = usePublicaciones()

  const pub = publicaciones.find(
    (p) => (p.slug ?? String(p.idPublicacion)) === slug && p.estado === 1 && p.accesoId === 1
  )

  if (!pub) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-[#0f1e3d]">
          Publicación no encontrada
        </h1>
        <p className="mb-6 text-muted-foreground">
          La publicación que buscas no existe o no está disponible.
        </p>
        <Button render={<Link href="/portal/publicaciones" />} variant="outline" nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a publicaciones
        </Button>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Button render={<Link href="/portal/publicaciones" />} variant="ghost" className="mb-6" nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
      </Button>

      {pub.categoria && (
        <span className="mb-3 inline-block rounded-full bg-[#fdf3b0] px-3 py-1 text-xs font-medium text-[#4a3d00]">
          {pub.categoria}
        </span>
      )}

      <h1 className="mb-4 text-3xl font-bold text-[#0f1e3d]">{pub.titulo}</h1>

      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <span>{pub.autor}</span>
        <span>·</span>
        <span>{formatearFecha(new Date(pub.fechaPublicacion))}</span>
      </div>

      {pub.imagenPortadaUrl && (
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img
            src={pub.imagenPortadaUrl}
            alt={pub.titulo}
            className="w-full object-cover"
          />
        </div>
      )}

      <div className="prose prose-slate max-w-none text-[#0f1e3d]">
        {pub.contenido?.split("\n").map((linea, i) => (
          <p key={i}>{linea}</p>
        ))}
      </div>
    </article>
  )
}
