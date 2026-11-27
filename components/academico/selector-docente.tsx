"use client"

import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { coincideBusqueda, tokensBusqueda } from "@/lib/busqueda"

type DocenteOpcion = { id: number; nombre: string }

export function SelectorDocente({ docentes, valor, onChange, etiqueta, sinSustituto }: {
  docentes: DocenteOpcion[]
  valor?: number | null
  onChange: (id: number | null) => void
  etiqueta: string
  sinSustituto?: boolean
}) {
  const opciones = sinSustituto ? [{ id: 0, nombre: "Sin sustituto" }, ...docentes] : docentes
  return (
    <Combobox.Root
      items={opciones}
      value={opciones.find((docente) => docente.id === (valor ?? (sinSustituto ? 0 : null))) ?? null}
      onValueChange={(docente) => onChange(docente?.id || null)}
      isItemEqualToValue={(a, b) => a.id === b.id}
      itemToStringLabel={(docente) => docente.nombre}
      filter={(docente, consulta) => coincideBusqueda([docente.nombre], tokensBusqueda(consulta))}
      autoHighlight
    >
      <div className="relative">
        <Combobox.Input render={<Input className="w-full pr-9" />} aria-label={etiqueta}
          placeholder={sinSustituto ? "Sin sustituto" : "Buscar por nombre o apellido"} />
        <Combobox.Trigger
          type="button"
          aria-label={etiqueta}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground"
        >
          <ChevronDown className="size-4" />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-[60] w-[var(--anchor-width)]">
          <Combobox.Popup className="rounded-md border bg-popover text-popover-foreground shadow-md">
            <Combobox.Empty className="p-2 text-sm text-muted-foreground empty:hidden">
              No se encontraron docentes.
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(16rem,var(--available-height))] overflow-auto p-1 empty:hidden">
              {(docente: DocenteOpcion) => (
                <Combobox.Item key={docente.id} value={docente}
                  className="cursor-default rounded-sm px-2 py-1.5 text-sm data-highlighted:bg-sidebar-accent data-highlighted:text-sidebar-accent-foreground">
                  {docente.nombre}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
