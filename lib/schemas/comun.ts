import * as z from "zod"

// DNI: exactamente 8 digitos.
export const REGEX_DNI = /^\d{8}$/
export const MENSAJE_DNI = "El DNI debe contener exactamente 8 dígitos"

// Nombres y apellidos: solo letras (unicode: tildes, ñ, ü y cualquier otro
// alfabeto) y espacios. Nunca rechaza un nombre válido.
export const REGEX_SOLO_LETRAS_Y_ESPACIOS = /^[\p{L} ]+$/u
export const MENSAJE_SOLO_LETRAS_Y_ESPACIOS = "Solo se permiten letras y espacios"

// Complemento de REGEX_SOLO_LETRAS_Y_ESPACIOS para sanitizar mientras se
// escribe: quita cualquier carácter que no sea letra o espacio, y así un
// número o símbolo nunca llega a quedarse en el input.
export const REGEX_NO_LETRAS_ESPACIOS = /[^\p{L} ]/gu

// Correo válido y obligatorio. Se comparte entre los schemas que guardan
// contacto (Usuario, Docente) para no duplicar mensajes ni reglas.
export const MENSAJE_EMAIL = "Correo inválido"
export const emailRequerido = z
  .string()
  .min(1, "El email es obligatorio")
  .email(MENSAJE_EMAIL)

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
