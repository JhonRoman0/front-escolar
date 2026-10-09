"use client"

import { cn } from "@/lib/utils"

interface TarjetaSeccionProps {
  children: React.ReactNode
  className?: string
  destacada?: boolean
}

export function TarjetaSeccion({
  children,
  className,
  destacada = false,
}: TarjetaSeccionProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        destacada ? "border-brand/25 bg-brand-subtle/40" : "bg-muted/10",
        className
      )}
    >
      {children}
    </div>
  )
}