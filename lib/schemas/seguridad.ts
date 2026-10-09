import * as z from "zod"

import {
  contrasenaSeguraOpcional,
  emailRequerido,
  MENSAJE_DNI,
  MENSAJE_SOLO_LETRAS_Y_ESPACIOS,
  REGEX_DNI,
  REGEX_SOLO_LETRAS_Y_ESPACIOS,
} from "@/lib/schemas/comun"

const accesoId = z.number().int().min(1, "Selecciona un estado").max(3)

export const accionSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().min(1, "El nombre es requerido").max(60),
  accesoId: accesoId.optional(),
})
export type AccionValues = z.infer<typeof accionSchema>

export const rolSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(20),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Formato hex inválido (ej: #FF5733)")
    .optional()
    .or(z.literal("")),
  accesoId: accesoId.optional(),
})
export type RolValues = z.infer<typeof rolSchema>

export const permisoNestedSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().min(1, "El nombre es requerido").max(60),
  acciones: z.array(z.string()),
})
export type PermisoNestedValues = z.infer<typeof permisoNestedSchema>

export const moduloSchema = z.object({
  modulo: z.string().min(1, "El nombre del módulo es requerido").max(50),
  icono: z.string().max(50).optional(),
  accesoId: accesoId.optional(),
  permisos: z.array(permisoNestedSchema),
})
export type ModuloValues = z.infer<typeof moduloSchema>

export const permisoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().min(1, "El nombre es requerido").max(60),
  idModulo: z.number().int().min(1, "Selecciona un módulo"),
  acciones: z.array(z.string()),
  accesoId: accesoId.optional(),
})
export type PermisoValues = z.infer<typeof permisoSchema>

export const rolPermisoSchema = z.object({
  idRol: z.number().int().min(1, "Selecciona un rol"),
  idPermiso: z.number().int().min(1, "Selecciona un permiso"),
  acciones: z.array(z.string()),
})
export type RolPermisoValues = z.infer<typeof rolPermisoSchema>

const usuarioSchemaBase = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(30)
    .regex(REGEX_SOLO_LETRAS_Y_ESPACIOS, MENSAJE_SOLO_LETRAS_Y_ESPACIOS),
  apellidoPat: z
    .string()
    .trim()
    .min(1, "El apellido paterno es requerido")
    .max(30)
    .regex(REGEX_SOLO_LETRAS_Y_ESPACIOS, MENSAJE_SOLO_LETRAS_Y_ESPACIOS),
  apellidoMat: z
    .string()
    .trim()
    .min(1, "El apellido materno es requerido")
    .max(30)
    .regex(REGEX_SOLO_LETRAS_Y_ESPACIOS, MENSAJE_SOLO_LETRAS_Y_ESPACIOS),
  documentoIdentidad: z.string().regex(REGEX_DNI, MENSAJE_DNI),
  gmail: emailRequerido.max(60),
  celular: z
    .string()
    .regex(/^\d{9}$/, "El celular debe contener exactamente 9 dígitos"),
  fechaNaci: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)"),
  accesoId: accesoId.optional(),
  rolIds: z.array(z.number()).min(1, "Asigna al menos un rol"),
  contraseña: contrasenaSeguraOpcional,
  // Datos específicos del docente. Solo se exigen (vía superRefine) cuando el
  // formulario selecciona DOCENTE y el usuario no tiene ya un docente activo.
  gradoAcademicoId: z
    .number({ error: "Selecciona el grado académico" })
    .int()
    .min(1, "Selecciona el grado académico")
    .nullable()
    .optional(),
  tipoContratoId: z
    .number({ error: "Selecciona el tipo de contrato" })
    .int()
    .min(1, "Selecciona el tipo de contrato")
    .nullable()
    .optional(),
  fechaContratacion: z.string().optional().or(z.literal("")),
  niveles: z.array(z.number()),
})
export type UsuarioValues = z.infer<typeof usuarioSchemaBase>

/**
 * Schema del modal de usuario. `exigeDocente` cambia según el flujo: al crear o
 * al añadir DOCENTE a un usuario sin docente activo, los datos del docente son
 * obligatorios. Al editar un usuario que ya es docente, se gestionan desde la
 * pestaña Docentes y aquí se ignoran.
 */
export function crearUsuarioSchema(exigeDocente: boolean) {
  if (!exigeDocente) return usuarioSchemaBase
  return usuarioSchemaBase.superRefine((valores, ctx) => {
    if (valores.gradoAcademicoId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gradoAcademicoId"],
        message: "El grado académico es obligatorio para un docente",
      })
    }
    if (valores.tipoContratoId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoContratoId"],
        message: "El tipo de contrato es obligatorio para un docente",
      })
    }
    if (!valores.fechaContratacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaContratacion"],
        message: "La fecha de contratación es obligatoria para un docente",
      })
    }
    if (valores.niveles.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["niveles"],
        message: "Asigna al menos un nivel al docente",
      })
    }
  })
}

export const usuarioSchema = crearUsuarioSchema(false)