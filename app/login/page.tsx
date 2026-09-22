import Image from "next/image"
import Link from "next/link"

import { LoginForm } from "@/components/form-login"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
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
              <h2 className="text-[30px] font-bold text-black/20">Sistema Escolar</h2>
            </div>
            <ThemeToggle />
          </div>

          {/* Encabezado */}
          <div className="space-y-2">
            <h1 className="text-[40px] font-bold text-foreground">
              ¡Bienvenido!
            </h1>
            <p className="text-[18px] font-semibold text-[#7D7D7F]">
              Ingresa con tu código institucional para empezar
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Pie informativo */}
          <div className="text-center text-[17px]">
            <Link
              href="/recuperar-contrasena"
              className="font-semibold text-[#3A62D4] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>

      {/* Ilustración - en mobile arriba (banner), en desktop derecha */}
      <div className="order-first flex w-full items-center justify-center bg-[#E1E7F9] p-8 lg:order-last lg:w-1/2 lg:p-12 dark:bg-[#101f36]">
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