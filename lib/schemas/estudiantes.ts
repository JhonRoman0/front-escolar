import * as z from "zod"

import { MENSAJE_CONTRASENA_SEGURA, REGEX_CONTRASENA_SEGURA } from "@/lib/schemas/comun"

const accesoId = z.number().int().min(1, "Selecciona un estado").max(3)

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)")

const textoOpcional = z
  .string()
  .max(60)
  .optional()
  .or(z.literal(""))
  .nullable()

// Un apoderado "reutilizado" solo necesita documentoIdentidad (el back usa los
// datos del usuario existente). Uno "creado" exige los datos completos.
export type ModoApoderado = "crear" | "reutilizar"

// ≡ ApoderadoRequest (@Valid del back, sin campos obligatorios). Los campos
// internos `_modo`, `_idUsuario` y `_urlFoto` no se envían al back; los usa el
// front para validar y para subir/eliminar la foto del apoderado.
export const apoderadoSchema = z.object({
  _modo: z.enum(["crear", "reutilizar"]),
  _idUsuario: z.number().int().positive().optional(),
  _urlFoto: z.string().optional(),
  nombre: z.string().trim().max(50).optional().or(z.literal("")),
  apellidoPat: z.string().trim().max(50).optional().or(z.literal("")),
  apellidoMat: z.string().trim().max(50).optional().or(z.literal("")),
  gmail: z
    .string()
    .email("Correo inválido")
    .max(60)
    .optional()
    .or(z.literal("")),
  contraseña: z.string().max(100).optional().or(z.literal("")),
  fechaNaci: z.string().optional().or(z.literal("")),
  documentoIdentidad: z
    .string()
    .max(20, "Máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  celular: z.string().max(20).optional().or(z.literal("")),
  direccion: z.string().max(100).optional().or(z.literal("")),
  parentesco: z.string().max(50).optional().or(z.literal("")),
})
export type ApoderadoValues = z.infer<typeof apoderadoSchema>

export function estaVacioApoderado(a: ApoderadoValues | undefined): boolean {
  if (!a) return true
  return (
    !a.nombre &&
    !a.apellidoPat &&
    !a.apellidoMat &&
    !a.gmail &&
    !a.contraseña &&
    !a.fechaNaci &&
    !a.documentoIdentidad &&
    !a.celular &&
    !a.direccion &&
    !a.parentesco
  )
}

export const apoderadoDefault: ApoderadoValues = {
  _modo: "crear",
  _idUsuario: undefined,
  _urlFoto: undefined,
  nombre: "",
  apellidoPat: "",
  apellidoMat: "",
  gmail: "",
  contraseña: "",
  fechaNaci: "",
  documentoIdentidad: "",
  celular: "",
  direccion: "",
  parentesco: "",
}

// ≡ AlumnoRequest (@Valid del back). apoderados: máx 2 (back @Size(max=2)),
// al menos 1 obligatorio al crear (back "Debe indicar al menos un apoderado").
export const alumnoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(50),
  apellidoPat: z.string().trim().min(1, "El apellido paterno es obligatorio").max(50),
  apellidoMat: z.string().trim().min(1, "El apellido materno es obligatorio").max(50),
  fechaNacimiento: fechaISO,
  direccion: textoOpcional,
  documentoIdentidad: textoOpcional,
  apoderados: z.array(apoderadoSchema).max(2, "Máximo 2 apoderados").optional(),
  _quitarApoderados: z.boolean().optional(),
  accesoId: accesoId.optional(),
}).superRefine((val, ctx) => {
  if (val._quitarApoderados) return
  // En edición sin tocar apoderados el campo va undefined → el back no los modifica.
  if (val.apoderados === undefined) return
  const presentes = (val.apoderados ?? []).filter((a) => !estaVacioApoderado(a))
  if (presentes.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["apoderados"],
      message: "Debe indicar al menos un apoderado",
    })
    return
  }
  const documentos = presentes
    .map((a) => a.documentoIdentidad?.trim())
    .filter((d): d is string => !!d)
  if (new Set(documentos).size !== documentos.length) {
    ctx.addIssue({
      code: "custom",
      path: ["apoderados"],
      message:
        "No se puede asignar el mismo documento de identidad a dos apoderados",
    })
    return
  }
  presentes.forEach((a, i) => {
    if (a._modo === "reutilizar") {
      if (!a.documentoIdentidad?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["apoderados", i, "documentoIdentidad"],
          message: "El documento es obligatorio",
        })
      }
      return
    }
    if (!a.nombre?.trim()) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "nombre"], message: "El nombre es obligatorio" })
    }
    if (!a.apellidoPat?.trim()) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "apellidoPat"], message: "El apellido paterno es obligatorio" })
    }
    if (!a.apellidoMat?.trim()) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "apellidoMat"], message: "El apellido materno es obligatorio" })
    }
    if (!a.fechaNaci) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "fechaNaci"], message: "La fecha de nacimiento es obligatoria" })
    }
    if (!a.contraseña) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "contraseña"], message: "La contraseña es obligatoria" })
    } else if (a.contraseña.length < 8) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "contraseña"], message: "La contraseña debe tener al menos 8 caracteres" })
    } else if (!REGEX_CONTRASENA_SEGURA.test(a.contraseña)) {
      ctx.addIssue({ code: "custom", path: ["apoderados", i, "contraseña"], message: MENSAJE_CONTRASENA_SEGURA })
    }
  })
})
export type AlumnoValues = z.infer<typeof alumnoSchema>