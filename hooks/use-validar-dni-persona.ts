"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { REGEX_DNI } from "@/lib/schemas/comun"

type ContextoDni = { original?: string | null; abierta: boolean }
type CargaDni = { contexto: ContextoDni; comprobacion: symbol | null; busqueda: symbol | null }

/** Comprobación interna compartida: no almacena permisos ni resultados definitivos. */
export function useValidarDniPersona({ validar, original, abierta = true, onError, onValido }: {
  validar: (dni: string) => Promise<unknown>
  original?: string | null
  abierta?: boolean
  onError: (mensaje: string) => void
  onValido: () => void
}) {
  const [carga, setCarga] = useState<CargaDni>(() => ({
    contexto: { original, abierta }, comprobacion: null, busqueda: null,
  }))
  let contexto = carga.contexto
  // Ajustar el estado propio al cambiar propiedades evita revivir cargas al reabrir.
  if (contexto.original !== original || contexto.abierta !== abierta) {
    contexto = { original, abierta }
    setCarga({ contexto, comprobacion: null, busqueda: null })
  }
  const contextoActivo = useRef<ContextoDni | null>(null)
  const version = useRef(0)
  const pendiente = useRef<{ dni: string; version: number; id: symbol; promesa: Promise<boolean> } | null>(null)
  const busqueda = useRef<symbol | null>(null)
  const descartarPendientes = useCallback(() => {
    version.current++
    pendiente.current = null
    busqueda.current = null
  }, [])

  useLayoutEffect(() => {
    contextoActivo.current = contexto
    return () => {
      contextoActivo.current = null
      descartarPendientes()
    }
  }, [contexto, descartarPendientes])

  const invalidar = useCallback(() => {
    descartarPendientes()
    setCarga((anterior) => ({ ...anterior, comprobacion: null, busqueda: null }))
  }, [descartarPendientes])
  const capturarVigencia = () => {
    const solicitud = version.current
    return () => contextoActivo.current === contexto && contexto.abierta && solicitud === version.current
  }

  async function comprobar(dni: string, forzar = false): Promise<boolean> {
    if (!REGEX_DNI.test(dni) || !contexto.abierta || contextoActivo.current !== contexto) return false
    if (!forzar && dni === original) return true
    if (pendiente.current?.dni === dni && pendiente.current.version === version.current) return pendiente.current.promesa
    const solicitud = version.current
    const id = Symbol()
    const vigente = () => contextoActivo.current === contexto && solicitud === version.current && pendiente.current?.id === id
    setCarga((anterior) => ({ ...anterior, comprobacion: id }))
    const promesa = (async () => {
      try {
        await Promise.resolve().then(() => validar(dni))
        if (!vigente()) return false
        onValido()
        return true
      } catch (error) {
        if (vigente()) onError(error instanceof Error ? error.message : "No se pudo comprobar el DNI en el colegio. Reintenta.")
        return false
      } finally {
        if (vigente()) {
          pendiente.current = null
          setCarga((anterior) => anterior.comprobacion === id ? { ...anterior, comprobacion: null } : anterior)
        }
      }
    })()
    pendiente.current = { dni, version: solicitud, id, promesa }
    return promesa
  }

  async function ejecutarBusqueda(tarea: (sigueVigente: () => boolean) => Promise<void>): Promise<void> {
    if (contextoActivo.current !== contexto || !contexto.abierta || busqueda.current) return
    const id = Symbol()
    const sigueContexto = capturarVigencia()
    const vigente = () => sigueContexto() && busqueda.current === id
    busqueda.current = id
    setCarga((anterior) => ({ ...anterior, busqueda: id }))
    try {
      await tarea(vigente)
    } finally {
      if (vigente()) {
        busqueda.current = null
        setCarga((anterior) => anterior.busqueda === id ? { ...anterior, busqueda: null } : anterior)
      }
    }
  }

  return {
    comprobar, invalidar, capturarVigencia, ejecutarBusqueda,
    comprobando: carga.contexto === contexto && abierta && carga.comprobacion !== null,
    buscando: carga.contexto === contexto && abierta && carga.busqueda !== null,
  }
}
