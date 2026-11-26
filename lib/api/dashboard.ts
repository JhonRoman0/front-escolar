import { type Paginated } from "@/lib/api"
import {
  dateAIso,
  diasSemana,
  esFechaFutura,
  formatearFechaCorta,
} from "@/lib/fechas"
import {
  ACCESO,
  docentesApi,
  gradosApi,
} from "@/lib/api/academico"
import { asistenciasApi } from "@/lib/api/asistencia"
import { alumnosApi } from "@/lib/api/estudiantes"
import { NOMBRES_DIAS } from "@/lib/horario"
import { matriculasApi } from "@/lib/api/matricula"
import { usuariosApi } from "@/lib/api/seguridad"

export type MotivoSinAsistencia = "sin-clases" | "pendiente" | "sin-datos"
export type EstadoDato = "cargando" | "error" | "sin-anio" | "sin-datos" | "listo"

const TAMANO_PAGINA = 500

export const MOTIVO_ASISTENCIA_TEXTO: Record<MotivoSinAsistencia, string> = {
  "sin-clases": "sin clase",
  pendiente: "pendiente",
  "sin-datos": "sin datos",
}

export interface TendenciaDia {
  dia: string
  fecha: string
  etiquetaCorta: string
  puntual: number
  tardanza: number
  justificada: number
  inasistencia: number
  porcentaje: number | null
  motivo: MotivoSinAsistencia | null
}

export interface DistribucionGrado {
  grado: string
  alumnos: number
}

async function todasLasPaginas<T>(
  primera: Paginated<T>,
  obtenerPagina: (pagina: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const resultados = [...primera.content]
  for (let pagina = 1; pagina < primera.totalPages; pagina++) {
    const respuesta = await obtenerPagina(pagina)
    resultados.push(...respuesta.content)
  }
  return resultados
}

export async function totalAlumnos(idAnio: number): Promise<number> {
  const respuesta = await alumnosApi.listar(0, 1, { idAnio })
  return respuesta.totalElements
}

export async function totalDocentes(): Promise<number> {
  const docentes = await docentesApi.listar()
  return docentes.length
}

export async function totalUsuarios(): Promise<number> {
  const respuesta = await usuariosApi.listar(0, 1)
  return respuesta.totalElements
}

export async function totalMatriculas(idAnio: number): Promise<number> {
  const respuesta = await matriculasApi.listar(0, 1, ACCESO.ACTIVO, idAnio)
  return respuesta.totalElements
}

export function estadisticasHoy(fecha: string, idAnio: number) {
  return asistenciasApi.estadisticas("hoy", fecha, idAnio)
}

const DIAS_CORTOS = NOMBRES_DIAS.slice(0, 5).map((dia) => dia[0])

export async function tendenciaSemana(
  fechaReferencia: string,
  idAnio: number,
): Promise<TendenciaDia[]> {
  const primera = await asistenciasApi.semana(fechaReferencia, 0, TAMANO_PAGINA, { idAnio })
  const filas = await todasLasPaginas(primera, (pagina) =>
    asistenciasApi.semana(fechaReferencia, pagina, TAMANO_PAGINA, { idAnio }),
  )
  const dias = diasSemana(fechaReferencia)

  return dias.map((fecha, indice) => {
    let puntual = 0
    let tardanza = 0
    let justificada = 0
    let inasistencia = 0
    let sinClases = 0
    let pendiente = 0

    for (const fila of filas) {
      const estado = fila.estados[indice]
      if (estado === "Puntual") puntual++
      else if (estado === "Tardanza") tardanza++
      else if (estado === "Justificada") justificada++
      else if (estado === "Inasistencia") inasistencia++
      else if (estado === "Sin clases") sinClases++
      else if (estado === "Pendiente") pendiente++
    }

    const esperados = puntual + tardanza + justificada + inasistencia
    const registrados = puntual + tardanza + justificada
    const esFutura = esFechaFutura(fecha)
    const motivo: MotivoSinAsistencia | null =
      filas.length === 0 || esFutura
        ? "sin-datos"
        : esperados === 0
          ? sinClases === filas.length
            ? "sin-clases"
            : pendiente > 0
              ? "pendiente"
              : "sin-datos"
          : null

    return {
      dia: DIAS_CORTOS[indice],
      fecha: dateAIso(fecha),
      etiquetaCorta: formatearFechaCorta(fecha),
      puntual,
      tardanza,
      justificada,
      inasistencia,
      porcentaje: motivo === null ? Math.round((registrados / esperados) * 1000) / 10 : null,
      motivo,
    }
  })
}

export async function distribucionGrado(idAnio: number): Promise<DistribucionGrado[]> {
  const [catalogo, primera] = await Promise.all([
    gradosApi.porAnio(idAnio),
    matriculasApi.listar(0, TAMANO_PAGINA, ACCESO.ACTIVO, idAnio),
  ])
  const matriculas = await todasLasPaginas(primera, (pagina) =>
    matriculasApi.listar(pagina, TAMANO_PAGINA, ACCESO.ACTIVO, idAnio),
  )

  const datos = new Map<
    number,
    { nombre: string; nivel: string; nivelOrden: number; gradoOrden: number }
  >()
  for (const grado of catalogo) {
    if (datos.has(grado.idGrado)) continue
    datos.set(grado.idGrado, {
      nombre: grado.nombre,
      nivel: grado.nivel,
      nivelOrden: grado.nivelOrden ?? Number.MAX_SAFE_INTEGER,
      gradoOrden: grado.orden ?? Number.MAX_SAFE_INTEGER,
    })
  }

  const alumnosPorGrado = new Map<number, Set<number>>()
  for (const matricula of matriculas) {
    if (!datos.has(matricula.idGrado)) {
      datos.set(matricula.idGrado, {
        nombre: matricula.grado,
        nivel: matricula.nivel,
        nivelOrden: Number.MAX_SAFE_INTEGER,
        gradoOrden: Number.MAX_SAFE_INTEGER,
      })
    }
    if (!alumnosPorGrado.has(matricula.idGrado)) alumnosPorGrado.set(matricula.idGrado, new Set())
    alumnosPorGrado.get(matricula.idGrado)!.add(matricula.idAlumno)
  }

  const repetidos = new Map<string, number>()
  for (const dato of datos.values()) {
    repetidos.set(dato.nombre, (repetidos.get(dato.nombre) ?? 0) + 1)
  }

  return [...alumnosPorGrado.entries()]
    .map(([idGrado, alumnos]) => {
      const dato = datos.get(idGrado)!
      return {
        grado:
          (repetidos.get(dato.nombre) ?? 0) > 1 && dato.nivel
            ? `${dato.nivel} · ${dato.nombre}`
            : dato.nombre,
        alumnos: alumnos.size,
        nivelOrden: dato.nivelOrden,
        gradoOrden: dato.gradoOrden,
      }
    })
    .sort(
      (a, b) =>
        a.nivelOrden - b.nivelOrden ||
        a.gradoOrden - b.gradoOrden ||
        a.grado.localeCompare(b.grado, "es"),
    )
    .map(({ grado, alumnos }) => ({ grado, alumnos }))
}
