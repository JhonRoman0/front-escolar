"use client"

import { useRef } from "react"
import { ImageUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { MetodoPagoResponse } from "@/lib/api/pagos"

/**
 * Método de pago, código de transacción y foto del comprobante. Código y foto
 * solo aparecen si el método los pide. Se usa al matricular y en la diferencia
 * o devolución al editar.
 */
export function CamposPago({
  metodos,
  idMetodoPago,
  onMetodo,
  codigo,
  onCodigo,
  comprobante,
  onComprobante,
  errores,
}: {
  metodos: MetodoPagoResponse[]
  idMetodoPago: number
  onMetodo: (id: number) => void
  codigo: string
  onCodigo: (codigo: string) => void
  comprobante: File | null
  onComprobante: (archivo: File | null) => void
  errores?: { metodo?: string; codigo?: string; comprobante?: string }
}) {
  const metodo = metodos.find((m) => m.idMetodoPago === idMetodoPago)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Método de pago *</FieldLabel>
        <FieldContent>
          <Select value={idMetodoPago ? String(idMetodoPago) : ""} onValueChange={(v) => onMetodo(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={metodos.length ? "Selecciona" : "Sin métodos activos"}>
                {metodo?.nombre}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {metodos.map((m) => (
                  <SelectItem key={m.idMetodoPago} value={String(m.idMetodoPago)}>{m.nombre}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={errores?.metodo ? [{ message: errores.metodo }] : []} />
        </FieldContent>
      </Field>
      {metodo?.requiereCodigo && (
        <Field>
          <FieldLabel>Código de transacción *</FieldLabel>
          <FieldContent>
            <Input placeholder="N.º de operación" maxLength={60} value={codigo} onChange={(e) => onCodigo(e.target.value)} />
            <FieldError errors={errores?.codigo ? [{ message: errores.codigo }] : []} />
          </FieldContent>
        </Field>
      )}
      {metodo?.requiereComprobante && (
        <div className="sm:col-span-2">
          <CampoComprobante archivo={comprobante} onArchivo={onComprobante} error={errores?.comprobante} />
        </div>
      )}
    </div>
  )
}

function CampoComprobante({
  archivo,
  onArchivo,
  error,
}: {
  archivo: File | null
  onArchivo: (archivo: File | null) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = archivo ? URL.createObjectURL(archivo) : null

  return (
    <Field>
      <FieldLabel>Foto del comprobante *</FieldLabel>
      <FieldContent>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onArchivo(file)
            e.target.value = ""
          }}
        />
        {preview ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob) */}
            <img src={preview} alt="Comprobante" className="h-16 w-16 rounded object-cover" />
            <p className="min-w-0 flex-1 truncate text-sm">{archivo?.name}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar comprobante" onClick={() => onArchivo(null)}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="justify-start" onClick={() => inputRef.current?.click()}>
            <ImageUp data-icon="inline-start" />
            Subir foto del comprobante
          </Button>
        )}
        <FieldError errors={error ? [{ message: error }] : []} />
      </FieldContent>
    </Field>
  )
}

/** Mensajes de código y comprobante que exige el método elegido. */
export function erroresDePago(
  metodo: MetodoPagoResponse | undefined,
  codigo: string,
  comprobante: File | null
): { metodo?: string; codigo?: string; comprobante?: string } {
  if (!metodo) return { metodo: "Selecciona el método de pago" }
  return {
    codigo: metodo.requiereCodigo && !codigo.trim() ? "El código de transacción es obligatorio" : undefined,
    comprobante: metodo.requiereComprobante && !comprobante ? "La foto del comprobante es obligatoria" : undefined,
  }
}

export function formatoSoles(monto: number | null | undefined): string {
  if (monto == null) return "—"
  return `S/ ${Number(monto).toFixed(2)}`
}
