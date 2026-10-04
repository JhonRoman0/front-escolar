import * as z from "zod"

import { contrasenaSeguraOpcional } from "@/lib/schemas/comun"
import { esHoraValida, turnoAnterior, type TurnoFranja } from "@/lib/turnos"

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

export const crearTurnoSchema = (turnos: TurnoFranja[] = [], idTurno = -1) =>
  z
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
        // Si alguna de las dos no es una hora válida el error de formato ya la
        // señala, no tiene sentido encima apilar un error de orden.
        if (!esHoraValida(a) || !esHoraValida(b)) continue
        if (!(a < b)) {
          ctx.addIssue({ code: "custom", path: [campo], message: mensaje })
        }
      }
      // Un turno solo se valida contra el que lo precede en la jornada, y el
      // empate está permitido porque representa el cambio de turno: Mañana sale
      // 12:30 y Tarde entra 12:30 es una configuración válida. Al revés no se
      // comprueba, así que editar Mañana nunca falla por un turno posterior.
      // La cadena se arma con las horas del formulario, no con las guardadas,
      // para que al cambiar la hora de entrada el orden se recalcule al vuelo.
      const anterior = turnoAnterior(
        turnos.map((t) =>
          t.id === idTurno
            ? { ...t, horaEntrada: turno.horaEntrada, horaSalida: turno.horaSalida }
            : t,
        ),
        idTurno,
      )
      if (anterior && turno.horaEntrada < anterior.horaSalida) {
        ctx.addIssue({
          code: "custom",
          path: ["horaEntrada"],
          message: `No puede iniciar antes de que termine el turno ${anterior.nombre} (${anterior.horaSalida})`,
        })
      }
    })

export const turnoSchema = crearTurnoSchema()
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
    if (data.secciones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secciones"],
        message: "Indica al menos una sección",
      })
    }
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
  })
export type GradoValues = z.infer<typeof gradoSchema>

// ── Sección nueva ────────────────────────────────────────────────────────

/** Una sola letra mayúscula: es como se rotulan las secciones en los listados. */
const letraSeccion = /^[A-Z]$/

/**
 * Indices de las secciones que chocan entre si o con las que ya estan creadas,
 * con el mensaje que va bajo cada input. Vive fuera del schema porque la misma
 * comprobacion se usa al enviar y mientras se escribe: tenerla en un solo lado
 * evita que los dos caminos se diferencien en el texto.
 *
 * Se salta lo que aun no es una letra (vacio o con formato invalido) para no
 * marcar en rojo una fila recien agregada. Ese caso lo cubre el schema, que
 * ademas es el que bloquea el envio.
 */
export function duplicadosDeSeccion(
  secciones: string[],
  existentes: string[] = [],
): Map<number, string> {
  const yaCreadas = new Set(
    existentes.map((s) => s.trim().toUpperCase()).filter(Boolean),
  )
  // La que se marca es la segunda, no la primera: el error tiene que señalar el
  // input que el usuario acaba de escribir, no uno que ya estaba bien.
  const enElFormulario = new Set<string>()
  const conflictos = new Map<number, string>()

  secciones.forEach((bruto, i) => {
    const seccion = bruto.trim().toUpperCase()

    if (!seccion || !letraSeccion.test(seccion)) return

    if (enElFormulario.has(seccion)) {
      conflictos.set(i, "Ya agregaste esta sección")
      return
    }
    if (yaCreadas.has(seccion)) {
      conflictos.set(i, `La sección ${seccion} ya existe en ese turno`)
      return
    }
    enElFormulario.add(seccion)
  })

  return conflictos
}

/**
 * Alta de varias secciones sobre un grado que ya existe, todas de la misma
 * combinacion de turno, nivel y grado. El año no viaja en el formulario: el
 * backend usa el vigente. Mandarlo abriría la puerta a colgar las secciones de
 * un año que el usuario no está viendo.
 *
 * `existentes` son las letras que ya tiene ese grado en ese turno y año. Se
 * pasan desde el formulario porque el backend responde el lote entero con un
 * error genérico, y el mensaje tiene que caer junto al input que lo produjo,
 * no arriba de todo el formulario. El backend sigue siendo quien corta de
 * verdad: esto es para que el error se vea antes de enviar.
 */
export const crearSeccionSchema = (existentes: string[] = []) =>
  z
    .object({
      idTurno: z.number().int().min(1, "Selecciona un turno"),
      idNivel: z.number().int().min(1, "Selecciona un nivel"),
      idGrado: z.number().int().min(1, "Selecciona un grado"),
      secciones: z
        .array(z.string())
        .min(1, "Indica al menos una sección")
        .max(26, "Máximo 26 secciones"),
    })
    .superRefine((data, ctx) => {
      data.secciones.forEach((bruto, i) => {
        if (!letraSeccion.test(bruto.trim().toUpperCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["secciones", i],
            message: "Ingresa una sola letra (A-Z)",
          })
        }
      })

      duplicadosDeSeccion(data.secciones, existentes).forEach((message, i) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secciones", i],
          message,
        })
      })
    })

export const seccionSchema = crearSeccionSchema()
export type SeccionValues = z.infer<typeof seccionSchema>

// ── Año escolar ──────────────────────────────────────────────────────────

export const anioEscolarSchema = z.object({
  // El .min va primero a propósito: zod corre las validaciones en el orden en
  // que se declaran y el formulario muestra el primer error. Con el regex
  // primero, un campo vacío decía "Año inválido" en vez de "es requerido".
  anio: z
    .string()
    .min(1, "El año es requerido")
    .regex(/^\d{4}$/, "Año inválido (4 dígitos)"),
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