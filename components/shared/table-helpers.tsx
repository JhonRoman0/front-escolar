"use client"

import { Pencil, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"

interface CampoAccesoProps {
  value?: number
  onChange: (value: number) => void
}

export function CampoAcceso({ value, onChange }: CampoAccesoProps) {
  const label = value === 1 ? "Activo" : "Inactivo"
  return (
    <Select
      value={String(value ?? 1)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Activo</SelectItem>
        <SelectItem value="0">Inactivo</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function FilasCargando({
  columnas,
  filas = 5,
}: {
  columnas: number
  filas?: number
}) {
  return (
    <>
      {Array.from({ length: filas }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnas }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function CargandoTarjetas({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3">
          <Skeleton className="mb-3 h-4 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MensajeSinDatos({
  columnas,
  mensaje,
}: {
  columnas: number
  mensaje: string
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={columnas}
        className="h-24 text-center text-muted-foreground"
      >
        {mensaje}
      </TableCell>
    </TableRow>
  )
}

export function HeaderTabla({
  titulo,
  descripcion,
  puedeCrear,
  onNuevo,
}: {
  titulo: string
  descripcion: string
  puedeCrear: boolean
  onNuevo: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {puedeCrear && (
        <Button onClick={onNuevo}>
          <Plus />
          Nuevo
        </Button>
      )}
    </div>
  )
}

export function AccionesFila({
  puedeActualizar,
  puedeEliminar,
  onEditar,
  onEliminar,
  tituloEliminar,
  descripcionEliminar,
  ariaEditar,
}: {
  puedeActualizar: boolean
  puedeEliminar: boolean
  onEditar: () => void
  onEliminar: () => Promise<void>
  tituloEliminar: string
  descripcionEliminar: string
  ariaEditar: string
}) {
  return (
    <div className="flex justify-end gap-2">
      {puedeActualizar && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={ariaEditar}
          onClick={onEditar}
        >
          <Pencil />
        </Button>
      )}
      {puedeEliminar && (
        <ConfirmarEliminar
          titulo={tituloEliminar}
          descripcion={descripcionEliminar}
          onConfirm={onEliminar}
        />
      )}
    </div>
  )
}
