"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CalendarioSemanal } from "@/components/horario/calendario-semanal"
import { useHorarioPortal, useRecreosPortal } from "@/hooks/use-portal-apoderado"
import { diaSemanaIso, formatearHora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { Cargando, ErrorCarga, Seccion, Vacio } from "./comunes"

const DIAS = [
  { valor: 1, corto: "Lun", largo: "Lunes" },
  { valor: 2, corto: "Mar", largo: "Martes" },
  { valor: 3, corto: "Mié", largo: "Miércoles" },
  { valor: 4, corto: "Jue", largo: "Jueves" },
  { valor: 5, corto: "Vie", largo: "Viernes" },
]

/** En pantallas grandes la semana completa; en el celular, un día a la vez. */
export function HorarioTab({ idMatricula }: { idMatricula: number }) {
  const { data, isLoading, error } = useHorarioPortal(idMatricula)
  // Recreos fijos del grado: se pintan como en el módulo Horario.
  const { data: recreos = [] } = useRecreosPortal(idMatricula)
  const hoy = diaSemanaIso(new Date())
  const [dia, setDia] = useState(hoy <= 5 ? hoy : 1)

  if (isLoading) return <Cargando />
  if (error || !data) return <ErrorCarga error={error} />
  if (data.length === 0) return <Vacio>El horario aún no está registrado.</Vacio>

  // Clases y recreos del día, en orden de hora.
  const delDia = [
    ...data.filter((h) => h.diaSemana === dia).map((c) => ({
      clave: `c${c.idHorario}`, horaInicio: c.horaInicio, horaFin: c.horaFin,
      titulo: c.curso, detalle: [c.docente, c.aula].filter(Boolean).join(" · "), recreo: false,
    })),
    ...recreos.filter((r) => r.diaSemana === dia).map((r, i) => ({
      clave: `r${i}`, horaInicio: r.horaInicio, horaFin: r.horaFin, titulo: "Recreo", detalle: "", recreo: true,
    })),
  ].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  return (
    <>
      <div className="hidden md:block">
        <CalendarioSemanal horarios={data} recreos={recreos} />
      </div>
      <Seccion titulo={DIAS.find((d) => d.valor === dia)?.largo ?? ""} className="md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {DIAS.map((d) => (
            <Button
              key={d.valor}
              size="sm"
              variant={d.valor === dia ? "default" : "outline"}
              onClick={() => setDia(d.valor)}
              className={cn(d.valor === hoy && d.valor !== dia && "border-primary")}
            >
              {d.corto}
            </Button>
          ))}
        </div>
        {delDia.length === 0 ? (
          <Vacio>No hay clases este día.</Vacio>
        ) : (
          <ul className="flex flex-col divide-y">
            {delDia.map((c) => (
              <li key={c.clave} className={cn("flex items-center gap-3 py-2", c.recreo && "rounded-md bg-muted/60 px-2")}>
                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                  {formatearHora(c.horaInicio)}–{formatearHora(c.horaFin)}
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", c.recreo && "text-muted-foreground")}>{c.titulo}</p>
                  {c.detalle && <p className="truncate text-xs text-muted-foreground">{c.detalle}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  )
}
