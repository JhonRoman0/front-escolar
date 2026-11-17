"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import {
  useAsistenciasHoy,
  useConfirmarAsistencia,
  useJustificaciones,
  usePrevisualizarAsistencia,
} from "@/hooks/use-asistencia"
import type { AsistenciaRequest, AsistenciaResponse } from "@/lib/api/asistencia"
import { formatearHora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { PrevisualizacionAlumno } from "./previsualizacion-alumno"

interface RegistrarCamaraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QR_REGION_ID = "qr-camera-region"
/** Cuánto se ve el resultado del último registro. */
const RESULTADO_MS = 3000

type Resultado = { ok: true; asistencia: AsistenciaResponse } | { ok: false; mensaje: string }

/** El navegador solo da la cámara en HTTPS (o localhost). */
const SIN_HTTPS = "La cámara tuvo un error. Mientras tanto, busca al alumno por código, nombre o DNI."

/**
 * Apaga el lector sin romper la pantalla: stop() lanza un error inmediato (no
 * una promesa rechazada) si la cámara nunca llegó a encender.
 */
function detener(scanner: Html5Qrcode) {
  try {
    scanner.stop().then(() => scanner.clear()).catch(() => {})
  } catch {
    try {
      scanner.clear()
    } catch {
      /* nada que limpiar */
    }
  }
}

/** Tono corto: agudo si entró puntual, medio si tarde, grave si hubo error. */
function sonar(tono: "puntual" | "tarde" | "error") {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = tono === "puntual" ? 880 : tono === "tarde" ? 600 : 220
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + (tono === "error" ? 0.45 : 0.18))
    osc.onended = () => void ctx.close()
  } catch {
    // Sin audio: queda el color.
  }
}

const COLOR_ESTADO: Record<string, string> = {
  Puntual: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Tardanza: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Justificada: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300",
}

/**
 * Registro de ingreso: se escanea el QR (o se busca por código, nombre o DNI),
 * se ve la foto del alumno y se confirma. Tras registrar vuelve a escanear sola.
 */
export function RegistrarCamaraModal({ open, onOpenChange }: RegistrarCamaraModalProps) {
  const previsualizar = usePrevisualizarAsistencia()
  const confirmar = useConfirmarAsistencia()
  const { data: justificaciones } = useJustificaciones()

  const [escaneando, setEscaneando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  // Alumno leído o elegido, a la espera de confirmar.
  const [pedido, setPedido] = useState<AsistenciaRequest | null>(null)
  const [previsualizacion, setPrevisualizacion] = useState<AsistenciaResponse | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [idJustificacion, setIdJustificacion] = useState<number | null>(null)
  const [acompanante, setAcompanante] = useState("")
  const [foto, setFoto] = useState<File | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const texto = busqueda.trim()
  const candidatos = useAsistenciasHoy({ page: 0, size: 5, search: texto.length >= 2 ? texto : undefined })

  const scannerRef = useRef<Html5Qrcode | null>(null)
  // Evita registrar dos veces (Enter con el botón enfocado dispara ambos).
  const enviando = useRef(false)
  // El escáner usa siempre la última versión de la función.
  const abrirRef = useRef<(p: AsistenciaRequest) => void>(() => {})

  function pausar() {
    try {
      scannerRef.current?.pause(true)
    } catch {
      /* escáner no activo */
    }
  }

  async function abrir(p: AsistenciaRequest) {
    pausar()
    setPedido(p)
    setBuscando(true)
    setErrorBusqueda(null)
    setPrevisualizacion(null)
    setIdJustificacion(null)
    setAcompanante("")
    setFoto(null)
    try {
      setPrevisualizacion(await previsualizar.mutateAsync(p))
    } catch (error) {
      sonar("error")
      setErrorBusqueda(error instanceof Error ? error.message : "No se pudo procesar el código")
    } finally {
      setBuscando(false)
    }
  }

  useEffect(() => {
    abrirRef.current = (p) => void abrir(p)
  })

  // ── Iniciar / detener el escáner al abrir/cerrar el modal ──
  useEffect(() => {
    if (!open) return
    let mounted = true

    async function iniciar() {
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (!mounted) return
      if (!document.getElementById(QR_REGION_ID)) {
        setErrorCamara("No se pudo iniciar el lector de QR.")
        return
      }
      if (!window.isSecureContext || !navigator.mediaDevices) {
        setErrorCamara(SIN_HTTPS)
        return
      }
      const scanner = new Html5Qrcode(QR_REGION_ID)
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (mounted) abrirRef.current({ codigoHash: decoded.toUpperCase() })
          },
          () => {}
        )
        // Se cerró mientras se pedía el permiso: se apaga en vez de quedar encendida.
        if (!mounted) {
          detener(scanner)
          return
        }
        scannerRef.current = scanner
        setEscaneando(true)
      } catch {
        detener(scanner)
        if (mounted) {
          setErrorCamara("No se pudo acceder a la cámara. Puedes buscar al alumno por código, nombre o DNI.")
        }
      }
    }

    iniciar()

    return () => {
      mounted = false
      const scanner = scannerRef.current
      if (scanner) {
        detener(scanner)
        scannerRef.current = null
      }
      setEscaneando(false)
      setPedido(null)
      setPrevisualizacion(null)
      setErrorCamara(null)
      setErrorBusqueda(null)
      setIdJustificacion(null)
      setAcompanante("")
      setFoto(null)
      setResultado(null)
      setBusqueda("")
    }
  }, [open])

  function continuarEscaneando() {
    setPedido(null)
    setPrevisualizacion(null)
    setErrorBusqueda(null)
    setIdJustificacion(null)
    setAcompanante("")
    setFoto(null)
    try {
      // resume() lanza si el escáner no está pausado; es seguro ignorarlo
      scannerRef.current?.resume()
    } catch {
      /* escáner no activo */
    }
  }

  function mostrar(r: Resultado) {
    setResultado(r)
    sonar(!r.ok ? "error" : r.asistencia.estado === "Puntual" ? "puntual" : "tarde")
    setTimeout(() => setResultado((actual) => (actual === r ? null : actual)), RESULTADO_MS)
  }

  async function handleRegistrar() {
    if (!previsualizacion || !pedido || enviando.current) return
    if (previsualizacion.estado === "Justificada" && (!idJustificacion || !acompanante.trim() || !foto)) return
    enviando.current = true
    try {
      const asistencia = await confirmar.mutateAsync({
        data: { ...pedido, idJustificacion: idJustificacion ?? undefined, acompanante: acompanante.trim() || undefined },
        foto,
      })
      mostrar({ ok: true, asistencia })
    } catch (error) {
      mostrar({ ok: false, mensaje: error instanceof Error ? error.message : "Error al registrar la asistencia" })
    } finally {
      enviando.current = false
    }
    continuarEscaneando()
  }

  // Enter confirma un ingreso normal (el justificado se completa a mano).
  const registrarRef = useRef(handleRegistrar)
  useEffect(() => {
    registrarRef.current = handleRegistrar
  })
  const listoParaEnter = !!previsualizacion && previsualizacion.estado !== "Justificada"
  useEffect(() => {
    if (!listoParaEnter) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return
      e.preventDefault()
      void registrarRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [listoParaEnter])

  const hayAlumno = pedido !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar asistencia</DialogTitle>
          <DialogDescription>
            Escanea el QR del alumno o búscalo; confirma comparando su foto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {resultado && (
            resultado.ok ? (
              <div className={cn("flex items-center gap-2 rounded-md border-2 p-3 text-sm font-semibold", COLOR_ESTADO[resultado.asistencia.estado])}>
                {resultado.asistencia.estado === "Puntual" ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
                <span>
                  {resultado.asistencia.alumno} · {resultado.asistencia.estado} · {formatearHora(resultado.asistencia.horaEntrada)}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <span>{resultado.mensaje}</span>
              </div>
            )
          )}

          {errorCamara && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorCamara}</p>
            </div>
          )}

          {/* Región del video: se oculta mientras se confirma a un alumno */}
          <div
            id={QR_REGION_ID}
            className="overflow-hidden rounded-lg bg-black"
            style={{ minHeight: hayAlumno || errorCamara ? 0 : 300, display: hayAlumno || errorCamara ? "none" : "block" }}
          />

          {!escaneando && !errorCamara && !hayAlumno && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Iniciando cámara...</span>
            </div>
          )}

          {hayAlumno && buscando && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Buscando alumno...</span>
            </div>
          )}

          {hayAlumno && errorBusqueda && !buscando && (
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

          {hayAlumno && previsualizacion && !buscando && (
            <>
              <PrevisualizacionAlumno
                previsualizacion={previsualizacion}
                justificaciones={justificaciones}
                idJustificacion={idJustificacion}
                onIdJustificacionChange={setIdJustificacion}
                acompanante={acompanante}
                onAcompananteChange={setAcompanante}
                foto={foto}
                onFotoChange={setFoto}
                onRegistrar={handleRegistrar}
                onVolver={continuarEscaneando}
                registrando={confirmar.isPending}
              />
              {listoParaEnter && (
                <p className="text-center text-xs text-muted-foreground">
                  Verifica que la foto sea del alumno. Enter para registrar.
                </p>
              )}
            </>
          )}

          {/* Sin QR: búsqueda por código, nombre o DNI */}
          {!hayAlumno && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="¿Sin QR? Busca por código, nombre o DNI"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {texto.length >= 2 && (
                <ul className="flex flex-col divide-y rounded-md border">
                  {(candidatos.data?.content ?? []).map((a) => (
                    <li key={a.idAlumno}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                        disabled={!!a.idAsistencia || !a.codigo}
                        onClick={() => {
                          setBusqueda("")
                          void abrir({ codigo: a.codigo ?? "" })
                        }}
                      >
                        <span>
                          <span className="font-medium">{a.alumno}</span>
                          <span className="text-muted-foreground"> · {a.grado} {a.seccion}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{a.idAsistencia ? "Ya registró" : a.codigo}</span>
                      </button>
                    </li>
                  ))}
                  {!candidatos.isLoading && !candidatos.data?.content.length && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</li>
                  )}
                </ul>
              )}
            </div>
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
