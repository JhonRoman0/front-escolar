"use client"

import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { useMenuItems } from "@/hooks/use-menu-items"
import { PANEL_CONTROL } from "@/lib/navegacion"

const TITULOS: Record<string, string> = {
  [PANEL_CONTROL.url]: PANEL_CONTROL.nombre,
  "/cuenta": "Cuenta",
  "/seguridad": "Seguridad",
  "/academico": "Académico",
  "/estudiantes": "Estudiantes",
  "/matricula": "Matrícula",
  "/evaluacion": "Evaluación",
  "/portal": "Portal",
  "/colegio": "Colegio",
  "/asistencia": "Asistencia",
}

export default function SiteHeader() {
  const pathname = usePathname()
  const { items } = useMenuItems()
  const modulo = items.find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))

  const pageTitle = TITULOS[pathname] ?? modulo?.nombre ?? PANEL_CONTROL.nombre

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2">
        {/* Trigger del sidebar: solo en desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2" />
        </div>

        <h1 className="text-base font-medium">{pageTitle}</h1>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}