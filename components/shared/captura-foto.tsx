"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Toma una foto con la cámara del equipo (sin subir archivos) y la entrega como JPG. */
export function CapturaFoto({ foto, onChange }: { foto: File | null; onChange: (foto: File | null) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [activa, setActiva] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vistaPrevia = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto])

  function apagar() {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setActiva(false)
  }

  useEffect(() => apagar, [])
  useEffect(() => () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  async function encender() {
    setError(null)
    // El navegador solo da la cámara en HTTPS (o localhost).
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setError("Hubo un error al acceser a la cámara")
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      setActiva(true)
      requestAnimationFrame(() => {
        if (video.current && stream.current) {
          video.current.srcObject = stream.current
          void video.current.play()
        }
      })
    } catch {
      setError("No se pudo abrir la cámara. Revisa los permisos del navegador.")
    }
  }

  function capturar() {
    const v = video.current
    if (!v) return
    const canvas = document.createElement("canvas")
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext("2d")?.drawImage(v, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) onChange(new File([blob], `evidencia-${Date.now()}.jpg`, { type: "image/jpeg" }))
      apagar()
    }, "image/jpeg", 0.85)
  }

  if (foto && vistaPrevia) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob) */}
        <img src={vistaPrevia} alt="Foto de evidencia" className="h-24 w-32 rounded-md border object-cover" />
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
          <RotateCcw data-icon="inline-start" />
          Tomar otra
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {activa ? (
        <>
          <video ref={video} playsInline muted className="w-full max-w-sm rounded-md border bg-black" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={capturar}>
              <Camera data-icon="inline-start" />
              Capturar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={apagar}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={encender}>
          <Camera data-icon="inline-start" />
          Tomar foto
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
