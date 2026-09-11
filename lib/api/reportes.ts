import { apiFetch, type Paginated } from "@/lib/api"

// ── Tipos (≈ DTOs del ReporteController) ─────────────────────────────────

// ≡ ReporteGeneralResponse (GET /reportes/general, Page).
export interface ReporteGeneralItem {
  fecha: string
  horaEntrada: string | null
  codigo: string | null
  alumno: string
  gradoSeccion: string
  estado: string
  justificacion: string | null
  registradoPor: string | null
}

// ≡ ReporteAlumnoResponse (GET /reportes/alumno/{id}, List sin paginar).
export interface ReporteAlumnoItem {
  fecha: string
  horaEntrada: string | null
  estado: string
  justificacion: string | null
  registradoPor: string | null
}

// ≡ ReporteUsuarioResponse (GET /reportes/usuario/{id}, List sin paginar).
export interface ReporteUsuarioItem {
  fecha: string
  horaEntrada: string | null
  alumno: string
  gradoSeccion: string
  estado: string
  justificacion: string | null
}

// ── Reportes nuevos (Fase 10 completa) ────────────────────────────────────

// ≡ GET /notas/reporte?inicio=&fin=&idGradoSeccion?=&bimestre? → List.
export interface NotaReporteItem {
  fecha: string
  alumno: string
  codigo: string
  curso: string
  competencia: string
  bimestre: number
  calificacion: string
  docente: string
}

// ≡ GET /matriculas/reporte?inicio=&fin=&idAnio?=&idGradoSeccion? → List.
export interface MatriculaReporteItem {
  idMatricula: number
  alumno: string
  codigo: string
  gradoSeccion: string
  fechaRegistro: string
  fechaPago: string | null
  montoPago: number | null
  registradoPor: string
}

// ≡ GET /alumnos/reporte?inicio=&fin=&idGradoSeccion? → List.
export interface AlumnoReporteItem {
  codigo: string
  nombre: string
  documentoIdentidad: string | null
  fechaNacimiento: string | null
  fechaIngreso: string
  gradoSeccion: string
  apoderado: string
}

// ≡ GET /docentes/reporte?inicio=&fin=&especialidad?=&tipoContrato? → List.
export interface DocenteReporteItem {
  codigo: string
  nombre: string
  documentoIdentidad: string | null
  especialidad: string | null
  gradoAcademico: string | null
  tipoContrato: string | null
  fechaContratacion: string | null
}

// ≡ GET /usuarios/reporte?inicio=&fin=&idRol? → List.
export interface UsuarioReporteItem {
  codigo: string
  nombre: string
  documentoIdentidad: string | null
  gmail: string | null
  fechaCreacion: string
  roles: string[]
}

// El back capa size=500 en /reportes/general (y /asistencias/mes) para no
// colapsar con rangos grandes. La paginación es in-memory: el back carga todo
// igual, así que iteramos páginas hasta last=true y unimos el array.
const SIZE_MAXIMO = 500

async function fetchPaginas<T>(
  fetcher: (page: number) => Promise<Paginated<T>>
): Promise<T[]> {
  const todo: T[] = []
  let page = 0
  for (;;) {
    const pagina = await fetcher(page)
    todo.push(...pagina.content)
    if (pagina.last || pagina.content.length === 0) break
    page += 1
  }
  return todo
}

function rango(inicio: string, fin: string): URLSearchParams {
  // Recomendación del back: NUNCA depender de los defaults (traen desde 2000).
  return new URLSearchParams({ inicio, fin })
}

export const reportesApi = {
  /** Todos los registros de asistencia del rango (itera páginas de 500). */
  async general(inicio: string, fin: string): Promise<ReporteGeneralItem[]> {
    return fetchPaginas((page) => {
      const params = rango(inicio, fin)
      params.set("page", String(page))
      params.set("size", String(SIZE_MAXIMO))
      return apiFetch<Paginated<ReporteGeneralItem>>(
        `/reportes/general?${params.toString()}`
      )
    })
  },

  /** Historial completo de un alumno en el rango (List directa). */
  async porAlumno(
    idAlumno: number,
    inicio: string,
    fin: string
  ): Promise<ReporteAlumnoItem[]> {
    const params = rango(inicio, fin)
    return apiFetch<ReporteAlumnoItem[]>(
      `/reportes/alumno/${idAlumno}?${params.toString()}`
    )
  },

  /** Registros hechos por un usuario en el rango (List directa). */
  async porUsuario(
    idUsuario: number,
    inicio: string,
    fin: string
  ): Promise<ReporteUsuarioItem[]> {
    const params = rango(inicio, fin)
    return apiFetch<ReporteUsuarioItem[]>(
      `/reportes/usuario/${idUsuario}?${params.toString()}`
    )
  },

  // ── Reportes nuevos (Fase 10 completa) ────────────────────────────────────

  async notas(
    inicio: string,
    fin: string,
    filtros?: { idGradoSeccion?: number; bimestre?: number }
  ): Promise<NotaReporteItem[]> {
    const params = rango(inicio, fin)
    if (filtros?.idGradoSeccion != null)
      params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    if (filtros?.bimestre != null)
      params.set("bimestre", String(filtros.bimestre))
    return apiFetch<NotaReporteItem[]>(
      `/notas/reporte?${params.toString()}`
    )
  },

  async matriculas(
    inicio: string,
    fin: string,
    filtros?: { idAnio?: number; idGradoSeccion?: number }
  ): Promise<MatriculaReporteItem[]> {
    const params = rango(inicio, fin)
    if (filtros?.idAnio != null) params.set("idAnio", String(filtros.idAnio))
    if (filtros?.idGradoSeccion != null)
      params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    return apiFetch<MatriculaReporteItem[]>(
      `/matriculas/reporte?${params.toString()}`
    )
  },

  async alumnos(
    inicio: string,
    fin: string,
    filtros?: { idGradoSeccion?: number }
  ): Promise<AlumnoReporteItem[]> {
    const params = rango(inicio, fin)
    if (filtros?.idGradoSeccion != null)
      params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    return apiFetch<AlumnoReporteItem[]>(
      `/alumnos/reporte?${params.toString()}`
    )
  },

  async docentes(
    inicio: string,
    fin: string,
    filtros?: { especialidad?: string; tipoContrato?: string }
  ): Promise<DocenteReporteItem[]> {
    const params = rango(inicio, fin)
    if (filtros?.especialidad) params.set("especialidad", filtros.especialidad)
    if (filtros?.tipoContrato) params.set("tipoContrato", filtros.tipoContrato)
    return apiFetch<DocenteReporteItem[]>(
      `/docentes/reporte?${params.toString()}`
    )
  },

  async usuarios(
    inicio: string,
    fin: string,
    filtros?: { idRol?: number }
  ): Promise<UsuarioReporteItem[]> {
    const params = rango(inicio, fin)
    if (filtros?.idRol != null) params.set("idRol", String(filtros.idRol))
    return apiFetch<UsuarioReporteItem[]>(
      `/usuarios/reporte?${params.toString()}`
    )
  },
}
