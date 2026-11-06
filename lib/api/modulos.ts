import { apiFetch } from "@/lib/api"

export interface PermisoResponse {
  idPermiso: number
  codigo: string
  nombre: string
  acciones: string[]
  /** Nombre de cada acción en este módulo ("Importar, copiar…"); si falta se usa el genérico. */
  etiquetas?: Record<string, string> | null
  accesoId: number | null
}

export interface ModuloResponse {
  idModulo: number
  modulo: string
  icono: string | null
  accesoId: number | null
  permisos: PermisoResponse[]
}

export const modulosApi = {
  async listar(): Promise<ModuloResponse[]> {
    return apiFetch<ModuloResponse[]>("/modulos")
  },
}