import Link from "next/link"

import { LoginForm } from "@/components/form-login"
import { LayoutAcceso } from "@/components/shared/layout-acceso"

export default function LoginPage() {
  return (
    <LayoutAcceso
      titulo={
        <h1 className="text-[40px] font-bold text-foreground">¡Bienvenido!</h1>
      }
      descripcion={
        <p className="text-[18px] font-semibold text-[#7D7D7F]">
          Ingresa con tu código institucional para empezar
        </p>
      }
      pie={
        <div className="text-center text-[17px]">
          <Link
            href="/recuperar-contrasena"
            className="font-semibold text-brand-info hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      }
    >
      <LoginForm />
    </LayoutAcceso>
  )
}