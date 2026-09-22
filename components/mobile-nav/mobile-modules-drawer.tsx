"use client"

import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { useMenuItems } from "@/hooks/use-menu-items"

interface MobileModulesDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileModulesDrawer({
  isOpen,
  onClose,
}: MobileModulesDrawerProps) {
  const { usuario } = useAuth()
  const { items } = useMenuItems()
  const router = useRouter()

  if (!usuario) return null

  function handleNavegar(url: string) {
    onClose()
    router.push(url)
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
        <div className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-background p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Módulos
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.url}
                  onClick={() => handleNavegar(item.url)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.nombre}</span>
                </button>
              )
            })}
            {!items.length && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No tienes módulos asignados.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}