"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConfirmarEliminarProps {
  titulo: string
  descripcion: string
  onConfirm: () => Promise<void>
  className?: string
}

export function ConfirmarEliminar({
  titulo,
  descripcion,
  onConfirm,
  className,
}: ConfirmarEliminarProps) {
  const [open, setOpen] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function handleConfirm() {
    setCargando(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // el error ya se muestra con toast desde la pantalla
    } finally {
      setCargando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className={className}
            aria-label={`Eliminar ${titulo}`}
          />
        }
      >
        <Trash2 className="text-destructive" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogTrigger render={<Button variant="outline" />}>
            Cancelar
          </DialogTrigger>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cargando}
          >
            {cargando && <Loader2 className="animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}