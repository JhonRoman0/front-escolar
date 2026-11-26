"use client"

import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { useMenuItems } from "@/hooks/use-menu-items"
import { Separator } from "@/components/ui/separator"
import { PANEL_CONTROL } from "@/lib/navegacion"
import { cn } from "@/lib/utils"

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
  const pathname = usePathname()

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
        <div
          className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-background p-2 shadow-lg"
          style={{
            maxHeight: "calc(100dvh - 9rem - env(safe-area-inset-bottom))",
            overflowY: "auto",
          }}
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleNavegar(PANEL_CONTROL.url)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted",
                pathname === PANEL_CONTROL.url &&
                  "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              )}
              aria-current={pathname === PANEL_CONTROL.url ? "page" : undefined}
            >
              <PANEL_CONTROL.icon
                className={cn(
                  "h-5 w-5 text-muted-foreground",
                  pathname === PANEL_CONTROL.url &&
                    "text-sidebar-accent-foreground"
                )}
              />
              <span className="text-sm font-medium">{PANEL_CONTROL.nombre}</span>
            </button>

            <Separator className="my-1" />

            <div className="px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Módulos
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {items.map((item) => {
                const Icon = item.icon
                const activo =
                  pathname === item.url || pathname.startsWith(`${item.url}/`)

                return (
                  <button
                    key={item.url}
                    onClick={() => handleNavegar(item.url)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted",
                      activo &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    )}
                    aria-current={activo ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 text-muted-foreground",
                        activo && "text-sidebar-accent-foreground"
                      )}
                    />
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
      </div>
    </>
  )
}