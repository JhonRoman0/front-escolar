import { apiFetch } from "@/lib/api"

export interface PermisoResponse {
  idPermiso: number
  codigo: string
  nombre: string
  acciones: string[]
  acceso: number
}

export interface ModuloResponse {
  idModulo: number
  modulo: string
  icono: string | null
  acceso: number
  permisos: PermisoResponse[]
}

export const modulosApi = {
  async listar(): Promise<ModuloResponse[]> {
    return apiFetch<ModuloResponse[]>("/modulos")
  },
}