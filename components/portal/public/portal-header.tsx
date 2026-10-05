"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useColegioPublico } from "@/hooks/use-portal"
import { useTheme } from "next-themes"

const NAV_LINKS = [
  { href: "/portal", label: "Inicio" },
  { href: "/portal/publicaciones", label: "Publicaciones" },
  { href: "/portal/eventos", label: "Eventos" },
  { href: "/portal/galerias", label: "Galería" },
  { href: "/portal/contacto", label: "Contacto" },
  { href: "/portal/colegio", label: "Info Colegio" },
]

export function PortalHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: colegio } = useColegioPublico()
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-[#004497] text-white shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo + nombre */}
        <Link href="/portal" className="flex items-center gap-3">
          {colegio?.urlFoto ? (
            <img
              src={colegio.urlFoto}
              alt={colegio.nombre}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
              {colegio?.nombre?.charAt(0) ?? "C"}
            </div>
          )}
          <span className="text-lg font-bold tracking-tight">
            {colegio?.nombre ?? "Colegio"}
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>
        </nav>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/10 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-white/10 bg-[#003377] px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-white hover:bg-white/10 hover:text-white"
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark")
              setMobileOpen(false)
            }}
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" /> Modo claro
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" /> Modo oscuro
              </>
            )}
          </Button>
        </nav>
      )}
    </header>
  )
}
