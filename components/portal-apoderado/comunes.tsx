"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

export function nombreMes(anio: number, mes: number) {
  return `${MESES[mes - 1]} ${anio}`
}

/** AD/A y 14+ verde; B y 11–13 ámbar; C y menos de 11 rojo. */
function tonoNota(calificacion: string): "success" | "warning" | "danger" | "secondary" {
  const c = calificacion.trim().toUpperCase()
  if (c === "AD" || c === "A") return "success"
  if (c === "B") return "warning"
  if (c === "C") return "danger"
  const n = Number(c)
  if (Number.isNaN(n)) return "secondary"
  return n >= 14 ? "success" : n >= 11 ? "warning" : "danger"
}

export function NotaBadge({ calificacion }: { calificacion: string | null }) {
  if (!calificacion) return <span className="text-xs text-muted-foreground">Sin nota</span>
  return <Badge variant={tonoNota(calificacion)} className="min-w-9 justify-center">{calificacion}</Badge>
}

export function Seccion({ titulo, extra, children, className }: { titulo: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Cargando() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

export function ErrorCarga({ error }: { error: unknown }) {
  return (
    <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {error instanceof Error ? error.message : "No se pudo cargar la información."}
    </p>
  )
}
