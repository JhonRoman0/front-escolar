"use client"

import { useEffect, useState } from "react"
import { FilterSelect } from "@/components/shared/filter-select"
import { useNiveles, useGradosPorNivel, useSeccionesPorGrado } from "@/hooks/use-academico"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SeccionInfo {
  idGradoSeccion: number
  nombreSeccion: string
  turno: string
}

interface GradoSeccionCascadaProps {
  value: number | null
  onChange: (idGradoSeccion: number | null) => void
  onSeccionInfo?: (info: SeccionInfo | null) => void
  className?: string
  disabled?: boolean
  allowedAnios?: Set<number>
  defaultIdNivel?: number | null
  defaultIdGrado?: number | null
  idNivel?: number | null
  idGrado?: number | null
  onNivelChange?: (idNivel: number | null) => void
  onGradoChange?: (idGrado: number | null) => void
  showLabels?: boolean
  /** Como los demás filtros de barra: etiqueta dentro del botón, en una fila. */
  compacta?: boolean
}

export function GradoSeccionCascada({
  value,
  onChange,
  onSeccionInfo,
  className,
  disabled,
  allowedAnios,
  defaultIdNivel = null,
  defaultIdGrado = null,
  idNivel: idNivelControlado,
  idGrado: idGradoControlado,
  onNivelChange,
  onGradoChange,
  showLabels = true,
  compacta = false,
}: GradoSeccionCascadaProps) {
  const { data: niveles = [] } = useNiveles()
  const [idNivelLocal, setIdNivelLocal] = useState<number | null>(defaultIdNivel)
  const [idGradoLocal, setIdGradoLocal] = useState<number | null>(defaultIdGrado)
  const idNivel = idNivelControlado !== undefined ? idNivelControlado : idNivelLocal
  const idGrado = idGradoControlado !== undefined ? idGradoControlado : idGradoLocal

  // Los grados son comunes a todos los años; lo que es de cada año son sus
  // secciones. Un grado aparece si tiene secciones en el año, y solo esas.
  const { data: todosGrados = [] } = useGradosPorNivel(idNivel)
  const grados = allowedAnios
    ? todosGrados.filter((g) =>
        g.secciones.some((s) => allowedAnios.has(s.idAnio)) ||
        (g.secciones.length === 0 && allowedAnios.has(g.idAnio)))
    : todosGrados
  const { data: seccionesGrado = [] } = useSeccionesPorGrado(idGrado)
  const secciones = allowedAnios
    ? seccionesGrado.filter((s) => allowedAnios.has(s.idAnio))
    : seccionesGrado

  useEffect(() => {
    if (value && secciones.length > 0) {
      const sec = secciones.find((s) => s.idGradoSeccion === value)
      if (sec) {
        onSeccionInfo?.({ idGradoSeccion: sec.idGradoSeccion, nombreSeccion: sec.nombre, turno: sec.turno })
      }
    }
  }, [value, secciones, onSeccionInfo])

  function ponerNivel(nuevo: number | null) {
    if (idNivelControlado === undefined) setIdNivelLocal(nuevo)
    onNivelChange?.(nuevo)
  }

  function ponerGrado(nuevo: number | null) {
    if (idGradoControlado === undefined) setIdGradoLocal(nuevo)
    onGradoChange?.(nuevo)
  }

  function cambiarNivel(v: string | null) {
    const nuevo = v ? Number(v) : null
    ponerNivel(nuevo)
    ponerGrado(null)
    onChange(null)
  }

  function cambiarGrado(v: string | null) {
    const nuevo = v ? Number(v) : null
    ponerGrado(nuevo)
    const grado = grados.find((g) => g.idGrado === nuevo)
    if (grado && grado.idGradoSeccionDefault != null && grado.secciones.length === 0) {
      onChange(grado.idGradoSeccionDefault)
      onSeccionInfo?.({
        idGradoSeccion: grado.idGradoSeccionDefault,
        nombreSeccion: "Única",
        turno: grado.turno,
      })
    } else {
      onChange(null)
      onSeccionInfo?.(null)
    }
  }

  function findLabel() {
    if (!value) return null
    const s = secciones.find((sec) => sec.idGradoSeccion === value)
    return s ? `${s.nombre} (${s.turno})` : null
  }

  const label = findLabel()

  function cambiarSeccion(v: string | null) {
    const id = v ? Number(v) : null
    onChange(id)
    const sec = id ? secciones.find((s) => s.idGradoSeccion === id) : null
    onSeccionInfo?.(sec ? { idGradoSeccion: sec.idGradoSeccion, nombreSeccion: sec.nombre, turno: sec.turno } : null)
  }

  if (compacta) {
    return (
      <>
        <FilterSelect
          label="Nivel"
          value={idNivel ? String(idNivel) : ""}
          onValueChange={cambiarNivel}
          options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
          includeAll={false}
          allLabel="Elige"
          className="w-[170px]"
          disabled={disabled}
        />
        <FilterSelect
          label="Grado"
          value={idGrado ? String(idGrado) : ""}
          onValueChange={cambiarGrado}
          options={grados.map((g) => ({ value: String(g.idGrado), label: g.nombre }))}
          includeAll={false}
          allLabel="Elige"
          className="w-[140px]"
          disabled={disabled || !idNivel}
        />
        <FilterSelect
          label="Sección"
          value={value ? String(value) : ""}
          onValueChange={cambiarSeccion}
          options={secciones.map((s) => ({ value: String(s.idGradoSeccion), label: `${s.nombre} (${s.turno})` }))}
          includeAll={false}
          allLabel="Elige"
          className="w-[180px]"
          disabled={disabled || !idGrado}
        />
      </>
    )
  }

  return (
    <div className={className ? `grid grid-cols-1 gap-2 sm:grid-cols-3 ${className}` : "grid grid-cols-1 gap-2 sm:grid-cols-3"}>
      <div className="flex flex-col gap-1">
        {showLabels && (
          <label className="text-xs font-medium text-muted-foreground">
            Nivel
          </label>
        )}
        <Select
          value={idNivel ? String(idNivel) : ""}
          onValueChange={cambiarNivel}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue>{niveles.find((n) => n.idNivel === idNivel)?.nombre ?? "Nivel"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {niveles.map((n) => (
              <SelectItem key={n.idNivel} value={String(n.idNivel)}>
                {n.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        {showLabels && (
          <label className="text-xs font-medium text-muted-foreground">
            Grado
          </label>
        )}
        <Select
          value={idGrado ? String(idGrado) : ""}
          onValueChange={cambiarGrado}
          disabled={disabled || !idNivel}
        >
          <SelectTrigger>
            <SelectValue>{grados.find((g) => g.idGrado === idGrado)?.nombre ?? "Grado"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {grados.map((g) => (
              <SelectItem key={g.idGrado} value={String(g.idGrado)}>
                {g.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        {showLabels && (
          <label className="text-xs font-medium text-muted-foreground">
            Sección
          </label>
        )}
        <Select
          value={value ? String(value) : ""}
          onValueChange={cambiarSeccion}
          disabled={disabled || !idGrado}
        >
          <SelectTrigger>
            <SelectValue>{label ?? "Sección"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {secciones.map((s) => (
              <SelectItem key={s.idGradoSeccion} value={String(s.idGradoSeccion)}>
                {s.nombre} ({s.turno})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
