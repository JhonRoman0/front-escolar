"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface MenuModulesProps {
  items: {
    nombre: string
    url: string
    icon: React.ElementType
  }[]
}

export default function MenuModules({ items }: MenuModulesProps) {
  const pathname = usePathname()
  if (!items.length) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[12px] font-normal text-[#7D7D7F] font-[family-name:var(--font-sidebar)]">
        Módulos
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map(({ nombre, url, icon: Icon }) => {
          const isActive = pathname === url || pathname.startsWith(url + "/")
          return (
            <SidebarMenuItem key={nombre}>
              {/* El Link va por prop `render` y no envolviendo al botón: anidar un
                  <a> alrededor de un <button> deja el botón fuera de la caja del
                  enlace, así que el cursor y el hover caían en elementos distintos. */}
              <SidebarMenuButton render={<Link href={url} />} isActive={isActive}>
                <Icon />
                <span className="font-[family-name:var(--font-sidebar)]">{nombre}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}