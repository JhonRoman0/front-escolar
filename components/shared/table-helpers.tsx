"use client"

import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { ACCESO } from "@/lib/api/academico"

interface CampoAccesoProps {
  value?: number
  onChange: (value: number) => void
}

export function CampoAcceso({ value, onChange }: CampoAccesoProps) {
  const label = value === ACCESO.ACTIVO ? "Activo" : "Inactivo"
  return (
    <Select
      value={String(value ?? ACCESO.ACTIVO)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* SelectGroup no es decorativo: su p-1 deja el texto del ítem a 10px,
            igual que el pl-2.5 del trigger, que es lo que impide que Base UI
            desplace el desplegable 4px a la derecha al alinear ítem y valor. */}
        <SelectGroup>
          <SelectItem value={String(ACCESO.ACTIVO)}>Activo</SelectItem>
          <SelectItem value={String(ACCESO.INACTIVO)}>Inactivo</SelectItem>
        </SelectGroup>
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
  /** Solo se usa si `puedeEliminar` es true, por eso es opcional. */
  onEliminar?: () => Promise<void>
  /** Solo se usan si `puedeEliminar` es true, por eso son opcionales. */
  tituloEliminar?: string
  descripcionEliminar?: string
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
      {puedeEliminar && onEliminar && (
        <ConfirmarEliminar
          titulo={tituloEliminar ?? ""}
          descripcion={descripcionEliminar ?? ""}
          onConfirm={onEliminar}
        />
      )}
    </div>
  )
}
