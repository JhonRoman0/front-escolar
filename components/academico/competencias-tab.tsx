"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { FilterSelect } from "@/components/shared/filter-select"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { useFiltrosMalla } from "@/hooks/use-filtros-malla"
import { AvisoMallaBloqueada, FiltrosMalla } from "@/components/academico/filtros-malla"
import { useCursos } from "@/hooks/use-academico"
import { useCompetencias } from "@/hooks/use-evaluacion"
import { ESTADO_ANIO, OPCIONES_ESTADO_ACCESO } from "@/lib/api/academico"

/**
 * Competencias de cada área, tal como vienen del Excel del SIAGIE. No se
 * escriben a mano: esta pantalla permite consultarlas y filtrarlas.
 */
export function CompetenciasTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio, idNivel } = filtros
  const { data: cursos = [] } = useCursos({ idAnio, idNivel })
  const areas = cursos.filter((c) => c.tipo !== "SUBCURSO")

  // El área elegida se recuerda por id; si deja de existir al cambiar de año o
  // nivel, se toma la primera.
  const [idAreaElegida, setIdArea] = useState<number | null>(null)
  const area = areas.find((a) => a.idCurso === idAreaElegida) ?? areas[0] ?? null

  const { data: competencias = [], isLoading } = useCompetencias(area?.idCurso)
  const configurable = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  const [filtroEstado, setFiltroEstado] = useState("")
  const competenciasFiltradas = competencias.filter(
    (c) => !filtroEstado || c.accesoId === Number(filtroEstado)
  )

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Competencias"
          descripcion="Competencias de cada área según el registro de notas del SIAGIE. Se cargan al importar los cursos."
        />

        {anio && !configurable && <AvisoMallaBloqueada anio={anio} />}

        <div className="flex flex-wrap items-center gap-2">
          <FiltrosMalla
            anios={filtros.anios}
            niveles={filtros.niveles}
            idAnio={idAnio}
            idNivel={idNivel}
            onAnio={filtros.setIdAnio}
            onNivel={filtros.setIdNivel}
          />
          <FilterSelect
            label="Área"
            value={area ? String(area.idCurso) : ""}
            onValueChange={(v) => v && setIdArea(Number(v))}
            options={areas.map((a) => ({ value: String(a.idCurso), label: a.nombre }))}
            includeAll={false}
            allLabel="Sin áreas"
            className="w-full sm:w-[320px]"
            disabled={!areas.length}
            opcionesLargas
          />
          <FilterSelect
            value={filtroEstado}
            onValueChange={setFiltroEstado}
            options={OPCIONES_ESTADO_ACCESO}
            allLabel="Todos los estados"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead className="w-[90px] text-center">Código</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead className="w-[170px] text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!area ? (
                <MensajeSinDatos
                  columnas={3}
                  mensaje="Este año y nivel aún no tienen cursos. Impórtalos desde la pestaña Cursos."
                />
              ) : isLoading ? (
                <FilasCargando columnas={3} />
              ) : !competencias.length ? (
                <MensajeSinDatos columnas={3} mensaje={`${area.nombre} no tiene competencias.`} />
              ) : !competenciasFiltradas.length ? (
                <MensajeSinDatos columnas={3} mensaje="No hay competencias para el estado seleccionado." />
              ) : (
                competenciasFiltradas.map((c) => (
                  <TableRow key={c.idCompetencia}>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {c.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{c.competencia}</TableCell>
                    <TableCell className="text-center">
                      <EstadoBadge accesoId={c.accesoId} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
