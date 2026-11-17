"use client"

import { useState } from "react"
import { Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterSelect } from "@/components/shared/filter-select"
import { useHijos } from "@/hooks/use-portal-apoderado"
import { AsistenciaTab } from "./asistencia-tab"
import { Cargando, ErrorCarga } from "./comunes"
import { HorarioTab } from "./horario-tab"
import { NotasTab } from "./notas-tab"
import { PagosTab } from "./pagos-tab"
import { ResumenTab } from "./resumen-tab"

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase()
}

/** Portal del apoderado: todo lo de su hijo, por año, de solo lectura. */
export function PortalApoderadoPage() {
  const { data: hijos, isLoading, error } = useHijos()
  const [idAlumno, setIdAlumno] = useState<number | null>(null)
  const [idMatricula, setIdMatricula] = useState<number | null>(null)

  if (isLoading) return <Cargando />
  if (error) return <ErrorCarga error={error} />
  if (!hijos || hijos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Users className="mb-3 size-10 opacity-40" />
          <p className="text-sm font-medium">No hay alumnos vinculados a tu cuenta.</p>
          <p className="text-xs">Si crees que es un error, comunícate con el colegio.</p>
        </CardContent>
      </Card>
    )
  }

  const hijo = hijos.find((h) => h.idAlumno === idAlumno) ?? hijos[0]
  // Por defecto, la matrícula del año vigente (o la más reciente).
  const matricula =
    hijo.matriculas.find((m) => m.idMatricula === idMatricula) ??
    hijo.matriculas.find((m) => m.vigente) ??
    hijo.matriculas[0]

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-14">
              {hijo.urlFoto && <AvatarImage src={hijo.urlFoto} alt={hijo.nombre} />}
              <AvatarFallback>{iniciales(hijo.nombre)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{hijo.nombre}</p>
              <p className="text-sm text-muted-foreground">
                {matricula.grado}{matricula.seccion ? ` ${matricula.seccion}` : ""} de {matricula.nivel}
                {matricula.turno ? ` · ${matricula.turno}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            {hijos.length > 1 && (
              <FilterSelect
                label="Hijo"
                value={String(hijo.idAlumno)}
                onValueChange={(v) => {
                  setIdAlumno(Number(v))
                  setIdMatricula(null)
                }}
                options={hijos.map((h) => ({ value: String(h.idAlumno), label: h.nombre }))}
                includeAll={false}
                opcionesLargas
                className="w-full sm:w-[300px]"
              />
            )}
            <FilterSelect
              label="Año"
              value={String(matricula.idMatricula)}
              onValueChange={(v) => setIdMatricula(Number(v))}
              options={hijo.matriculas.map((m) => ({ value: String(m.idMatricula), label: m.anio }))}
              includeAll={false}
              className="w-full sm:w-[130px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* La key reinicia cada pestaña al cambiar de hijo o de año. */}
      <Tabs defaultValue="resumen" key={matricula.idMatricula} className="w-full">
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen"><ResumenTab idMatricula={matricula.idMatricula} /></TabsContent>
        <TabsContent value="notas"><NotasTab idMatricula={matricula.idMatricula} /></TabsContent>
        <TabsContent value="asistencia"><AsistenciaTab idMatricula={matricula.idMatricula} /></TabsContent>
        <TabsContent value="horario"><HorarioTab idMatricula={matricula.idMatricula} /></TabsContent>
        <TabsContent value="pagos"><PagosTab idMatricula={matricula.idMatricula} /></TabsContent>
      </Tabs>
    </div>
  )
}
