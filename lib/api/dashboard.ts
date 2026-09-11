import { aniosEscolaresApi, docentesApi } from "@/lib/api/academico"
import { asistenciasApi } from "@/lib/api/asistencia"
import { alumnosApi } from "@/lib/api/estudiantes"
import { matriculasApi } from "@/lib/api/matricula"
import { usuariosApi } from "@/lib/api/seguridad"
import {
  diasSemana,
  esFechaFutura,
  formatearFechaCorta,
} from "@/lib/fechas"

// ── Tipos de los widgets ─────────────────────────────────────────────────

// Un punto de la línea de tendencia semanal (L–V).
export interface TendenciaDia {
  /** Etiqueta corta del día: "Lun", "Mar", ... */
  dia: string
  /** Fecha ISO de la columna. */
  fecha: string
  /** Fecha como dd/mm para el eje X. */
  etiquetaCorta: string
  puntual: number
  tardanza: number
  justificada: number
  inasistencia: number
  /** % asistencia del día ≡ criterio del back (registrados / universo * 100,
   *  registrados = puntual + tardanza + justificada). null = sin clase aún. */
  porcentaje: number | null
}

// Una barra del chart de distribución por grado.
export interface DistribucionGrado {
  grado: string
  alumnos: number
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie"]

function aISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ── KPIs (totales) ───────────────────────────────────────────────────────

// GET /alumnos?page=0&size=1 → solo interesa totalElements.
export async function totalAlumnos(): Promise<number> {
  const page = await alumnosApi.listar(0, 1)
  return page.totalElements
}

// GET /docentes → List completa; el largo ES el total.
export async function totalDocentes(): Promise<number> {
  const lista = await docentesApi.listar()
  return lista.length
}

// GET /usuarios?page=0&size=1 → totalElements.
export async function totalUsuarios(): Promise<number> {
  const page = await usuariosApi.listar(0, 1)
  return page.totalElements
}

// GET /matriculas?page=0&size=1 → totalElements.
export async function totalMatriculas(): Promise<number> {
  const page = await matriculasApi.listar(0, 1)
  return page.totalElements
}

// GET /anios-escolares → el activo es el único con estado === 1.
export async function anioEscolarActivo() {
  const anios = await aniosEscolaresApi.listar()
  return anios.find((a) => a.estado === 1) ?? null
}
export type AnioActivo = Awaited<ReturnType<typeof anioEscolarActivo>>

// ── Asistencia hoy (proxy directo al endpoint de estadísticas) ───────────

export function estadisticasHoy(fecha: string) {
  return asistenciasApi.estadisticas("hoy", fecha)
}

// ── Tendencia semanal (GET /asistencias/semana?fecha=&size=500) ──────────
// La matriz trae estados L–V por alumno; agregamos por columna. Los días
// futuros se reportan con porcentaje null para no pintarlos como 0%.

export async function tendenciaSemana(
  fechaReferencia: string
): Promise<TendenciaDia[]> {
  const page = await asistenciasApi.semana(fechaReferencia, 0, 500)
  const filas = page.content

  return diasSemana(fechaReferencia).map((d, i) => {
    let puntual = 0
    let tardanza = 0
    let justificada = 0
    let inasistencia = 0

    for (const fila of filas) {
      switch (fila.estados[i]) {
        case "Puntual":
          puntual++
          break
        case "Tardanza":
          tardanza++
          break
        case "Justificada":
          justificada++
          break
        default:
          inasistencia++
      }
    }

    const fechaISO = aISO(d)
    const universo = filas.length
    const registrados = puntual + tardanza + justificada

    return {
      dia: DIAS_CORTOS[i],
      fecha: fechaISO,
      etiquetaCorta: formatearFechaCorta(d),
      puntual,
      tardanza,
      justificada,
      inasistencia,
      porcentaje:
        !universo || esFechaFutura(d)
          ? null
          : Math.round((registrados / universo) * 1000) / 10,
    }
  })
}

// ── Distribución por grado (GET /matriculas?page=0&size=500) ─────────────

export async function distribucionGrado(): Promise<DistribucionGrado[]> {
  const page = await matriculasApi.listar(0, 500)

  const conteo = new Map<string, number>()
  for (const m of page.content) {
    conteo.set(m.grado, (conteo.get(m.grado) ?? 0) + 1)
  }
  return [...conteo.entries()]
    .map(([grado, alumnos]) => ({ grado, alumnos }))
    .sort((a, b) => a.grado.localeCompare(b.grado, "es"))
}
