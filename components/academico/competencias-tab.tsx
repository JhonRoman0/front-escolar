"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { AvisoMallaBloqueada, FiltrosMalla, useFiltrosMalla } from "@/components/academico/cursos-tab"
import { usePuede } from "@/hooks/use-permisos"
import { useCursos } from "@/hooks/use-academico"
import { useCambiarEstadoCompetencia, useCompetencias } from "@/hooks/use-evaluacion"
import { ACCESO, ESTADO_ANIO } from "@/lib/api/academico"

/**
 * Competencias de cada área, tal como vienen del Excel del SIAGIE. No se
 * escriben a mano: solo se activan o desactivan en un año por comenzar.
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
  const cambiarEstado = useCambiarEstadoCompetencia()
  const puedeActualizar = usePuede("COMPETENCIAS", "ACTUALIZAR")
  const configurable = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  const [cambiandoId, setCambiandoId] = useState<number | null>(null)

  async function handleCambiarEstado(idCompetencia: number, activar: boolean) {
    setCambiandoId(idCompetencia)
    try {
      await cambiarEstado.mutateAsync({
        id: idCompetencia,
        accesoId: activar ? ACCESO.ACTIVO : ACCESO.INACTIVO,
      })
      toast.success(`Competencia ${activar ? "activada" : "inactivada"}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar el estado")
    } finally {
      setCambiandoId(null)
    }
  }

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
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Código</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead className="w-[170px]">Estado</TableHead>
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
              ) : (
                competencias.map((c) => (
                  <TableRow key={c.idCompetencia}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {c.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.competencia}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={c.accesoId === ACCESO.ACTIVO}
                          disabled={!configurable || !puedeActualizar || cambiandoId === c.idCompetencia}
                          onCheckedChange={(checked) => handleCambiarEstado(c.idCompetencia, checked)}
                          aria-label={`Cambiar estado de ${c.competencia}`}
                        />
                        <EstadoBadge accesoId={c.accesoId} />
                      </div>
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
