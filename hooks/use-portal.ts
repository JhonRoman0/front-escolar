"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  portalApi,
  portalAdminApi,
  type PublicacionRequest,
  type EventoRequest,
  type GaleriaRequest,
  type AjusteRequest,
} from "@/lib/api/portal"

export type {
  PublicacionResponse,
  EventoResponse,
  GaleriaResponse,
  GaleriaDetalleResponse,
  AjusteResponse,
  ContactoMensajeResponse,
} from "@/lib/api/portal"

export function useColegioPublico() {
  return useQuery({
    queryKey: ["portal", "colegio"],
    queryFn: () => portalApi.colegio(),
    staleTime: 10 * 60 * 1000,
  })
}

export function usePublicaciones() {
  return useQuery({
    queryKey: ["portal", "publicaciones"],
    queryFn: () => portalApi.publicaciones(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEventos() {
  return useQuery({
    queryKey: ["portal", "eventos"],
    queryFn: () => portalApi.eventos(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGalerias() {
  return useQuery({
    queryKey: ["portal", "galerias"],
    queryFn: () => portalApi.galerias(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAjustes() {
  return useQuery({
    queryKey: ["portal", "ajustes"],
    queryFn: () => portalApi.ajustes(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useEnviarContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mensaje: {
      nombreRemitente: string
      correo: string
      celular?: string
      asunto?: string
      mensaje: string
    }) => portalApi.contacto(mensaje),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "contactos"] })
    },
  })
}

// ── Admin hooks ────────────────────────────────────────────────────────

export function useAdminPublicaciones() {
  return useQuery({
    queryKey: ["portal", "admin", "publicaciones"],
    queryFn: () => portalAdminApi.listarPublicaciones(),
  })
}

export function useCrearPublicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PublicacionRequest) => portalAdminApi.crearPublicacion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useActualizarPublicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PublicacionRequest }) =>
      portalAdminApi.actualizarPublicacion(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarPublicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarPublicacion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useAdminEventos() {
  return useQuery({
    queryKey: ["portal", "admin", "eventos"],
    queryFn: () => portalAdminApi.listarEventos(),
  })
}

export function useCrearEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EventoRequest) => portalAdminApi.crearEvento(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useActualizarEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EventoRequest }) =>
      portalAdminApi.actualizarEvento(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarEvento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useAdminGalerias() {
  return useQuery({
    queryKey: ["portal", "admin", "galerias"],
    queryFn: () => portalAdminApi.listarGalerias(),
  })
}

export function useCrearGaleria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GaleriaRequest) => portalAdminApi.crearGaleria(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useActualizarGaleria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GaleriaRequest }) =>
      portalAdminApi.actualizarGaleria(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarGaleria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarGaleria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useAdminContactos() {
  return useQuery({
    queryKey: ["portal", "admin", "contactos"],
    queryFn: () => portalAdminApi.listarContactos(),
  })
}

export function useActualizarContactoEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: number }) =>
      portalAdminApi.actualizarContacto(id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useAdminAjustes() {
  return useQuery({
    queryKey: ["portal", "admin", "ajustes"],
    queryFn: () => portalAdminApi.listarAjustes(),
  })
}

export function useCrearAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AjusteRequest) => portalAdminApi.crearAjuste(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useActualizarAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AjusteRequest }) =>
      portalAdminApi.actualizarAjuste(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarAjuste(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

// ── Subida de imágenes ──────────────────────────────────────────────────

export function useSubirImagenPublicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      portalAdminApi.subirImagenPublicacion(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarImagenPublicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarImagenPublicacion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useSubirImagenEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      portalAdminApi.subirImagenEvento(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarImagenEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => portalAdminApi.eliminarImagenEvento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useSubirFotosGaleria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) =>
      portalAdminApi.subirFotosGaleria(id, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}

export function useEliminarFotoGaleria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => portalAdminApi.eliminarFotoGaleria(idDetalle),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal"] }),
  })
}
