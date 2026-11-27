import type { ReactNode } from "react"

import type { OrigenRegistro } from "@/lib/api/academico"
import { formatearFecha } from "@/lib/fechas"
import { cn } from "@/lib/utils"

export type DatoItem = { etiqueta: string; valor?: ReactNode }

export function fechaDetalle(iso: string | null | undefined): string | null {
  return iso ? formatearFecha(iso) : null
}

export function origenDetalle(valor: OrigenRegistro | null | undefined): string | null {
  if (valor === "MANUAL") return "Manual"
  if (valor === "AUTOMATICO") return "Automático"
  return null
}

function Dato({ etiqueta, valor }: DatoItem) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="break-words text-sm">{valor}</p>
    </div>
  )
}

export function SeccionDatos({
  titulo,
  datos,
  columnas = 2,
}: {
  titulo: string
  datos: DatoItem[]
  columnas?: 2 | 3
}) {
  const visibles = datos.filter(({ valor }) => {
    if (valor == null || valor === "") return false
    if (typeof valor === "string") return valor.trim() !== "" && valor !== "—"
    return true
  })
  if (!visibles.length) return null

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2",
          columnas === 3 && "lg:grid-cols-3"
        )}
      >
        {visibles.map((dato) => (
          <Dato key={dato.etiqueta} {...dato} />
        ))}
      </div>
    </section>
  )
}
