import { apiFetch } from "@/lib/api"

// ── Tipos ────────────────────────────────────────────────────────────────

export interface ColegioResponse {
  idColegio: number
  nombre: string
  celular: string | null
  telefono: string | null
  direccion: string | null
  codigoColegio: string | null
  urlFoto: string | null
  urlPortal: string | null
  accesoId: number | null
}

export interface ColegioRequest {
  nombre: string
  celular?: string
  telefono?: string
  direccion?: string
  codigoColegio?: string
  urlFoto?: string
  urlPortal?: string
}

// ── API (requiere auth) ──────────────────────────────────────────────────

export const colegioApi = {
  /** GET /colegios/actual — el colegio singleton. */
  actual(): Promise<ColegioResponse> {
    return apiFetch<ColegioResponse>("/colegios/actual")
  },

  /** GET /colegios — todos los colegios (admin). */
  listar(): Promise<ColegioResponse[]> {
    return apiFetch<ColegioResponse[]>("/colegios")
  },

  /** GET /colegios/{id} */
  porId(id: number): Promise<ColegioResponse> {
    return apiFetch<ColegioResponse>(`/colegios/${id}`)
  },

  /** POST /colegios — crear (solo si no existe ninguno). */
  crear(data: ColegioRequest): Promise<ColegioResponse> {
    return apiFetch<ColegioResponse>("/colegios", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /** PUT /colegios/{id} — actualizar. */
  actualizar(id: number, data: ColegioRequest): Promise<ColegioResponse> {
    return apiFetch<ColegioResponse>(`/colegios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /** DELETE /colegios/{id} — soft delete. */
  eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/colegios/${id}`, { method: "DELETE" })
  },

  // ── Subida de imágenes (multipart/form-data) ────────────────────────
  // Re-subir reemplaza: el back elimina la anterior de Cloudinary solo.
  // POST devuelve el colegio actualizado; DELETE → 204 y deja el campo null.
  // ⚠️ La portada llega en "urlPortal" (nombre heredado del modelo en BD).

  /** POST /colegios/{id}/foto — campo del form: imagen (1 archivo). */
  async subirFoto(id: number, file: File): Promise<ColegioResponse> {
    const formData = new FormData()
    formData.append("imagen", file)
    return apiFetch<ColegioResponse>(`/colegios/${id}/foto`, {
      method: "POST",
      body: formData,
    })
  },

  /** DELETE /colegios/{id}/foto — borra la foto (204, urlFoto queda null). */
  async eliminarFoto(id: number): Promise<void> {
    return apiFetch<void>(`/colegios/${id}/foto`, { method: "DELETE" })
  },

  /** POST /colegios/{id}/portada — campo del form: imagen (1 archivo). */
  async subirPortada(id: number, file: File): Promise<ColegioResponse> {
    const formData = new FormData()
    formData.append("imagen", file)
    return apiFetch<ColegioResponse>(`/colegios/${id}/portada`, {
      method: "POST",
      body: formData,
    })
  },

  /** DELETE /colegios/{id}/portada — borra la portada (204, urlPortal queda null). */
  async eliminarPortada(id: number): Promise<void> {
    return apiFetch<void>(`/colegios/${id}/portada`, { method: "DELETE" })
  },
}
