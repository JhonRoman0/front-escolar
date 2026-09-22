import { apiFetch } from "@/lib/api"
import type { Paginated } from "@/lib/api/seguridad"

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
  parentesco: string | null
  documentoIdentidad: string | null
  fechaNaci: string | null
  urlFoto: string | null
  accesoId: number | null
}

export interface ApoderadoRequest {
  nombre?: string | null
  apellidoPat?: string | null
  apellidoMat?: string | null
  gmail?: string | null
  contraseña?: string
  fechaNaci?: string | null
  documentoIdentidad?: string | null
  celular?: string | null
  direccion?: string | null
  parentesco?: string | null
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
  accesoId: number | null
  apoderados: ApoderadoResponse[]
}

export interface AlumnoRequest {
  nombre: string
  apellidoPat: string
  apellidoMat: string
  fechaNacimiento: string
  direccion?: string | null
  documentoIdentidad?: string | null
  apoderados?: ApoderadoRequest[] | null
  accesoId?: number | null
}

// ── API ──────────────────────────────────────────────────────────────────

export const alumnosApi = {
  async listar(page = 0, size = 10): Promise<Paginated<AlumnoResponse>> {
    return apiFetch<Paginated<AlumnoResponse>>(
      `/alumnos?page=${page}&size=${size}`
    )
  },
  async porId(id: number): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/${id}`)
  },
  async porDocumento(documento: string): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/dni/${encodeURIComponent(documento)}`)
  },
  async crear(data: AlumnoRequest): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>("/alumnos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(id: number, data: AlumnoRequest): Promise<AlumnoResponse> {
    return apiFetch<AlumnoResponse>(`/alumnos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/alumnos/${id}`, { method: "DELETE" })
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