import Link from "next/link"
import Image from "next/image"

import { RestablecerContrasenaForm } from "@/components/portal/public/restablecer-contrasena-form"
import { ThemeToggle } from "@/components/theme-toggle"

export default function RestablecerContrasenaPage() {
  return (
    <div className="flex min-h-dvh dark:bg-[#0a1626]">
      <div className="order-last flex w-full items-center justify-center bg-white p-6 sm:p-10 lg:order-first lg:w-1/2 lg:p-28 dark:bg-[#101f36]">
        <div className="w-full max-w-md space-y-6">
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

          <div className="space-y-2">
            <h1 className="text-[32px] font-bold text-foreground">
              Restablecer contraseña
            </h1>
            <p className="text-[16px] text-[#7D7D7F]">
              Ingresa el token recibido por correo y tu nueva contraseña.
            </p>
          </div>

          <RestablecerContrasenaForm />

          <div className="text-center text-[15px]">
            <Link
              href="/login"
              className="font-semibold text-[#3A62D4] hover:underline"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </div>

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
