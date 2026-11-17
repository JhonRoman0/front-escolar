"use client"

import { useState } from "react"
import { Ban, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const MINIMO = 5

/** Anula una marca equivocada del día; el motivo queda en el historial. */
export function AnularMarca({
  alumno,
  hora,
  onAnular,
}: {
  alumno: string
  hora: string
  onAnular: (motivo: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)
  const valido = motivo.trim().length >= MINIMO

  function cambiar(abierto: boolean) {
    setOpen(abierto)
    if (!abierto) setMotivo("")
  }

  async function confirmar() {
    if (!valido) return
    setEnviando(true)
    try {
      await onAnular(motivo.trim())
      cambiar(false)
    } catch {
      // El aviso de error lo muestra quien llama; el diálogo queda abierto.
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Anular la marca de ${alumno}`}
        title="Anular marca del día"
        onClick={() => setOpen(true)}
      >
        <Ban />
      </Button>
      <Dialog open={open} onOpenChange={cambiar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anular marca</DialogTitle>
            <DialogDescription>
              Se anulará el ingreso de {alumno} ({hora}). Volverá a figurar como pendiente o falta, sin enviar aviso de falta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-anulacion">Motivo</Label>
            <Textarea
              id="motivo-anulacion"
              placeholder="Ej.: se escaneó el QR de su hermano"
              value={motivo}
              maxLength={200}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => cambiar(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmar} disabled={!valido || enviando}>
              {enviando ? <Loader2 className="animate-spin" /> : <Ban />}
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
