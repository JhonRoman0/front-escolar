"use client"

import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import MenuModules from "@/components/sidebar/menu-modules"
import NavUser from "@/components/sidebar/nav-user"
import { useAuth } from "@/components/auth-provider"
import { MarcaInstitucional } from "@/components/shared/marca-institucional"
import { useIdentidadInstitucional } from "@/hooks/use-colegio"
import { useMenuItems } from "@/hooks/use-menu-items"
import { NOMBRE_SISTEMA, PANEL_CONTROL } from "@/lib/navegacion"

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { usuario } = useAuth()
  const { items } = useMenuItems()
  const { data: identidad } = useIdentidadInstitucional()

  if (!usuario) return null

  const userData = {
    name: `${usuario.nombre} ${usuario.apellidoPat}`.trim(),
    role: usuario.roles[0]?.nombre ?? "Usuario",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Mismo patrón que MenuModules: el Link entra por `render` para que el
                botón y el enlace sean un solo elemento clickeable. */}
            <SidebarMenuButton
              size="lg"
              render={<Link href={PANEL_CONTROL.url} />}
              tooltip={identidad?.nombre?.trim() || NOMBRE_SISTEMA}
            >
              <MarcaInstitucional variant="sidebar" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <MenuModules items={items} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}