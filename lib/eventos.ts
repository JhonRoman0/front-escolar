import { ApiError, apiFetch } from "@/lib/api"
import {
  EVENTO_SESION_BLOQUEADA,
  sesionBloqueada,
} from "@/lib/sesion-bloqueada"
import { esEstadoVigenciaBloqueante } from "@/lib/vigencia"

/**
 * Avisos en vivo del servidor (Server-Sent Events): cuando alguien guarda algo,
 * llegan los módulos que cambiaron para recargar lo que está en pantalla.
 *
 * - EventSource manda la cookie de sesión sola (withCredentials para el local,
 *   donde el front y la API están en puertos distintos).
 * - Cortes breves: EventSource reintenta solo cada 2 s (retry que manda el server).
 * - Si queda cerrado (502/504 de un despliegue, backend caído, sesión vencida):
 *   espera creciente 2, 4, 8… hasta 30 s. Antes de cada intento verifica la
 *   sesión: si es 401 se detiene (apiFetch ya cierra la sesión); si es otro
 *   error, sigue intentando.
 */
export interface OyenteCambios {
  onCambios: (modulos: string[]) => void
  /** Volvió la conexión: pudo perderse algún aviso, conviene recargar. */
  onReconectado: () => void
  /** Cambió algo de la cuenta (inicio de sesión o dispositivo quitado). */
  onCuenta?: () => void
}

const ESPERA_INICIAL_MS = 2_000
const ESPERA_MAXIMA_MS = 30_000

let conectado = false

/** Si hay conexión de avisos abierta (sin ella se vuelve a consultar al volver a la pestaña). */
export function avisosConectados() {
  return conectado
}

export function escucharCambios(oyente: OyenteCambios): () => void {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base || typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {}
  }

  let fuente: EventSource | null = null
  let temporizador: number | undefined
  let espera = ESPERA_INICIAL_MS
  let detenido = false
  let yaConecto = false

  function abrir() {
    if (detenido) return
    fuente = new EventSource(`${base}/eventos`, { withCredentials: true })
    fuente.onopen = () => {
      conectado = true
      espera = ESPERA_INICIAL_MS
      if (yaConecto) oyente.onReconectado()
      yaConecto = true
    }
    fuente.addEventListener("cambios", (e) => {
      try {
        const { modulos } = JSON.parse((e as MessageEvent<string>).data) as { modulos?: unknown }
        if (Array.isArray(modulos)) oyente.onCambios(modulos.filter((m): m is string => typeof m === "string"))
      } catch {
        // Aviso mal formado: se ignora.
      }
    })
    fuente.addEventListener("cuenta", () => oyente.onCuenta?.())
    fuente.onerror = () => {
      conectado = false
      // CONNECTING: EventSource reintenta solo. CLOSED: no vuelve; reintento a mano.
      if (fuente?.readyState === EventSource.CLOSED) {
        fuente.close()
        fuente = null
        reintentar()
      }
    }
  }

  function reintentar() {
    if (detenido) return
    const ahora = espera + Math.random() * 1000 // que no reconecten todos a la vez
    espera = Math.min(espera * 2, ESPERA_MAXIMA_MS)
    temporizador = window.setTimeout(async () => {
      if (detenido) return
      try {
        const sesion = await apiFetch<{ estadoVigencia?: string | null }>("/auth/me")
        if (sesionBloqueada() || esEstadoVigenciaBloqueante(sesion?.estadoVigencia)) {
          detenido = true
          return
        }
        abrir()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          detenido = true // sesión vencida: apiFetch ya llevó al inicio de sesión
          return
        }
        reintentar() // 502, 504, sin red…: se sigue intentando
      }
    }, ahora)
  }

  function detener() {
    detenido = true
    window.clearTimeout(temporizador)
    fuente?.close()
    fuente = null
    conectado = false
  }

  window.addEventListener(EVENTO_SESION_BLOQUEADA, detener)
  abrir()
  return () => {
    window.removeEventListener(EVENTO_SESION_BLOQUEADA, detener)
    detener()
  }
}
