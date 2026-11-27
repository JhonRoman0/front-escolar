"use client"

import { BotonLimpiarFiltros } from "@/components/shared/boton-limpiar-filtros"
import { BuscadorTabla } from "@/components/shared/buscador-tabla"
import { FilterSelect, type FilterOption } from "@/components/shared/filter-select"

export function opcionesFiltro(etiquetas: Record<string, string>): FilterOption[] {
  return Object.entries(etiquetas).map(([value, label]) => ({ value, label }))
}

export function FiltrosCambiosDocente({ busqueda, onBuscar, placeholder, filtros, limpiar, reiniciarPagina }: {
  busqueda: string
  onBuscar: (texto: string) => void
  placeholder: string
  filtros: { label: string; value: string; onValueChange: (valor: string) => void; options: FilterOption[] }[]
  limpiar: () => void
  reiniciarPagina: () => void
}) {
  const hayFiltros = busqueda.trim() !== "" || filtros.some(({ value }) => value !== "")

  function aplicarCambio(cambiar: () => void) {
    cambiar()
    reiniciarPagina()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BuscadorTabla value={busqueda} onValueChange={(valor) => aplicarCambio(() => onBuscar(valor))} placeholder={placeholder} className="w-full sm:w-64" />
      {filtros.map((filtro) => (
        <FilterSelect key={filtro.label} {...filtro}
          onValueChange={(valor) => aplicarCambio(() => filtro.onValueChange(valor))}
        />
      ))}
      <BotonLimpiarFiltros visible={hayFiltros} onClick={() => aplicarCambio(limpiar)} />
    </div>
  )
}
