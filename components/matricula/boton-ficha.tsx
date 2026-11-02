"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { descargarFicha } from "@/lib/reportes/generar-ficha"

/** Con texto al terminar la matrícula; solo el ícono en la fila de la tabla. */
export function BotonFicha({
  idMatricula,
  alumno,
  conTexto = false,
}: {
  idMatricula: number
  alumno: string
  conTexto?: boolean
}) {
  const [generando, setGenerando] = useState(false)
  const Icono = generando ? Loader2 : FileText

  async function handleDescargar() {
    setGenerando(true)
    try {
      await descargarFicha(idMatricula)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la ficha")
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Button
      variant={conTexto ? "brand" : "outline"}
      size={conTexto ? "default" : "icon-sm"}
      aria-label={`Ficha de matrícula de ${alumno}`}
      disabled={generando}
      onClick={handleDescargar}
    >
      <Icono className={generando ? "animate-spin" : undefined} data-icon={conTexto ? "inline-start" : undefined} />
      {conTexto && "Descargar ficha"}
    </Button>
  )
}
