"use client"

import { useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AlumnoResponse } from "@/lib/api/estudiantes"

interface AlumnoQrModalProps {
  alumno: AlumnoResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QR_SIZE = 256

export function AlumnoQrModal({ alumno, open, onOpenChange }: AlumnoQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPat} ${alumno.apellidoMat}`.trim()

  function handleDownload() {
    const qrCanvas = canvasRef.current
    if (!qrCanvas) return

    const padding = 24
    const textHeight = 70
    const finalWidth = QR_SIZE + padding * 2
    const finalHeight = QR_SIZE + padding * 2 + textHeight

    const finalCanvas = document.createElement("canvas")
    finalCanvas.width = finalWidth
    finalCanvas.height = finalHeight
    const ctx = finalCanvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, finalWidth, finalHeight)
    ctx.drawImage(qrCanvas, padding, padding, QR_SIZE, QR_SIZE)

    const textCenterX = finalWidth / 2
    const textBaseY = QR_SIZE + padding * 2 + 4
    ctx.fillStyle = "#000000"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.font = "bold 16px Arial, sans-serif"
    ctx.fillText(nombreCompleto, textCenterX, textBaseY)
    ctx.font = "14px Arial, sans-serif"
    ctx.fillText(alumno.codigo, textCenterX, textBaseY + 24)

    const link = document.createElement("a")
    link.download = `qr-${alumno.codigo}.png`
    link.href = finalCanvas.toDataURL("image/png")
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR del alumno</DialogTitle>
          <DialogDescription>
            Este código se utiliza para registrar la asistencia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg border bg-white p-4">
            <QRCodeCanvas
              ref={canvasRef}
              value={alumno.codigoHash}
              size={QR_SIZE}
              level="H"
              marginSize={0}
            />
          </div>

          <div className="text-center">
            <p className="font-semibold">{nombreCompleto}</p>
            <p className="text-sm text-muted-foreground">{alumno.codigo}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cerrar
          </Button>
          <Button type="button" onClick={handleDownload} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}