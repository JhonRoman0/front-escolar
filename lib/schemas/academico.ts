import * as z from "zod"

import { contrasenaSeguraOpcional } from "@/lib/schemas/comun"

const accesoId = z.number().int().min(1, "Selecciona un estado").max(3)
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)")
const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora requerida (HH:mm)")

// ── Docente ──────────────────────────────────────────────────────────────

export const docenteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(30),
  apellidoPat: z.string().min(1, "El apellido paterno es requerido").max(30),
  apellidoMat: z.string().min(1, "El apellido materno es requerido").max(30),
  documentoIdentidad: z
    .string()
    .regex(/^\d{8}$/, "El DNI debe contener exactamente 8 dígitos")
    .optional()
    .or(z.literal("")),
  contraseña: contrasenaSeguraOpcional,
  gmail: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Correo inválido")
    .max(60),
  fechaNaci: fecha,
  tipoContrato: z.string().max(30).optional().or(z.literal("")),
  fechaContratacion: z.string().optional().or(z.literal("")),
  especialidad: z.string().max(60).optional().or(z.literal("")),
  gradoAcademico: z.string().max(60).optional().or(z.literal("")),
  accesoId: accesoId.optional(),
})
export type DocenteValues = z.infer<typeof docenteSchema>

// ── Curso ────────────────────────────────────────────────────────────────

export const cursoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(50),
  accesoId: accesoId.optional(),
})
export type CursoValues = z.infer<typeof cursoSchema>

// ── Turno ────────────────────────────────────────────────────────────────

export const turnoSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(50),
    horaEntrada: hora,
    horaEntradaLimite: hora,
    horaFaltaLimite: hora,
    horaSalida: hora,
    accesoId: accesoId.optional(),
  })
  .superRefine((turno, ctx) => {
    // "HH:mm" en formato fijo se compara de forma segura como string.
    const pares = [
      {
        a: turno.horaEntrada,
        b: turno.horaEntradaLimite,
        campo: "horaEntradaLimite",
        mensaje: "El límite de puntualidad debe ser mayor a la hora de entrada",
      },
      {
        a: turno.horaEntradaLimite,
        b: turno.horaFaltaLimite,
        campo: "horaFaltaLimite",
        mensaje: "El límite de tardanza debe ser mayor al límite de puntualidad",
      },
      {
        a: turno.horaFaltaLimite,
        b: turno.horaSalida,
        campo: "horaSalida",
        mensaje: "La hora de salida debe ser mayor al límite de tardanza",
      },
    ]
    for (const { a, b, campo, mensaje } of pares) {
      if (!(a < b)) {
        ctx.addIssue({ code: "custom", path: [campo], message: mensaje })
      }
    }
  })
export type TurnoValues = z.infer<typeof turnoSchema>

// ── Grado ────────────────────────────────────────────────────────────────

export const gradoSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(50),
    idNivel: z.number().int().min(1, "Selecciona un nivel"),
    idAnio: z.number().int().min(1, "Selecciona un año escolar"),
    idTurno: z.number().int().min(1, "Selecciona un turno"),
    secciones: z.array(z.string().trim().min(1, "La sección es requerida")),
    accesoId: accesoId.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.idNivel !== 1 && data.secciones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secciones"],
        message: "Indica al menos una sección",
      })
    }
    if (data.idNivel === 1 && data.secciones.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secciones"],
        message: "El nivel Inicial no tiene secciones",
      })
    }
    if (data.secciones.length > 0) {
      const limpias = data.secciones.map((s) => s.trim().toLowerCase())
      const duplicado = limpias.find((s, i) => limpias.indexOf(s) !== i)
      if (duplicado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secciones"],
          message:
            "No se pueden repetir secciones dentro del mismo grado (secciones duplicadas).",
        })
      }
    }
  })
export type GradoValues = z.infer<typeof gradoSchema>

// ── Año escolar ──────────────────────────────────────────────────────────

export const anioEscolarSchema = z.object({
  anio: z
    .string()
    .regex(/^\d{4}$/, "Año inválido (4 dígitos)")
    .min(1, "El año es requerido"),
  estado: z.number().int().min(1).max(2).optional(),
  fechaInicio: z.string().optional().or(z.literal("")),
  fechaFin: z.string().optional().or(z.literal("")),
  bloqueoHorariosPorFecha: z.boolean().optional(),
  accesoId: accesoId.optional(),
})
export type AnioEscolarValues = z.infer<typeof anioEscolarSchema>

// ── Aula ─────────────────────────────────────────────────────────────────

export const aulaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(50),
  capacidad: z
    .number()
    .int()
    .min(1, "La capacidad debe ser al menos 1")
    .optional(),
  accesoId: accesoId.optional(),
})
export type AulaValues = z.infer<typeof aulaSchema>

// ── Asignación ───────────────────────────────────────────────────────────

const horarioSchema = z
  .object({
    idAula: z.number().int().min(1, "Selecciona un aula"),
    diaSemana: z.number().int().min(1).max(7),
    horaInicio: hora,
    horaFin: hora,
  })
  .refine((h) => h.horaFin > h.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  })
export type HorarioValues = z.infer<typeof horarioSchema>

export const asignacionSchema = z
  .object({
    idCurso: z.number().int().min(1, "Selecciona un curso"),
    idDocente: z.number().int().min(1, "Selecciona un docente"),
    idGradoSeccion: z.number().int().min(0, "Selecciona el grado-sección"),
    idAnio: z.number().int().min(1, "Selecciona un año escolar"),
    horarios: z
      .array(horarioSchema)
      .min(1, "Indica al menos un horario"),
    accesoId: accesoId.optional(),
  })
  .superRefine((val, ctx) => {
    const choques = new Set<string>()
    val.horarios.forEach((h, i) => {
      const clave = `${h.diaSemana}-${h.horaInicio}-${h.horaFin}`
      if (choques.has(clave)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["horarios", i],
          message: "Horarios repetidos en el mismo día",
        })
      }
      choques.add(clave)
    })
  })
export type AsignacionValues = z.infer<typeof asignacionSchema>