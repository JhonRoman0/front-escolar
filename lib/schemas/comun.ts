import * as z from "zod"

// ≡ @Pattern del back (UsuarioRequest / DocenteRequest / ApoderadoRequest / ResetPasswordRequest):
// min 8 + 1 mayúscula + 1 número + 1 especial
export const REGEX_CONTRASENA_SEGURA = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
export const MENSAJE_CONTRASENA_SEGURA =
  "La contraseña debe contener mínimo 8 caracteres, al menos 1 letra mayúscula, 1 número y 1 carácter especial (ej: @, #, $, !)"

export const contrasenaSegura = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(REGEX_CONTRASENA_SEGURA, MENSAJE_CONTRASENA_SEGURA)

export const contrasenaSeguraOpcional = z
  .string()
  .optional()
  .or(z.literal(""))
  .superRefine((val, ctx) => {
    if (!val) return
    if (val.length < 8) {
      ctx.addIssue({ code: "custom", message: "La contraseña debe tener al menos 8 caracteres" })
      return
    }
    if (!REGEX_CONTRASENA_SEGURA.test(val)) {
      ctx.addIssue({ code: "custom", message: MENSAJE_CONTRASENA_SEGURA })
    }
  })
