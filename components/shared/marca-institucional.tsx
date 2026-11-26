"use client"

import { School } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { useIdentidadInstitucional } from "@/hooks/use-colegio"
import { NOMBRE_SISTEMA } from "@/lib/navegacion"
import { cn } from "@/lib/utils"

export function MarcaInstitucional({
  variant = "acceso",
  className,
}: {
  variant?: "sidebar" | "acceso"
  className?: string
}) {
  const { data: identidad } = useIdentidadInstitucional()
  const [logoConError, setLogoConError] = useState<string | null>(null)
  const logoUrl = identidad?.logoUrl?.trim() || null
  const nombre = identidad?.nombre?.trim() || NOMBRE_SISTEMA
  const esSidebar = variant === "sidebar"

  const mostrarLogo = !!logoUrl && logoConError !== logoUrl
  const tamanoLogo = esSidebar
    ? "h-6 w-6 rounded-lg"
    : "h-14 w-14 rounded-xl sm:h-[70px] sm:w-[70px]"
  const tamanoNombre = esSidebar
    ? "truncate select-none text-sm font-semibold font-[family-name:var(--font-sidebar)] text-black/20 dark:text-foreground/20"
    : "break-words text-label font-bold leading-tight text-foreground/20 sm:text-subtitulo"

  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        esSidebar ? "gap-2" : "gap-2 sm:gap-3",
        className
      )}
    >
      {mostrarLogo ? (
        <Image
          src={logoUrl}
          alt="Logo del colegio"
          width={esSidebar ? 24 : 70}
          height={esSidebar ? 24 : 70}
          unoptimized
          priority={!esSidebar}
          className={cn(tamanoLogo, "shrink-0 object-contain")}
          onError={() => setLogoConError(logoUrl)}
        />
      ) : (
        <span
          className={cn(
            tamanoLogo,
            "flex shrink-0 items-center justify-center bg-muted text-black/20 dark:text-foreground/20"
          )}
          aria-hidden="true"
        >
          <School className={esSidebar ? "h-4 w-4" : "h-8 w-8 sm:h-10 sm:w-10"} />
        </span>
      )}
      <span title={nombre} className={cn("min-w-0", tamanoNombre)}>
        {nombre}
      </span>
    </div>
  )
}
