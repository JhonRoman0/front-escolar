import { apiFetch } from "@/lib/api"
import type { Paginated } from "@/lib/api/seguridad"
import type { InscripcionApoderado } from "@/lib/api/matricula"

// ── Apoderado ─────────────────────────────────────────────────────────────

export interface ApoderadoResponse {
  idApoderado: number
  idUsuario: number | null
  codigo: string | null
  nombre: string
  apellidoPat: string
  apellidoMat: string
  gmail: string | null
  celular: string | null
  direccion: string | null
  // El parentesco es del vínculo con un alumno: solo viene dentro de AlumnoResponse.
  idParentesco: number | null
  parentesco: string | null
  sexo: string | null
  principal: boolean
  documentoIdentidad: string | null
  fechaNaci: string | null
  urlFoto: string | null
  accesoId: number | null
}

// Edición desde Estudiantes: todo obligatorio; el parentesco es el del alumno indicado.
export interface ApoderadoEdicionRequest {
  documentoIdentidad: string
  nombre: string
  apellidoPat: string
  apellidoMat: string
  fechaNaci: string
  sexo: string
  direccion: string
  celular: string
  gmail: string
  idAlumno: number
  idParentesco: number
}

// ── Alumno ────────────────────────────────────────────────────────────────

export interface AlumnoResponse {
  idAlumno: number
  codigo: string
  codigoHash: string
  nombre: string
  apellidoPat: string
  apellidoMat: string
  fechaNacimiento: string
  direccion: string | null
  documentoIdentidad: string | null
  urlFoto: string | null
  sexo: string | null
  tieneDiscapacidad: boolean
  discapacidad: string | null
  accesoId: number | null
  apoderados: ApoderadoResponse[]
  // Enriquecido por GET /alumnos (matrícula vigente) — Figma 4 cols
  idNivel: number | null
  nivel: string
  idGrado: number | null
  grado: string
  idSeccion: number | null
  seccion: string
  idTurno: number | null
  turno: string
  idGradoSeccion: number | null
  idAnio: number | null
  anio: string
}

export interface AlumnosFiltros {
  idNivel?: number | null
  idGrado?: number | null
  idSeccion?: number | null
  idTurno?: number | null
  idGradoSeccion?: number | null
  idAnio?: number | null
  search?: string | null
}

// Del alumno solo se corrige la discapacidad (la foto va aparte).
export interface AlumnoEdicionRequest {
  tieneDiscapacidad: boolean
  discapacidad: string | null
}

// ── API ──────────────────────────────────────────────────────────────────

export const alumnosApi = {
  async listar(page = 0, size = 10, filtros?: AlumnosFiltros): Promise<Paginated<AlumnoResponse>> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: "idAlumno,asc",
    })
    if (filtros?.idNivel) params.set("idNivel", String(filtros.idNivel))
    if (filtros?.idGrado) params.set("idGrado", String(filtros.idGrado))
    if (filtros?.idSeccion) params.set("idSeccion", String(filtros.idSeccion))
    if (filtros?.idTurno) params.set("idTurno", String(filtros.idTurno))
    if (filtros?.idGradoSeccion) params.set("idGradoSeccion", String(filtros.idGradoSeccion))
    if (filtros?.idAnio) params.set("idAnio", String(filtros.idAnio))
    // search es filtro client-side opcional; no se envía al back
    return apiFetch<Paginated<AlumnoResponse>>(`/alumnos?${params.toString()}`)
  },
  async porId(id: number): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/${id}`)
  },
  async porDocumento(documento: string): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/dni/${encodeURIComponent(documento)}`)
  },
  async actualizar(id: number, data: AlumnoEdicionRequest): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async subirFoto(id: number, file: File): Promise<AlumnoResponse> {
    const formData = new FormData()
    formData.append("foto", file)
    return apiFetch<AlumnoResponse>(`/alumnos/${id}/foto`, {
      method: "POST",
      body: formData,
    })
  },
  async eliminarFoto(id: number): Promise<void> {
    return apiFetch<void>(`/alumnos/${id}/foto`, { method: "DELETE" })
  },
}

export const apoderadosApi = {
  async listar(): Promise<ApoderadoResponse[]> {
    return apiFetch<ApoderadoResponse[]>("/apoderados")
  },
  async porId(id: number): Promise<ApoderadoResponse> {
    return apiFetch<ApoderadoResponse>(`/apoderados/${id}`)
  },
  async porDocumento(documento: string): Promise<ApoderadoResponse> {
    return apiFetch<ApoderadoResponse>(
      `/apoderados/dni/${encodeURIComponent(documento)}`
    )
  },
  async agregar(idAlumno: number, data: InscripcionApoderado): Promise<ApoderadoResponse> {
    return apiFetch<ApoderadoResponse>(`/apoderados/alumno/${idAlumno}`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(id: number, data: ApoderadoEdicionRequest): Promise<ApoderadoResponse> {
    return apiFetch<ApoderadoResponse>(`/apoderados/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async subirFoto(idUsuario: number, file: File): Promise<{ urlFoto: string | null }> {
    const formData = new FormData()
    formData.append("foto", file)
    return apiFetch<{ urlFoto: string | null }>(`/usuarios/${idUsuario}/foto`, {
      method: "POST",
      body: formData,
    })
  },
  async eliminarFoto(idUsuario: number): Promise<void> {
    return apiFetch<void>(`/usuarios/${idUsuario}/foto`, { method: "DELETE" })
  },
}