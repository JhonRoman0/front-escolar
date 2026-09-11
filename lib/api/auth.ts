import { apiFetch } from "@/lib/api"

// ─────────── Tipos (espejo de los DTOs del back Escolar) ───────────

export interface LoginRequest {
  codigo: string
  contraseña: string
}

export interface RolResponse {
  idRol: number
  nombre: string
  acceso: number
}

export interface UsuarioResponse {
  idUsuario: number
  nombre: string
  apellidoPat: string
  apellidoMat: string
  codigo: string
  documentoIdentidad: string | null
  acceso: number
  gmail: string | null
  fechaNaci: string | null
  urlFoto: string | null
  pkUrlFoto: string | null
  nombreRol: string | null
  roles: RolResponse[]
}

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

export interface LoginResponse {
  token: string
  usuario: UsuarioResponse
  permisos: PermisosRolResponse
  esAdmin: boolean
}

// ─────────── API ───────────

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async me(): Promise<UsuarioResponse> {
    return apiFetch<UsuarioResponse>("/auth/me")
  },
}