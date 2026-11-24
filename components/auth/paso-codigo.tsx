"use client"

import { useEffect, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { botonAcceso } from "@/components/shared/campo-texto-acceso"
import { EntradaCodigo } from "@/components/auth/entrada-codigo"
import { formatearContador } from "@/lib/codigo-verificacion"
import { cn } from "@/lib/utils"

interface PasoCodigoProps {
  codigo: string
  onCodigo: (valor: string) => void
  onVerificar: () => void
  verificando: boolean
  /** Segundos para poder reenviar; 0 muestra el enlace. */
  segundos: number
  onReenviar: () => void
  reenviando: boolean
  /** Opciones extra entre el código y el botón (p. ej. "recordar dispositivo"). */
  children?: ReactNode
}

/**
 * Paso "escribe el código que te enviamos": casillas, botón Verificar y reenvío
 * con cuenta regresiva. Verifica con el botón o con Enter (nunca solo).
 */
export function PasoCodigo({
  codigo,
  onCodigo,
  onVerificar,
  verificando,
  segundos,
  onReenviar,
  reenviando,
  children,
}: PasoCodigoProps) {
  return (
    <div className="space-y-4">
      <EntradaCodigo
        valor={codigo}
        onCambio={onCodigo}
        onEnter={() => {
          if (codigo.length === 6 && !verificando) onVerificar()
        }}
      />
      {children}
      <Button
        type="button"
        size="lg"
        className={cn(botonAcceso)}
        disabled={codigo.length !== 6 || verificando}
        onClick={onVerificar}
      >
        {verificando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verificando...
          </>
        ) : (
          <>Verificar</>
        )}
      </Button>
      <p className="text-center text-mini text-muted-foreground">
        ¿No recibiste el código?{" "}
        {segundos > 0 ? (
          <span className="font-semibold text-foreground">
            Reenviar código ({formatearContador(segundos)})
          </span>
        ) : (
          <button
            type="button"
            onClick={onReenviar}
            disabled={reenviando}
            className="font-semibold text-brand-info hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reenviando ? "Reenviando..." : "Reenviar código"}
          </button>
        )}
      </p>
    </div>
  )
}

/** Cuenta regresiva del reenvío: descuenta solo mientras `activo`. */
export function useCuentaRegresiva(
  activo: boolean,
  segundos: number,
  setSegundos: (fn: (s: number) => number) => void
) {
  useEffect(() => {
    if (!activo || segundos <= 0) return
    const id = window.setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [activo, segundos, setSegundos])
}
