"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Bell, CircleUserRound, EllipsisVertical, LogOut } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth-provider"

interface NavUserProps {
  user: {
    name: string
    role: string
    avatar?: string
  }
}

export default function NavUser({ user }: NavUserProps) {
  const { logout } = useAuth()
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const partes = user.name.split(" ")
  const fallback =
    partes.length >= 2
      ? partes[0][0].concat(partes[1][0])
      : partes[0].slice(0, 2)

  function handleLogout() {
    if (cerrandoSesion) return
    setCerrandoSesion(true)
    try {
      logout()
    } catch (error) {
      console.warn("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
      setCerrandoSesion(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar>
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate text-[13px] font-medium font-[family-name:var(--font-sidebar)]">{user.name}</span>
              <span className="truncate text-[12px] font-normal text-[#7D7D7F] font-[family-name:var(--font-sidebar)]">
                {user.role}
              </span>
            </div>
            <EllipsisVertical className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-[13px] font-medium font-[family-name:var(--font-sidebar)]">{user.name}</span>
                    <span className="truncate text-[12px] font-normal text-[#7D7D7F] font-[family-name:var(--font-sidebar)]">
                      {user.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUserRound />
                Cuenta
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notificaciones
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={cerrandoSesion}
              variant="destructive"
              className="cursor-pointer"
            >
              <LogOut />
              {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}