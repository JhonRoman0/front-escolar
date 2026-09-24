"use client"

import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"

interface BuscarDniButtonProps {
  dni: string | undefined
  cargando?: boolean
  disabled?: boolean
  onBuscar: () => void
}

export function BuscarDniButton({ dni, cargando, disabled, onBuscar }: BuscarDniButtonProps) {
  const dniValido = !!dni && /^\d{8}$/.test(dni.trim())
  return (
    <Button type="button" variant="outline" size="sm" disabled={!dniValido || cargando || disabled} onClick={onBuscar}>
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      Buscar
    </Button>
  )
}
