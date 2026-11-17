"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** "Limpiar filtros" de las barras de filtros; solo se muestra si hay algo filtrado. */
export function BotonLimpiarFiltros({
  visible,
  onClick,
  className,
}: {
  visible: boolean
  onClick: () => void
  className?: string
}) {
  if (!visible) return null
  return (
    <Button variant="outline" size="sm" className={cn("ml-auto text-muted-foreground", className)} onClick={onClick}>
      <RotateCcw className="mr-1 size-3.5" />
      Limpiar filtros
    </Button>
  )
}
