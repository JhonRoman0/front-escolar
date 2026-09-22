"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  useConfirmarAsistencia,
  useJustificaciones,
  usePrevisualizarAsistencia,
} from "@/hooks/use-asistencia"
import type { AsistenciaResponse } from "@/lib/api/asistencia"
import { PrevisualizacionAlumno } from "./previsualizacion-alumno"

interface RegistrarCamaraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QR_REGION_ID = "qr-camera-region"

export function RegistrarCamaraModal({
  open,
  onOpenChange,
}: RegistrarCamaraModalProps) {
  const previsualizar = usePrevisualizarAsistencia()
  const confirmar = useConfirmarAsistencia()
  const { data: justificaciones } = useJustificaciones()

  const [escaneando, setEscaneando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(null)
  const [previsualizacion, setPrevisualizacion] =
    useState<AsistenciaResponse | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [idJustificacion, setIdJustificacion] = useState<number | null>(null)
  const [buscando, setBuscando] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  // mutateAsync es estable; se guarda en ref para usarlo dentro del effect
  // sin re-disparar el inicio de la cámara.
  const previsualizarRef = useRef(previsualizar.mutateAsync)
  useEffect(() => {
    previsualizarRef.current = previsualizar.mutateAsync
  })

  // ── Iniciar / detener el escáner al abrir/cerrar el modal ──
  useEffect(() => {
    if (!open) return

    let mounted = true

    async function iniciar() {
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (!mounted) return

      const region = document.getElementById(QR_REGION_ID)
      if (!region) {
        setErrorCamara("No se pudo iniciar el lector de QR.")
        return
      }

      try {
        const scanner = new Html5Qrcode(QR_REGION_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (!mounted) return
            scanner.pause(true)
            const codigo = decoded.toUpperCase()
            setCodigoEscaneado(codigo)
            buscarAlumno(codigo)
          },
          () => {}
        )

        if (mounted) setEscaneando(true)
      } catch {
        if (mounted) {
          setErrorCamara(
            "No se pudo acceder a la cámara. Verifica que diste permiso al navegador."
          )
        }
      }
    }

    async function buscarAlumno(codigo: string) {
      setBuscando(true)
      setErrorBusqueda(null)
      setPrevisualizacion(null)
      setIdJustificacion(null)

      try {
        const data = await previsualizarRef.current({ codigoHash: codigo })
        if (!mounted) return
        setPrevisualizacion(data)
      } catch (error) {
        if (mounted) {
          setErrorBusqueda(
            error instanceof Error ? error.message : "No se pudo procesar el código"
          )
        }
      } finally {
        if (mounted) setBuscando(false)
      }
    }

    iniciar()

    return () => {
      mounted = false
      const scanner = scannerRef.current
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
        scannerRef.current = null
      }
      setEscaneando(false)
      setCodigoEscaneado(null)
      setPrevisualizacion(null)
      setErrorCamara(null)
      setErrorBusqueda(null)
      setIdJustificacion(null)
    }
  }, [open])

  function continuarEscaneando() {
    setCodigoEscaneado(null)
    setPrevisualizacion(null)
    setErrorBusqueda(null)
    setIdJustificacion(null)
    try {
      // resume() lanza si el escáner ya está detenido; es seguro ignorarlo
      scannerRef.current?.resume()
    } catch {
      /* escáner no activo */
    }
  }

  async function handleRegistrar() {
    if (!previsualizacion || !codigoEscaneado) return
    if (previsualizacion.estado === "Justificada" && !idJustificacion) return

    try {
      const resultado = await confirmar.mutateAsync({
        codigoHash: codigoEscaneado,
        idJustificacion: idJustificacion ?? undefined,
      })
      toast.success(`Registrado como ${resultado.estado}: ${resultado.alumno}`)
      continuarEscaneando()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar la asistencia"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar asistencia por cámara</DialogTitle>
          <DialogDescription>
            Apunta la cámara al código QR del alumno para escanearlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorCamara && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorCamara}</p>
            </div>
          )}

          {/* Región del video */}
          <div
            id={QR_REGION_ID}
            className="overflow-hidden rounded-lg bg-black"
            style={{
              minHeight: codigoEscaneado ? 0 : 300,
              display: codigoEscaneado ? "none" : "block",
            }}
          />

          {!escaneando && !errorCamara && !codigoEscaneado && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Iniciando cámara...</span>
            </div>
          )}

          {codigoEscaneado && buscando && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Buscando alumno...</span>
            </div>
          )}

          {codigoEscaneado && errorBusqueda && !buscando && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">No se puede registrar la asistencia</p>
                  <p className="text-destructive/80">{errorBusqueda}</p>
                </div>
              </div>
              <Button variant="outline" onClick={continuarEscaneando} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Escanear otro
              </Button>
            </div>
          )}

          {codigoEscaneado && previsualizacion && !buscando && (
            <PrevisualizacionAlumno
              previsualizacion={previsualizacion}
              justificaciones={justificaciones}
              idJustificacion={idJustificacion}
              onIdJustificacionChange={setIdJustificacion}
              onRegistrar={handleRegistrar}
              onVolver={continuarEscaneando}
              registrando={confirmar.isPending}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
