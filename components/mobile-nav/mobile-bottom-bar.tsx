"use client"

import { useState } from "react"
import { Menu, User, X } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import MobileModulesDrawer from "@/components/mobile-nav/mobile-modules-drawer"
import MobileUserMenu from "@/components/mobile-nav/mobile-user-menu"

export default function MobileBottomBar() {
  const { usuario } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  if (!usuario) return null

  return (
    <>
      {/* Bottom bar flotante */}
      <div
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          {/* Botón hamburger */}
          <button
            onClick={() => {
              setDrawerOpen(!drawerOpen)
              setUserMenuOpen(false)
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label="Abrir menú"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Botón usuario */}
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setDrawerOpen(false)
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label="Abrir menú de usuario"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Drawer de módulos */}
      <MobileModulesDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Menú de usuario */}
      <MobileUserMenu
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
      />
    </>
  )
}