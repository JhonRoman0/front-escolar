import { apiFetch } from "@/lib/api"

// ── Tipos (≈ DTOs del back) ─────────────────────────────────────────────

export interface PublicacionResponse {
  idPublicacion: number
  idUsuario: number
  autor: string
  titulo: string
  slug: string | null
  contenido: string | null
  imagenPortadaUrl: string | null
  categoria: string | null
  esDestacado: number
  estado: number
  fechaPublicacion: string
  fechaActualizacion: string
  accesoId: number | null
}

export interface EventoResponse {
  idEvento: number
  titulo: string
  descripcion: string | null
  lugar: string | null
  fechaInicio: string
  fechaFin: string | null
  imagenUrl: string | null
  esPublico: number
  accesoId: number | null
}

export interface GaleriaDetalleResponse {
  idDetalle: number
  imagenUrl: string
  orden: number | null
}

export interface GaleriaResponse {
  idGaleria: number
  titulo: string
  descripcion: string | null
  fecha: string
  accesoId: number | null
  detalles: GaleriaDetalleResponse[]
}

export interface AjusteResponse {
  idAjuste: number
  clave: string
  valor: string
  accesoId: number | null
}

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

export interface ContactoMensajeResponse {
  idMensaje: number
  nombreRemitente: string
  correo: string
  celular: string | null
  asunto: string | null
  mensaje: string
  fechaEnvio: string
  estado: number
  idUsuario: number | null
  atendidoPor: string | null
  accesoId: number | null
}

// ── Endpoints públicos (sin auth) ────────────────────────────────────────

export const portalApi = {
  /** GET /portal/colegio — datos del colegio actual. */
  colegio(): Promise<ColegioResponse> {
    return apiFetch<ColegioResponse>("/portal/colegio")
  },

  /** GET /portal/publicaciones — publicaciones publicadas. */
  publicaciones(): Promise<PublicacionResponse[]> {
    return apiFetch<PublicacionResponse[]>("/portal/publicaciones")
  },

  /** GET /portal/eventos — eventos públicos. */
  eventos(): Promise<EventoResponse[]> {
    return apiFetch<EventoResponse[]>("/portal/eventos")
  },

  /** GET /portal/galerias — galerías con detalles. */
  galerias(): Promise<GaleriaResponse[]> {
    return apiFetch<GaleriaResponse[]>("/portal/galerias")
  },

  /** GET /portal/ajustes — ajustes clave-valor. */
  ajustes(): Promise<AjusteResponse[]> {
    return apiFetch<AjusteResponse[]>("/portal/ajustes")
  },

  /** POST /portal/contacto — enviar mensaje de contacto (sin auth). */
  contacto(mensaje: {
    nombreRemitente: string
    correo: string
    celular?: string
    asunto?: string
    mensaje: string
  }): Promise<ContactoMensajeResponse> {
    return apiFetch<ContactoMensajeResponse>("/portal/contacto", {
      method: "POST",
      body: JSON.stringify(mensaje),
    })
  },
}

// ── Admin CRUD (requiere auth + permisos PORTAL) ─────────────────────────

export interface PublicacionRequest {
  titulo: string
  slug?: string
  contenido?: string
  imagenPortadaUrl?: string
  categoria?: string
  esDestacado?: number
  estado?: number
}

export interface EventoRequest {
  titulo: string
  descripcion?: string
  lugar?: string
  fechaInicio: string
  fechaFin?: string
  esPublico?: number
}

export interface GaleriaRequest {
  titulo: string
  descripcion?: string
  fecha: string
  detalles?: { imagenUrl: string; orden?: number }[]
}

export interface AjusteRequest {
  clave: string
  valor: string
}

export interface ContactoMensajeUpdate {
  estado: number
}

export const portalAdminApi = {
  // ── Publicaciones ────────────────────────────────────────────────────
  listarPublicaciones(): Promise<PublicacionResponse[]> {
    return apiFetch<PublicacionResponse[]>("/publicaciones")
  },
  crearPublicacion(data: PublicacionRequest): Promise<PublicacionResponse> {
    return apiFetch<PublicacionResponse>("/publicaciones", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  actualizarPublicacion(id: number, data: PublicacionRequest): Promise<PublicacionResponse> {
    return apiFetch<PublicacionResponse>(`/publicaciones/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  eliminarPublicacion(id: number): Promise<void> {
    return apiFetch<void>(`/publicaciones/${id}`, { method: "DELETE" })
  },

  // ── Eventos ──────────────────────────────────────────────────────────
  listarEventos(): Promise<EventoResponse[]> {
    return apiFetch<EventoResponse[]>("/eventos")
  },
  crearEvento(data: EventoRequest): Promise<EventoResponse> {
    return apiFetch<EventoResponse>("/eventos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  actualizarEvento(id: number, data: EventoRequest): Promise<EventoResponse> {
    return apiFetch<EventoResponse>(`/eventos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  eliminarEvento(id: number): Promise<void> {
    return apiFetch<void>(`/eventos/${id}`, { method: "DELETE" })
  },

  // ── Galerías ─────────────────────────────────────────────────────────
  listarGalerias(): Promise<GaleriaResponse[]> {
    return apiFetch<GaleriaResponse[]>("/galerias")
  },
  crearGaleria(data: GaleriaRequest): Promise<GaleriaResponse> {
    return apiFetch<GaleriaResponse>("/galerias", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  actualizarGaleria(id: number, data: GaleriaRequest): Promise<GaleriaResponse> {
    return apiFetch<GaleriaResponse>(`/galerias/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  eliminarGaleria(id: number): Promise<void> {
    return apiFetch<void>(`/galerias/${id}`, { method: "DELETE" })
  },

  // ── Contactos ────────────────────────────────────────────────────────
  listarContactos(): Promise<ContactoMensajeResponse[]> {
    return apiFetch<ContactoMensajeResponse[]>("/contactos")
  },
  actualizarContacto(id: number, data: ContactoMensajeUpdate): Promise<ContactoMensajeResponse> {
    return apiFetch<ContactoMensajeResponse>(`/contactos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  // ── Ajustes ──────────────────────────────────────────────────────────
  listarAjustes(): Promise<AjusteResponse[]> {
    return apiFetch<AjusteResponse[]>("/ajustes")
  },
  crearAjuste(data: AjusteRequest): Promise<AjusteResponse> {
    return apiFetch<AjusteResponse>("/ajustes", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  actualizarAjuste(id: number, data: AjusteRequest): Promise<AjusteResponse> {
    return apiFetch<AjusteResponse>(`/ajustes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  eliminarAjuste(id: number): Promise<void> {
    return apiFetch<void>(`/ajustes/${id}`, { method: "DELETE" })
  },

  // ── Subida de imágenes (multipart/form-data) ────────────────────────
  // Re-subir reemplaza: el back elimina la anterior de Cloudinary solo.
  // Mutaciones devuelven la entidad actualizada; deletes devuelven 204.

  /** POST /publicaciones/{id}/imagen — campo del form: imagen (1 archivo). */
  async subirImagenPublicacion(id: number, file: File): Promise<PublicacionResponse> {
    const formData = new FormData()
    formData.append("imagen", file)
    return apiFetch<PublicacionResponse>(`/publicaciones/${id}/imagen`, {
      method: "POST",
      body: formData,
    })
  },

  /** DELETE /publicaciones/{id}/imagen — borra la portada (204). */
  async eliminarImagenPublicacion(id: number): Promise<void> {
    return apiFetch<void>(`/publicaciones/${id}/imagen`, { method: "DELETE" })
  },

  /** POST /eventos/{id}/imagen — campo del form: imagen (1 archivo). */
  async subirImagenEvento(id: number, file: File): Promise<EventoResponse> {
    const formData = new FormData()
    formData.append("imagen", file)
    return apiFetch<EventoResponse>(`/eventos/${id}/imagen`, {
      method: "POST",
      body: formData,
    })
  },

  /** DELETE /eventos/{id}/imagen (204). */
  async eliminarImagenEvento(id: number): Promise<void> {
    return apiFetch<void>(`/eventos/${id}/imagen`, { method: "DELETE" })
  },

  /** POST /galerias/{id}/fotos — campo del form: fotos (repetir por archivo). */
  async subirFotosGaleria(id: number, files: File[]): Promise<GaleriaResponse> {
    const formData = new FormData()
    for (const file of files) {
      formData.append("fotos", file)
    }
    return apiFetch<GaleriaResponse>(`/galerias/${id}/fotos`, {
      method: "POST",
      body: formData,
    })
  },

  /** DELETE /galerias/fotos/{idDetalle} — borra UNA foto (204). */
  async eliminarFotoGaleria(idDetalle: number): Promise<void> {
    return apiFetch<void>(`/galerias/fotos/${idDetalle}`, { method: "DELETE" })
  },
}
