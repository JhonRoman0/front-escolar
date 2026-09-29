"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

interface MobileUserMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileUserMenu({ isOpen, onClose }: MobileUserMenuProps) {
  const { usuario, logout } = useAuth()
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  if (!usuario) return null

  const nombreCompleto = `${usuario.nombre} ${usuario.apellidoPat}`.trim()
  const rol = usuario.roles[0]?.nombre ?? "Usuario"

  const partes = nombreCompleto.split(" ")
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

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/30 md:hidden"
        onClick={onClose}
      />

      {/* Panel flotante encima del bottom bar */}
      <div
        className="fixed left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200 md:hidden"
        style={{ bottom: "calc(7rem + env(safe-area-inset-bottom))" }}
      >
        <div className="w-[calc(100vw-2rem)] max-w-sm space-y-3 rounded-2xl border bg-background p-3 shadow-lg">
          {/* Info del usuario */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
            <Avatar>
              <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{nombreCompleto}</p>
              <p className="truncate text-xs text-muted-foreground">{rol}</p>
            </div>
          </div>

          {/* Botón logout */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={cerrandoSesion}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </div>
    </>
  )
}