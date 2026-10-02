import Image from "next/image"
import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Esqueleto común de las páginas públicas de acceso: login, recuperar contraseña
 * y restablecer contraseña. Colapsa en una sola columna, con el formulario arriba
 * y la ilustración como banner; en escritorio se parten en dos mitades.
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
    <div className="flex min-h-dvh dark:bg-[#0a1626]">
      {/* Form - en mobile abajo, en desktop izquierda */}
      <div className="order-last flex w-full items-center justify-center bg-white p-6 sm:p-10 lg:order-first lg:w-1/2 lg:p-28 dark:bg-[#101f36]">
        <div className="w-full max-w-md space-y-6">
          {/* Brand + toggle de tema */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-colegio.jpg"
                alt="Logo del colegio"
                width={70}
                height={70}
                priority
                className="h-[70px] w-[70px] rounded-xl object-cover"
              />
              <h2 className="text-[30px] font-bold text-black/20">
                Sistema Escolar
              </h2>
            </div>
            <ThemeToggle />
          </div>

          {/* Encabezado */}
          <div className="space-y-2">
            {titulo}
            {descripcion}
          </div>

          {/* Form */}
          {children}

          {/* Pie informativo */}
          {pie}
        </div>
      </div>

      {/* Ilustración - en mobile arriba (banner), en desktop derecha */}
      <div className="order-first flex w-full items-center justify-center bg-brand-subtle p-8 lg:order-last lg:w-1/2 lg:p-12 dark:bg-card">
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