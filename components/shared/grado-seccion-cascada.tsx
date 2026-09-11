"use client"

import { useState } from "react"
import { useNiveles, useGradosPorNivel, useSeccionesPorGrado } from "@/hooks/use-academico"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GradoSeccionCascadaProps {
  value: number | null
  onChange: (idGradoSeccion: number | null) => void
  className?: string
  disabled?: boolean
  allowedAnios?: Set<number>
  defaultIdNivel?: number | null
  defaultIdGrado?: number | null
  showLabels?: boolean
}

export function GradoSeccionCascada({
  value,
  onChange,
  className,
  disabled,
  allowedAnios,
  defaultIdNivel = null,
  defaultIdGrado = null,
  showLabels = true,
}: GradoSeccionCascadaProps) {
  const { data: niveles = [] } = useNiveles()
  const [idNivel, setIdNivel] = useState<number | null>(defaultIdNivel)
  const [idGrado, setIdGrado] = useState<number | null>(defaultIdGrado)

  const { data: todosGrados = [] } = useGradosPorNivel(idNivel)
  const grados = allowedAnios
    ? todosGrados.filter((g) => allowedAnios.has(g.idAnio))
    : todosGrados
  const { data: secciones = [] } = useSeccionesPorGrado(idGrado)

  const gradoSel = grados.find((g) => g.idGrado === idGrado)
  const esInicial = !!gradoSel && secciones.length === 0 && gradoSel.idGradoSeccionDefault != null

  function cambiarNivel(v: string | null) {
    const nuevo = v ? Number(v) : null
    setIdNivel(nuevo)
    setIdGrado(null)
    onChange(null)
  }

  function cambiarGrado(v: string | null) {
    const nuevo = v ? Number(v) : null
    setIdGrado(nuevo)
    const grado = grados.find((g) => g.idGrado === nuevo)
    if (grado && grado.idGradoSeccionDefault != null && grado.secciones.length === 0) {
      onChange(grado.idGradoSeccionDefault)
    } else {
      onChange(null)
    }
  }

  function findLabel() {
    if (!value) return null
    const s = secciones.find((sec) => sec.idGradoSeccion === value)
    return s ? `${s.nombre} (${s.turno})` : null
  }

  const label = findLabel()

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
        {esInicial ? (
          <div className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
            Única
          </div>
        ) : (
          <Select
            value={value ? String(value) : ""}
            onValueChange={(v) => onChange(v ? Number(v) : null)}
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
        )}
      </div>
    </div>
  )
}
