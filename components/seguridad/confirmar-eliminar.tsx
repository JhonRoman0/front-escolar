"use client"

import { useState, type ReactNode } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
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
  disabled?: boolean
  // Los siguientes existen para reutilizar la confirmacion en acciones que no
  // son borrados (por ejemplo activar un año como vigente). Sus defaults
  // reproducen exactamente el comportamiento de eliminar, asi que los call
  // sites que solo eliminan no cambian.
  textoBoton?: string
  icono?: ReactNode
  variantConfirmar?: VariantProps<typeof buttonVariants>["variant"]
  // Modo controlado: si se pasa `open`, el diálogo no se abre con su propio
  // trigger sino desde fuera, y el trigger se oculta. Es lo que permite
  // confirmar algo que se decidió en un submit y no en un clic.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmarEliminar({
  titulo,
  descripcion,
  onConfirm,
  className,
  disabled,
  textoBoton = "Eliminar",
  icono = <Trash2 className="text-destructive" />,
  variantConfirmar = "destructive",
  open: openControlado,
  onOpenChange,
}: ConfirmarEliminarProps) {
  const [openInterno, setOpenInterno] = useState(false)
  const [cargando, setCargando] = useState(false)
  const controlado = openControlado !== undefined
  const open = controlado ? openControlado : openInterno

  function setOpen(valor: boolean) {
    if (!controlado) setOpenInterno(valor)
    onOpenChange?.(valor)
  }

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
    <Dialog open={open} onOpenChange={disabled ? undefined : setOpen}>
      {controlado ? null : (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className={className}
              aria-label={`${textoBoton} ${titulo}`}
              disabled={disabled}
            />
          }
        >
          {icono}
        </DialogTrigger>
      )}
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
            variant={variantConfirmar}
            onClick={handleConfirm}
            disabled={cargando}
          >
            {cargando && <Loader2 className="animate-spin" />}
            {textoBoton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}