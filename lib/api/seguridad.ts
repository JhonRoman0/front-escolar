import { apiFetch } from "@/lib/api"
import type {
  ModuloResponse,
  PermisoResponse,
} from "@/lib/api/modulos"

// Tipo movido a @/lib/api; se re-exporta por compatibilidad con los módulos existentes.
export type { Paginated } from "@/lib/api"
import type { Paginated } from "@/lib/api"

// ── Roles ────────────────────────────────────────────────────────────────

export interface RolResponse {
  idRol: number
  nombre: string
  color: string | null
  accesoId: number | null
}

export interface RolRequest {
  nombre: string
  color?: string | null
  accesoId?: number | null
}

export const rolesApi = {
  async listar(): Promise<RolResponse[]> {
    return apiFetch<RolResponse[]>("/roles")
  },
  async crear(data: RolRequest): Promise<RolResponse> {
    return apiFetch<RolResponse>("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(id: number, data: RolRequest): Promise<RolResponse> {
    return apiFetch<RolResponse>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/roles/${id}`, { method: "DELETE" })
  },
}

// ── Permisos ─────────────────────────────────────────────────────────────

export interface PermisoConModulo extends PermisoResponse {
  modulo: Pick<ModuloResponse, "idModulo" | "modulo" | "icono" | "accesoId">
}

export const permisosApi = {
  async listar(): Promise<PermisoConModulo[]> {
    return apiFetch<PermisoConModulo[]>("/permisos")
  },
}

// ── Acciones ─────────────────────────────────────────────────────────────

export interface AccionResponse {
  idAccion: number
  codigo: string
  nombre: string
  accesoId: number | null
}

export const accionesApi = {
  async listar(): Promise<AccionResponse[]> {
    return apiFetch<AccionResponse[]>("/acciones")
  },
}

// ── Roles-Permisos ───────────────────────────────────────────────────────

export interface PermisoAccionResponse {
  idPermiso: number
  codigo: string
  nombre: string
  accionesDisponibles: string[]
  accionesConcedidas: string[]
}

export interface ModuloPermisosResponse {
  idModulo: number
  modulo: string
  icono: string | null
  permisos: PermisoAccionResponse[]
}

export interface PermisosRolResponse {
  idRol: number | null
  nombreRol: string | null
  modulos: ModuloPermisosResponse[]
}

export interface RolPermisoResponse {
  idRolPermiso: number
  rol: RolResponse
  permiso: PermisoResponse
  acciones: string[]
  accesoId: number | null
}

export interface RolPermisoRequest {
  idRol: number
  idPermiso: number
  acciones?: string[]
  accesoId?: number | null
}

export const rolesPermisoApi = {
  async listar(): Promise<RolPermisoResponse[]> {
    return apiFetch<RolPermisoResponse[]>("/roles-permiso")
  },
  async porRol(idRol: number): Promise<PermisosRolResponse> {
    return apiFetch<PermisosRolResponse>(`/roles-permiso/rol/${idRol}`)
  },
  async crear(data: RolPermisoRequest): Promise<RolPermisoResponse> {
    return apiFetch<RolPermisoResponse>("/roles-permiso", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(
    id: number,
    data: RolPermisoRequest
  ): Promise<RolPermisoResponse> {
    return apiFetch<RolPermisoResponse>(`/roles-permiso/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/roles-permiso/${id}`, { method: "DELETE" })
  },
}

// ── Usuarios ─────────────────────────────────────────────────────────────

export interface UsuarioResponse {
  idUsuario: number
  nombre: string
  apellidoPat: string
  apellidoMat: string
  codigo: string
  documentoIdentidad: string | null
  accesoId: number | null
  gmail: string | null
  fechaNaci: string
  urlFoto: string | null
  pkUrlFoto: string | null
  intentosFallidos: number | null
  fechaBloqueo: string | null
  roles: RolResponse[]
}

export interface UsuarioRequest {
  nombre: string
  apellidoPat: string
  apellidoMat: string
  documentoIdentidad?: string | null
  contraseña?: string
  gmail?: string | null
  celular?: string | null
  fechaNaci: string
  accesoId?: number | null
  urlFoto?: string | null
  pkUrlFoto?: string | null
  rolIds: number[]
}

export const usuariosApi = {
  async listar(
    page = 0,
    size = 10,
    sort = "idUsuario,asc"
  ): Promise<Paginated<UsuarioResponse>> {
    return apiFetch<Paginated<UsuarioResponse>>(
      `/usuarios?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`
    )
  },
  async crear(data: UsuarioRequest): Promise<UsuarioResponse> {
    return apiFetch<UsuarioResponse>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async actualizar(
    id: number,
    data: UsuarioRequest
  ): Promise<UsuarioResponse> {
    return apiFetch<UsuarioResponse>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
  async eliminar(id: number): Promise<void> {
    return apiFetch<void>(`/usuarios/${id}`, { method: "DELETE" })
  },
  async desbloquear(id: number): Promise<void> {
    return apiFetch<void>(`/usuarios/${id}/desbloquear`, { method: "POST" })
  },
  async subirFoto(id: number, file: File): Promise<UsuarioResponse> {
    const formData = new FormData()
    formData.append("foto", file)
    return apiFetch<UsuarioResponse>(`/usuarios/${id}/foto`, {
      method: "POST",
      body: formData,
    })
  },
  async eliminarFoto(id: number): Promise<void> {
    return apiFetch<void>(`/usuarios/${id}/foto`, { method: "DELETE" })
  },
}