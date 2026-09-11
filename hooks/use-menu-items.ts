"use client"

import { useAuth } from "@/components/auth-provider"
import { useModulos } from "@/hooks/use-modulos"
import { construirItemsModulos, type ModuloMenuItem } from "@/lib/modulos"

// Módulos accesibles para el usuario actual:
// - Admin → todos (GET /modulos)
// - Otros roles → solo los de permisos.modulos del login
export function useMenuItems(): { items: ModuloMenuItem[]; cargando: boolean } {
  const { permisos, esAdmin } = useAuth()
  const { data: modulosAdmin, isLoading } = useModulos(esAdmin)

  let items: ModuloMenuItem[] = []
  if (esAdmin) {
    if (modulosAdmin) items = construirItemsModulos(modulosAdmin)
  } else if (permisos?.modulos) {
    items = construirItemsModulos(permisos.modulos)
  }

  return { items, cargando: esAdmin && isLoading }
}