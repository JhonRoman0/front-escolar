import { apiFetch, formulario } from "@/lib/api"
import type { Paginated } from "@/lib/api/seguridad"

// ── Historial de cambios de sección ─────────────────────────────────────

export interface HistorialResponse {
  idHistorial: number
  idGradoSeccion: number
  grado: string
  seccion: string
  turno: string
  idAnio: number
  anio: string
  nivel: string
  fechaInicio: string
  fechaFinal: string | null
  motivo: string | null
}

// ── Matrícula ────────────────────────────────────────────────────────────

// Estado del año: define qué se puede editar o eliminar.
export const ANIO_VIGENTE = 1
export const ANIO_CERRADO = 2
export const ANIO_POR_COMENZAR = 3

export interface FichaTrayectoria {
  idMatricula: number
  anio: string
  nivel: string
  gradoSeccion: string
  turno: string
  estado: string
}

// ≡ GET /matriculas/{id}/ficha
export interface FichaMatricula {
  alumno: {
    codigo: string
    documentoIdentidad: string | null
    nombre: string
    sexo: string | null
    fechaNacimiento: string | null
    direccion: string | null
    // null: no tiene.
    discapacidad: string | null
    urlFoto: string | null
  }
  matricula: FichaTrayectoria
  fechaRegistro: string | null
  registradoPor: string
  apoderados: {
    nombre: string
    documentoIdentidad: string | null
    parentesco: string | null
    celular: string | null
    gmail: string | null
    direccion: string | null
    principal: boolean
  }[]
  trayectoria: FichaTrayectoria[]
}

export interface MatriculaResponse {
  idMatricula: number
  idAlumno: number
  idAlumnoApoderado: number
  codigoAlumno: string
  documentoAlumno: string | null
  alumno: string
  apoderado: string
  idUsuario: number
  usuarioRegistro: string
  idGradoSeccion: number
  idNivel: number
  nivel: string
  idGrado: number
  grado: string
  seccion: string
  idTurno: number
  turno: string
  idAnio: number
  anio: string
  estadoAnio: number
  monto: number | null
  pagadoNeto: number
  metodoPago: string | null
  fechaRegistro: string
  observaciones: string | null
  accesoId: number | null
  historial: HistorialResponse[]
  // false: algún apoderado nuevo no recibió sus accesos; null: no había a quién enviarlos.
  credencialesEnviadas?: boolean | null
}

export interface PagoMatriculaResponse {
  idPago: number
  tipo: "PAGO" | "DIFERENCIA" | "DEVOLUCION"
  monto: number
  metodoPago: string
  codigoTransaccion: string | null
  urlComprobante: string | null
  fecha: string
  registradoPor: string
}

// ── Asistente de inscripción ─────────────────────────────────────────────

export type EstadoApoderado = "APODERADO" | "USUARIO" | "NUEVO"

export interface ApoderadoBusqueda {
  estado: EstadoApoderado
  idApoderado: number | null
  documentoIdentidad: string
  nombre: string | null
  apellidoPat: string | null
  apellidoMat: string | null
  fechaNaci: string | null
  sexo: string | null
  direccion: string | null
  celular: string | null
  gmail: string | null
  idParentesco: number | null
  hijos: string[]
}

export interface AlumnoBusqueda {
  existe: boolean
  idAlumno: number | null
  documentoIdentidad: string
  nombre: string | null
  apellidoPat: string | null
  apellidoMat: string | null
  fechaNacimiento: string | null
  sexo: string | null
  direccion: string | null
  tieneDiscapacidad: boolean
  discapacidad: string | null
  urlFoto: string | null
  ultimaMatricula: string | null
  apoderados: ApoderadoBusqueda[] | null
}

export interface InscripcionAlumno {
  documentoIdentidad: string
  nombre: string
  apellidoPat: string
  apellidoMat: string
  fechaNacimiento: string
  sexo: string
  direccion: string
  tieneDiscapacidad: boolean
  discapacidad: string | null
}

export interface InscripcionApoderado {
  documentoIdentidad: string
  nombre?: string | null
  apellidoPat?: string | null
  apellidoMat?: string | null
  fechaNaci?: string | null
  sexo?: string | null
  direccion?: string | null
  idParentesco: number
  celular?: string | null
  gmail?: string | null
}

export interface InscripcionRequest {
  alumno: InscripcionAlumno
  apoderados: InscripcionApoderado[]
  matricula?: {
    idGradoSeccion: number
    idMetodoPago: number
    codigoTransaccion?: string | null
    observaciones?: string | null
  }
}

export interface SeccionOpcion {
  idGradoSeccion: number
  seccion: string
  idTurno: number
  turno: string
  capacidad: number
  ocupados: number
}

export interface GradoOpcion {
  idGrado: number
  grado: string
  idNivel: number
  nivel: string
  monto: number | null
  sugerido: boolean
  secciones: SeccionOpcion[]
}

export interface MatriculaOpciones {
  bloqueo: string | null
  ultimoGrado: string | null
  grados: GradoOpcion[]
}

export interface MatriculaEdicionRequest {
  idGradoSeccion?: number | null
  idMetodoPago?: number | null
  codigoTransaccion?: string | null
  observaciones?: string | null
}

// El back recibe los datos como parte JSON y los archivos aparte.
// ── API ──────────────────────────────────────────────────────────────────

export const matriculasApi = {
  async listar(page = 0, size = 10, idAcceso?: number, idAnio?: number): Promise<Paginated<MatriculaResponse>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (idAcceso != null) params.set("idAcceso", String(idAcceso))
    if (idAnio != null) params.set("idAnio", String(idAnio))
    return apiFetch<Paginated<MatriculaResponse>>(
      `/matriculas?${params.toString()}`
    )
  },
  async porId(id: number): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>(`/matriculas/${id}`)
  },
  async pagos(id: number): Promise<PagoMatriculaResponse[]> {
    return apiFetch<PagoMatriculaResponse[]>(`/matriculas/${id}/pagos`)
  },
  async validarDniAlumno(dni: string): Promise<void> {
    return apiFetch<void>(`/matriculas/inscripcion/alumno/validar-dni/${encodeURIComponent(dni)}`)
  },
  async buscarAlumno(dni: string): Promise<AlumnoBusqueda> {
    return apiFetch<AlumnoBusqueda>(`/matriculas/inscripcion/alumno/${encodeURIComponent(dni)}`)
  },
  async buscarApoderado(dni: string, idAlumno?: number | null): Promise<ApoderadoBusqueda> {
    const params = idAlumno ? `?idAlumno=${idAlumno}` : ""
    return apiFetch<ApoderadoBusqueda>(
      `/matriculas/inscripcion/apoderado/${encodeURIComponent(dni)}${params}`
    )
  },
  async opciones(idAnio: number, idAlumno?: number | null, idMatricula?: number | null): Promise<MatriculaOpciones> {
    const params = new URLSearchParams({ idAnio: String(idAnio) })
    if (idAlumno) params.set("idAlumno", String(idAlumno))
    if (idMatricula) params.set("idMatricula", String(idMatricula))
    return apiFetch<MatriculaOpciones>(`/matriculas/opciones?${params.toString()}`)
  },
  async validar(data: InscripcionRequest): Promise<void> {
    return apiFetch<void>("/matriculas/inscripcion/validar", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  ficha(idMatricula: number): Promise<FichaMatricula> {
    return apiFetch<FichaMatricula>(`/matriculas/${idMatricula}/ficha`)
  },
  async inscribir(data: InscripcionRequest, foto: File | null, comprobante: File | null): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>("/matriculas/inscripcion", {
      method: "POST",
      body: formulario(data, { foto, comprobante }),
    })
  },
  async editar(id: number, data: MatriculaEdicionRequest, comprobante: File | null): Promise<MatriculaResponse> {
    return apiFetch<MatriculaResponse>(`/matriculas/${id}`, {
      method: "PUT",
      body: formulario(data, { comprobante }),
    })
  },
  async cambioSeccion(
    id: number,
    idGradoSeccion: number,
    motivo?: string
  ): Promise<MatriculaResponse> {
    const params = new URLSearchParams({ idGradoSeccion: String(idGradoSeccion) })
    if (motivo) params.set("motivo", motivo)
    return apiFetch<MatriculaResponse>(
      `/matriculas/${id}/cambio-seccion?${params.toString()}`,
      { method: "POST" }
    )
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/matriculas/${id}`, { method: "DELETE" })
  },
}
