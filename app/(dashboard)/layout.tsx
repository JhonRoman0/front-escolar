"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import AppSidebar from "@/components/sidebar/app-sidebar"
import SiteHeader from "@/components/sidebar/site-header"
import MobileBottomBar from "@/components/mobile-nav/mobile-bottom-bar"
import { useAuth } from "@/components/auth-provider"
import { useMenuItems } from "@/hooks/use-menu-items"
import { RUTAS_MODULOS } from "@/lib/modulos"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario } = useAuth()
  const { items, cargando } = useMenuItems()
  const pathname = usePathname()
  const router = useRouter()

  // ¿Pertenece esta ruta a un módulo que el usuario puede abrir?
  const permitido =
    pathname === "/" ||
    items.some(
      (item) => pathname === item.url || pathname.startsWith(item.url + "/")
    )

  // ¿Es una ruta de módulo CONOCIDA pero no autorizada? → /sin-acceso
  const esRutaConocida = RUTAS_MODULOS.some(
    (url) => pathname === url || pathname.startsWith(url + "/")
  )

  useEffect(() => {
    if (!usuario || cargando) return
    if (!permitido && esRutaConocida) {
      router.replace("/sin-acceso")
    }
  }, [usuario, cargando, permitido, esRutaConocida, router, pathname])

  if (!usuario) return null
  if (!permitido && esRutaConocida && !cargando) return null

  return (
    <div className="mr-2 flex flex-row">
      <SidebarProvider>
        {/* Sidebar solo en desktop */}
        <div className="hidden md:block">
          <AppSidebar variant="floating" />
        </div>

        <SidebarInset className="flex flex-col gap-5">
          <SiteHeader />
          <main className="mx-auto w-full max-w-8xl p-4 pb-24 md:pb-0">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* Bottom bar solo en móvil */}
      <MobileBottomBar />
    </div>
  )
}