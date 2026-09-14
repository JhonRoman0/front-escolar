"use client"

import { useAuth } from "@/components/auth-provider"

// ¿Puede el usuario actual hacer `accion` (CREAR/ACTUALIZAR/ELIMINAR/...)
// sobre el permiso `permisoCodigo` (USUARIOS, ROLES, DOCENTES, ...)?
// Admin → siempre. Otros roles → se busca en permisos.modulos del login.
export function usePuede(permisoCodigo: string, accion: string): boolean {
  const { esAdmin, permisos } = useAuth()
  if (esAdmin) return true
  const permiso = permisos?.modulos
    .flatMap((m) => m.permisos)
    .find((p) => p.codigo === permisoCodigo)
  return permiso?.accionesConcedidas.includes(accion) ?? false
}

// ¿Puede escribir (crear/actualizar/eliminar) en ese permiso?
export function usePuedeEscritura(permisoCodigo: string): boolean {
  const puedeCrear = usePuede(permisoCodigo, "CREAR")
  const puedeActualizar = usePuede(permisoCodigo, "ACTUALIZAR")
  const puedeEliminar = usePuede(permisoCodigo, "ELIMINAR")
  return puedeCrear || puedeActualizar || puedeEliminar
}

// ¿Puede leer? El back otorga el GET al tener el permiso asignado
// (aunque sus accionesConcedidas estén vacías). Útil para mostrar pestañas.
export function usePuedeLeer(permisoCodigo: string): boolean {
  const { esAdmin, permisos } = useAuth()
  if (esAdmin) return true
  return !!permisos?.modulos
    .flatMap((m) => m.permisos)
    .some((p) => p.codigo === permisoCodigo)
}