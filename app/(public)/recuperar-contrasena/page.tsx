import Link from "next/link"

import { RecuperarContrasenaForm } from "@/components/portal/public/recuperar-contrasena-form"
import { LayoutAcceso } from "@/components/shared/layout-acceso"

export default function RecuperarContrasenaPage() {
  return (
    <LayoutAcceso
      titulo={
        <h1 className="text-[32px] font-bold text-foreground">
          Recuperar contraseña
        </h1>
      }
      descripcion={
        <p className="text-[16px] text-[#7D7D7F]">
          Ingresa tu correo electrónico y te enviaremos las instrucciones para
          restablecer tu contraseña.
        </p>
      }
      pie={
        <div className="text-center text-[15px]">
          <Link href="/login" className="font-semibold text-brand-info hover:underline">
            Volver al login
          </Link>
        </div>
      }
    >
      <RecuperarContrasenaForm />
    </LayoutAcceso>
  )
}