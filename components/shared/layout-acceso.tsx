import Image from "next/image"
import type { ReactNode } from "react"

import { MarcaInstitucional } from "@/components/shared/marca-institucional"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Esqueleto común de las páginas públicas de acceso: login y recuperar contraseña.
 * En móvil y tablet muestra una sola columna sin panel decorativo; desde `lg` se
 * conserva el diseño original de dos mitades con la ilustración a la derecha.
 *
 * `titulo`, `descripcion` y `pie` reciben el elemento ya maquetado, no texto plano,
 * porque cada página usa su propio tamaño de encabezado y de enlace inferior.
 * El formulario va como hijo para que el orden de lectura siga siendo explícito.
 */
export function LayoutAcceso({
  titulo,
  descripcion,
  children,
  pie,
}: {
  titulo: ReactNode
  descripcion: ReactNode
  children: ReactNode
  pie?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row dark:bg-background">
      {/* Formulario: una columna hasta `lg`; en escritorio vuelve a la izquierda */}
      <div className="flex w-full min-w-0 flex-1 items-center justify-center bg-background p-6 sm:p-10 lg:order-first lg:w-1/2 lg:px-10 lg:py-16 xl:px-20 xl:py-28 dark:bg-card">
        <div className="w-full min-w-0 max-w-md space-y-5 sm:space-y-6">
          {/* Brand + toggle de tema */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <MarcaInstitucional variant="acceso" />
            <ThemeToggle />
          </div>

          {/* Encabezado */}
          <div className="space-y-2 break-words">
            {titulo}
            {descripcion}
          </div>

          {/* Form */}
          {children}

          {/* Pie informativo */}
          {pie}
        </div>
      </div>

      {/* Ilustración: solo en escritorio, en la derecha */}
      <div className="hidden w-full min-w-0 items-center justify-center bg-brand-subtle p-8 lg:order-last lg:flex lg:w-1/2 lg:p-12 dark:bg-card">
        <Image
          src="/login-ilustration.svg"
          alt="Ilustración de estudiantes"
          width={570}
          height={514}
          priority
          className="h-auto max-h-40 w-full object-contain lg:max-h-full"
        />
      </div>
    </div>
  )
}