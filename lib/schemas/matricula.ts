import { z } from "zod"

import {
  MENSAJE_CONTRASENA_SEGURA,
  MENSAJE_DNI,
  MENSAJE_SOLO_LETRAS_Y_ESPACIOS,
  REGEX_CONTRASENA_SEGURA,
  REGEX_DNI,
  REGEX_SOLO_LETRAS_Y_ESPACIOS,
} from "@/lib/schemas/comun"

const nombre = (campo: string) =>
  z
    .string()
    .trim()
    .min(1, `${campo} es obligatorio`)
    .max(30, "Máximo 30 caracteres")
    .regex(REGEX_SOLO_LETRAS_Y_ESPACIOS, MENSAJE_SOLO_LETRAS_Y_ESPACIOS)

// ── Paso 1: alumno ──────────────────────────────────────────────────────

export const alumnoPasoSchema = z
  .object({
    documentoIdentidad: z.string().regex(REGEX_DNI, MENSAJE_DNI),
    nombre: nombre("El nombre"),
    apellidoPat: nombre("El apellido paterno"),
    apellidoMat: nombre("El apellido materno"),
    fechaNacimiento: z.string().min(1, "La fecha de nacimiento es obligatoria"),
    sexo: z.string().min(1, "Selecciona el sexo"),
    direccion: z.string().trim().min(1, "La dirección es obligatoria").max(120, "Máximo 120 caracteres"),
    tieneDiscapacidad: z.boolean(),
    discapacidad: z.string().max(255, "Máximo 255 caracteres"),
  })
  .superRefine((val, ctx) => {
    if (val.tieneDiscapacidad && !val.discapacidad.trim()) {
      ctx.addIssue({ code: "custom", path: ["discapacidad"], message: "Describe la discapacidad" })
    }
  })
export type AlumnoPasoValues = z.infer<typeof alumnoPasoSchema>

export const alumnoPasoDefault: AlumnoPasoValues = {
  documentoIdentidad: "",
  nombre: "",
  apellidoPat: "",
  apellidoMat: "",
  fechaNacimiento: "",
  sexo: "",
  direccion: "",
  tieneDiscapacidad: false,
  discapacidad: "",
}

// ── Paso 2: apoderados ──────────────────────────────────────────────────

// "" mientras no se busca el DNI: el estado decide qué campos se piden.
const apoderadoPasoSchema = z
  .object({
    estado: z.enum(["", "APODERADO", "USUARIO", "NUEVO"]),
    documentoIdentidad: z.string().regex(REGEX_DNI, MENSAJE_DNI),
    nombre: z.string(),
    apellidoPat: z.string(),
    apellidoMat: z.string(),
    fechaNaci: z.string(),
    sexo: z.string(),
    direccion: z.string().max(120, "Máximo 120 caracteres"),
    idParentesco: z.number().int(),
    celular: z.string(),
    gmail: z.string(),
    contraseña: z.string(),
    hijos: z.array(z.string()),
  })
  .superRefine((val, ctx) => {
    const exigir = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message })
    }
    if (val.estado === "") {
      exigir(false, "documentoIdentidad", "Busca el DNI con la lupa")
      return
    }
    exigir(val.idParentesco > 0, "idParentesco", "Selecciona el parentesco")
    if (val.estado === "APODERADO") return
    exigir(!!val.sexo, "sexo", "Selecciona el sexo")
    exigir(!!val.direccion.trim(), "direccion", "La dirección es obligatoria")
    exigir(/^\d{9}$/.test(val.celular), "celular", "El celular debe tener 9 dígitos")
    if (val.estado === "USUARIO") return
    for (const [campo, etiqueta] of [
      ["nombre", "El nombre"],
      ["apellidoPat", "El apellido paterno"],
      ["apellidoMat", "El apellido materno"],
    ] as const) {
      const resultado = nombre(etiqueta).safeParse(val[campo])
      exigir(resultado.success, campo, resultado.error?.issues[0]?.message ?? "")
    }
    exigir(!!val.fechaNaci, "fechaNaci", "La fecha de nacimiento es obligatoria")
    exigir(z.string().email().safeParse(val.gmail.trim()).success, "gmail", "Escribe un correo válido")
    exigir(REGEX_CONTRASENA_SEGURA.test(val.contraseña), "contraseña", MENSAJE_CONTRASENA_SEGURA)
  })
export type ApoderadoPasoValues = z.infer<typeof apoderadoPasoSchema>

export const apoderadosPasoSchema = z
  .object({ apoderados: z.array(apoderadoPasoSchema).min(1).max(2) })
  .superRefine((val, ctx) => {
    const [principal, secundario] = val.apoderados
    if (secundario && principal.documentoIdentidad === secundario.documentoIdentidad) {
      ctx.addIssue({
        code: "custom",
        path: ["apoderados", 1, "documentoIdentidad"],
        message: "Los dos apoderados no pueden tener el mismo DNI",
      })
    }
  })
export type ApoderadosPasoValues = z.infer<typeof apoderadosPasoSchema>

export const apoderadoPasoDefault: ApoderadoPasoValues = {
  estado: "",
  documentoIdentidad: "",
  nombre: "",
  apellidoPat: "",
  apellidoMat: "",
  fechaNaci: "",
  sexo: "",
  direccion: "",
  idParentesco: 0,
  celular: "",
  gmail: "",
  contraseña: "",
  hijos: [],
}

// ── Paso 3: matrícula ───────────────────────────────────────────────────

// Código y comprobante dependen del método: los valida el paso al enviar.
export const matriculaPasoSchema = z.object({
  idAnio: z.number().int().min(1, "Selecciona el año escolar"),
  idNivel: z.number().int().min(1, "Selecciona el nivel"),
  idGrado: z.number().int().min(1, "Selecciona el grado"),
  idTurno: z.number().int().min(1, "Selecciona el turno"),
  idGradoSeccion: z.number().int().min(1, "Selecciona la sección"),
  idMetodoPago: z.number().int().min(1, "Selecciona el método de pago"),
  codigoTransaccion: z.string().max(60, "Máximo 60 caracteres"),
  observaciones: z.string().max(500, "Máximo 500 caracteres"),
})
export type MatriculaPasoValues = z.infer<typeof matriculaPasoSchema>
