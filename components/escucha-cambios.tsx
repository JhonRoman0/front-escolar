"use client"

import { useEffect } from "react"
import { useQueryClient, type Query } from "@tanstack/react-query"

import { escucharCambios } from "@/lib/eventos"
import { CLAVE_DISPOSITIVOS } from "@/lib/api/auth"

/** Esperar un poco junta varios avisos seguidos (p. ej. la portería) en una sola recarga. */
const AGRUPAR_MS = 1_500

/** Lo que se ve afectado por la asistencia: el resto de módulos invalida todo. */
const CLAVES_ASISTENCIA = new Set(["asistencias", "asistencia-estadisticas", "dashboard", "portal-apoderado"])
/** Cambios en Accesos: además se revisan los permisos del usuario. */
const MODULOS_PERMISOS = new Set(["roles-permiso", "roles", "usuarios", "permisos", "acciones", "modulos"])

/** Módulos que pueden cambiar los datos de una cuenta (nombre, correo, roles, foto). */
const MODULOS_CUENTA = new Set(["usuarios", "roles", "docentes", "apoderados", "matriculas"])

/** Evento que escucha el AuthProvider para revisar los permisos al momento. */
export const EVENTO_REVISAR_PERMISOS = "escolar:revisar-permisos"
/** Evento que escucha el AuthProvider para volver a pedir los datos del usuario. */
export const EVENTO_REVISAR_CUENTA = "escolar:revisar-cuenta"

/**
 * Mantiene la conexión de avisos mientras hay sesión. Al llegar un cambio, marca
 * como desactualizado lo relacionado y se recarga solo lo que está en pantalla.
 */
export function EscuchaCambios() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let pendientes = new Set<string>()
    let temporizador: number | undefined

    function aplicar() {
      const modulos = pendientes
      pendientes = new Set()
      const soloAsistencia = [...modulos].every((m) => m === "asistencias")
      void queryClient.invalidateQueries(
        soloAsistencia
          ? { predicate: (q: Query) => CLAVES_ASISTENCIA.has(String(q.queryKey[0])) }
          : undefined,
      )
      if ([...modulos].some((m) => MODULOS_PERMISOS.has(m))) {
        window.dispatchEvent(new Event(EVENTO_REVISAR_PERMISOS))
      }
      if ([...modulos].some((m) => MODULOS_CUENTA.has(m))) {
        window.dispatchEvent(new Event(EVENTO_REVISAR_CUENTA))
      }
    }

    const detener = escucharCambios({
      onCambios: (modulos) => {
        modulos.forEach((m) => pendientes.add(m))
        window.clearTimeout(temporizador)
        temporizador = window.setTimeout(aplicar, AGRUPAR_MS)
      },
      // Mientras estuvo desconectado pudo cambiar algo: se recarga lo que está en pantalla.
      onReconectado: () => void queryClient.invalidateQueries(),
      // Aviso solo para este usuario: recarga sus dispositivos y revisa su cuenta
      // (si este dispositivo fue quitado, /auth/me responde 401 y se vuelve al login).
      onCuenta: () => {
        void queryClient.invalidateQueries({ queryKey: CLAVE_DISPOSITIVOS })
        window.dispatchEvent(new Event(EVENTO_REVISAR_CUENTA))
      },
    })
    return () => {
      window.clearTimeout(temporizador)
      detener()
    }
  }, [queryClient])

  return null
}
