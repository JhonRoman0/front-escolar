import * as z from "zod"

import { contrasenaSegura } from "@/lib/schemas/comun"

// Cambio de contraseña del usuario autenticado. Reutiliza la regla de
// contraseña segura de comun.ts y el mismo refine de confirmación que el
// restablecimiento (recuperar-contrasena-wizard).
export const cambiarContrasenaSchema = z
  .object({
    contrasenaActual: z.string().min(1, "Ingresa tu contraseña actual"),
    nuevaContrasena: contrasenaSegura,
    confirmar: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.nuevaContrasena === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })

export type CambiarContrasenaValues = z.infer<typeof cambiarContrasenaSchema>