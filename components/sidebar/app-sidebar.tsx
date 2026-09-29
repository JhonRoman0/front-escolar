"use client"

import Image from "next/image"
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
import { useMenuItems } from "@/hooks/use-menu-items"

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { usuario } = useAuth()
  const { items } = useMenuItems()

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
            <SidebarMenuButton size="lg">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo-colegio.jpg"
                  alt="Logo del colegio"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-lg object-cover"
                />
                <span className="select-none text-base font-semibold text-black/20 font-[family-name:var(--font-sidebar)]">
                  Sistema Escolar
                </span>
              </Link>
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