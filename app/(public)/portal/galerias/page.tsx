"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
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

export default function GaleriasPage() {
  const { data: galerias = [] } = useGalerias()
  const [lightbox, setLightbox] = useState<{
    imagenes: { imagenUrl: string }[]
    indice: number
  } | null>(null)

  const visibles = galerias.filter((g) => g.accesoId === 1 && g.detalles.length > 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#0f1e3d]">Galería</h1>
        <p className="mt-2 text-muted-foreground">
          Momentos especiales de la vida escolar
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No hay galerías disponibles.
        </p>
      ) : (
        <div className="space-y-10">
          {visibles.map((galeria) => (
            <div key={galeria.idGaleria}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-xl font-semibold text-[#0f1e3d]">
                  {galeria.titulo}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {formatearFecha(new Date(galeria.fecha))}
                </span>
              </div>
              {galeria.descripcion && (
                <p className="mb-4 text-sm text-muted-foreground">
                  {galeria.descripcion}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {galeria.detalles.map((det, idx) => (
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
      )}

      {lightbox && (
        <Lightbox
          imagenes={lightbox.imagenes}
          indice={lightbox.indice}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
