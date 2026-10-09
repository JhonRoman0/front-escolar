"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface BuscadorTablaProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}

/**
 * Buscador reutilizable para toolbars de tablas. La lupa es decorativa
 * (pointer-events-none), no un botón: el filtrado se dispara al escribir.
 */
export function BuscadorTabla({
  value,
  onValueChange,
  placeholder = "Buscar...",
  className,
  "aria-label": ariaLabel,
}: BuscadorTablaProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-8 pl-9"
      />
    </div>
  )
}
