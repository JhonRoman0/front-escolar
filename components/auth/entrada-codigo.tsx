"use client"

import { useRef } from "react"

import { Input } from "@/components/ui/input"

interface EntradaCodigoProps {
  valor: string
  onCambio: (valor: string) => void
  largo?: number
}

/**
 * Entrada de código de verificación: N casillas de un dígito. Solo números,
 * avance automático al escribir, Backspace retrocede, permitir pegar el código
 * completo y navegación por teclado accesible (role="group" + aria-label por
 * casilla). Controlado: el valor vive en el padre y se compone de dígitos.
 */
export function EntradaCodigo({ valor, onCambio, largo = 6 }: EntradaCodigoProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function enfocar(indice: number) {
    refs.current[Math.min(Math.max(indice, 0), largo - 1)]?.focus()
  }

  function manejarCambio(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const dato = e.target.value.replace(/\D/g, "").slice(-1)
    const actual = (valor + "").split("")
    if (dato) {
      actual[i] = dato
      if (i < largo - 1) enfocar(i + 1)
    } else {
      actual[i] = ""
    }
    onCambio(actual.join(""))
  }

  function manejarTecla(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !valor[i] && i > 0) {
      enfocar(i - 1)
    }
  }

  function manejarPegado(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, largo)
    if (!texto) return
    onCambio(texto)
    enfocar(texto.length - 1)
  }

  return (
    <div
      role="group"
      aria-label="Código de verificación"
      className="flex justify-center gap-2"
    >
      {Array.from({ length: largo }, (_, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={valor[i] ?? ""}
          onChange={(e) => manejarCambio(i, e)}
          onKeyDown={(e) => manejarTecla(i, e)}
          onPaste={manejarPegado}
          aria-label={`Dígito ${i + 1}`}
          className="h-12 w-11 rounded-xl text-center text-lg font-semibold focus-visible:ring-brand-info"
        />
      ))}
    </div>
  )
}