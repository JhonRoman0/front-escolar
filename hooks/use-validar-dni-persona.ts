"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { REGEX_DNI } from "@/lib/schemas/comun"

/** Comprobación interna compartida: no almacena permisos ni resultados definitivos. */
export function useValidarDniPersona({ validar, original, abierta = true, onError, onValido }: {
  validar: (dni: string) => Promise<unknown>
  original?: string | null
  abierta?: boolean
  onError: (mensaje: string) => void
  onValido: () => void
}) {
  const version = useRef(0)
  const pendiente = useRef<{ dni: string; version: number; promesa: Promise<boolean> } | null>(null)
  const [comprobando, setComprobando] = useState(false)
  const invalidar = useCallback(() => {
    version.current++
    pendiente.current = null
    setComprobando(false)
  }, [])
  const capturarVigencia = () => {
    const solicitud = version.current
    return () => solicitud === version.current
  }

  useEffect(() => () => { version.current++ }, [abierta, original])

  async function comprobar(dni: string, forzar = false): Promise<boolean> {
    if (!REGEX_DNI.test(dni) || !abierta) return false
    if (!forzar && dni === original) return true
    if (pendiente.current?.dni === dni && pendiente.current.version === version.current) return pendiente.current.promesa
    const solicitud = version.current
    setComprobando(true)
    const promesa = (async () => {
      try {
        await Promise.resolve().then(() => validar(dni))
        if (solicitud !== version.current) return false
        onValido()
        return true
      } catch (error) {
        if (solicitud === version.current) onError(error instanceof Error ? error.message : "No se pudo comprobar el DNI en el colegio. Reintenta.")
        return false
      } finally {
        if (solicitud === version.current) {
          pendiente.current = null
          setComprobando(false)
        }
      }
    })()
    pendiente.current = { dni, version: solicitud, promesa }
    return promesa
  }

  return { comprobar, invalidar, comprobando, capturarVigencia }
}
