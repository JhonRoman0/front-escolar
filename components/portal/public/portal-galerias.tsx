"use client"

import { useState } from "react"
import Link from "next/link"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGalerias } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

function Lightbox({
  imagenes,
  indice,
  onClose,
}: {
  imagenes: { imagenUrl: string }[]
  indice: number
  onClose: () => void
}) {
  const [actual, setActual] = useState(indice)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-white/80 hover:text-white"
      >
        <X className="h-8 w-8" />
      </button>

      {imagenes.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setActual((actual - 1 + imagenes.length) % imagenes.length)
            }}
            className="absolute left-4 text-white/80 hover:text-white"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setActual((actual + 1) % imagenes.length)
            }}
            className="absolute right-14 text-white/80 hover:text-white"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </>
      )}

      <img
        src={imagenes[actual].imagenUrl}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {imagenes.length > 1 && (
        <div className="absolute bottom-4 text-sm text-white/70">
          {actual + 1} / {imagenes.length}
        </div>
      )}
    </div>
  )
}

export function PortalGaleriasPreview() {
  const { data: galerias = [] } = useGalerias()
  const [lightbox, setLightbox] = useState<{
    imagenes: { imagenUrl: string }[]
    indice: number
  } | null>(null)

  const visibles = galerias
    .filter((g) => g.accesoId === 1 && g.detalles.length > 0)
    .slice(0, 2)

  if (visibles.length === 0) return null

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-[#0f1e3d]">Galería</h2>
          <p className="mt-2 text-muted-foreground">
            Momentos especiales de la vida escolar
          </p>
        </div>

        <div className="space-y-8">
          {visibles.map((galeria) => (
            <div key={galeria.idGaleria}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-[#0f1e3d]">
                  {galeria.titulo}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {formatearFecha(new Date(galeria.fecha))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {galeria.detalles.slice(0, 8).map((det, idx) => (
                  <button
                    key={det.idDetalle}
                    onClick={() =>
                      setLightbox({
                        imagenes: galeria.detalles,
                        indice: idx,
                      })
                    }
                    className="group aspect-square overflow-hidden rounded-xl border border-[#e1e7f0]"
                  >
                    <img
                      src={det.imagenUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button render={<Link href="/portal/galerias" />} variant="outline" nativeButton={false}>
            Ver galería completa →
          </Button>
        </div>
      </div>

      {lightbox && (
        <Lightbox
          imagenes={lightbox.imagenes}
          indice={lightbox.indice}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  )
}
