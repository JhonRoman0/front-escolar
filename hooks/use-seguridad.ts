import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import {
  accionesApi,
  permisosApi,
  rolesApi,
  rolesPermisoApi,
  usuariosApi,
  type RolPermisoRequest,
  type RolRequest,
  type UsuarioRequest,
  type UsuariosFiltros,
} from "@/lib/api/seguridad"
import { useInvalidarMutacion } from "@/hooks/use-invalidar"

const KEYS = {
  usuarios: ["usuarios"] as const,
  roles: ["roles"] as const,
  permisos: ["permisos"] as const,
  acciones: ["acciones"] as const,
  rolesPermiso: ["roles-permiso"] as const,
}

// La lista de docentes se invalida junto con la de usuarios: al crear o editar
// un usuario con rol DOCENTE el backend crea/reactiva/elimina el registro del
// docente, y useDocenteDeUsuario se apoya en esa lista para saber si un usuario
// ya tiene docente sin recargar la página.
const KEYS_DOCENTES = ["docentes"] as const

// ── Queries ──────────────────────────────────────────────────────────────

export function useUsuarios(
  page: number,
  size = 10,
  filtros: UsuariosFiltros = {},
  sort = "idUsuario,asc"
) {
  return useQuery({
    queryKey: [...KEYS.usuarios, page, size, sort, filtros],
    queryFn: () => usuariosApi.listar(page, size, sort, filtros),
    placeholderData: keepPreviousData,
  })
}

export function useRoles(soloActivos = false) {
  return useQuery({
    queryKey: [...KEYS.roles, soloActivos],
    queryFn: () => rolesApi.listar(soloActivos),
    staleTime: 1000 * 60 * 30,
  })
}

export function usePermisos() {
  return useQuery({
    queryKey: KEYS.permisos,
    queryFn: permisosApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAcciones() {
  return useQuery({
    queryKey: KEYS.acciones,
    queryFn: accionesApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useRolesPermiso() {
  return useQuery({
    queryKey: KEYS.rolesPermiso,
    queryFn: rolesPermisoApi.listar,
    staleTime: 1000 * 60 * 30,
  })
}

export function useRolesPermisoDeRol(idRol: number | null) {
  return useQuery({
    queryKey: [...KEYS.rolesPermiso, "rol", idRol],
    queryFn: () => rolesPermisoApi.porRol(idRol as number),
    enabled: !!idRol,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────

export function useCrearUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios, KEYS_DOCENTES)
  return useMutation({
    mutationFn: (data: UsuarioRequest) => usuariosApi.crear(data),
    onSuccess: invalidar,
  })
}

export function useActualizarUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios, KEYS_DOCENTES)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UsuarioRequest }) =>
      usuariosApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios, KEYS_DOCENTES)
  return useMutation({
    mutationFn: (id: number) => usuariosApi.eliminar(id),
    onSuccess: invalidar,
  })
}

export function useReactivarUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios, KEYS_DOCENTES)
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UsuarioRequest
    }) => usuariosApi.reactivar(id, data),
    onSuccess: invalidar,
  })
}

export function useDesbloquearUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios)
  return useMutation({
    mutationFn: (id: number) => usuariosApi.desbloquear(id),
    onSuccess: invalidar,
  })
}

export function useSubirFotoUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios)
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      usuariosApi.subirFoto(id, file),
    onSuccess: invalidar,
  })
}

export function useEliminarFotoUsuario() {
  const invalidar = useInvalidarMutacion(KEYS.usuarios)
  return useMutation({
    mutationFn: (id: number) => usuariosApi.eliminarFoto(id),
    onSuccess: invalidar,
  })
}

export function useCrearRol() {
  const invalidar = useInvalidarMutacion(KEYS.roles)
  return useMutation({ mutationFn: rolesApi.crear, onSuccess: invalidar })
}

export function useActualizarRol() {
  const invalidar = useInvalidarMutacion(KEYS.roles, KEYS.usuarios)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RolRequest }) =>
      rolesApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarRol() {
  const invalidar = useInvalidarMutacion(KEYS.roles, KEYS.rolesPermiso)
  return useMutation({ mutationFn: rolesApi.eliminar, onSuccess: invalidar })
}

export function useCrearRolPermiso() {
  const invalidar = useInvalidarMutacion(KEYS.rolesPermiso, KEYS.roles)
  return useMutation({
    mutationFn: rolesPermisoApi.crear,
    onSuccess: invalidar,
  })
}

export function useActualizarRolPermiso() {
  const invalidar = useInvalidarMutacion(KEYS.rolesPermiso, KEYS.roles)
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: RolPermisoRequest
    }) => rolesPermisoApi.actualizar(id, data),
    onSuccess: invalidar,
  })
}

export function useEliminarRolPermiso() {
  const invalidar = useInvalidarMutacion(KEYS.rolesPermiso, KEYS.roles)
  return useMutation({
    mutationFn: (id: number) => rolesPermisoApi.eliminar(id),
    onSuccess: invalidar,
  })
}