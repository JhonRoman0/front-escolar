import Link from "next/link"

import { RestablecerContrasenaForm } from "@/components/portal/public/restablecer-contrasena-form"
import { LayoutAcceso } from "@/components/shared/layout-acceso"

export default function RestablecerContrasenaPage() {
  return (
    <LayoutAcceso
      titulo={
        <h1 className="text-display font-bold text-foreground">
          Restablecer contraseña
        </h1>
      }
      descripcion={
        <p className="text-descripcion font-semibold text-gris-descripcion">
          Ingresa el token recibido por correo y tu nueva contraseña.
        </p>
      }
      pie={
        <div className="text-center text-body">
          <Link href="/login" className="font-semibold text-brand-info hover:underline">
            Volver al login
          </Link>
        </div>
      }
    >
      <RestablecerContrasenaForm />
    </LayoutAcceso>
  )
}
