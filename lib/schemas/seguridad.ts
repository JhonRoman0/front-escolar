import * as z from "zod"

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

export const usuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(30),
  apellidoPat: z.string().min(1, "El apellido paterno es requerido").max(30),
  apellidoMat: z.string().min(1, "El apellido materno es requerido").max(30),
  documentoIdentidad: z
    .string()
    .regex(/^\d{8}$/, "El DNI debe contener exactamente 8 dígitos")
    .optional()
    .or(z.literal("")),
  gmail: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Correo inválido")
    .max(60),
  celular: z
    .string()
    .regex(/^\d{9}$/, "El celular debe contener 9 dígitos")
    .optional()
    .or(z.literal("")),
  fechaNaci: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)"),
  accesoId: accesoId.optional(),
  rolIds: z.array(z.number()).min(1, "Asigna al menos un rol"),
  contraseña: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional()
    .or(z.literal("")),
})
export type UsuarioValues = z.infer<typeof usuarioSchema>