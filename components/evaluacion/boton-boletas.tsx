"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileText, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { FilterSelect } from "@/components/shared/filter-select"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { notasFinalesApi } from "@/lib/api/notas-finales"
import { portalApi } from "@/lib/api/portal"
import { generarPdfBoletas } from "@/lib/reportes/generar-boleta"
import { logoColegio } from "@/lib/reportes/pdf-institucional"
import type { SeccionExportable } from "./boton-exportar-siagie"

/** Boleta de notas de un alumno o de toda la sección, en el periodo elegido. */
export function BotonBoletas({
  seccion,
  periodo,
  faltaFiltro,
}: {
  seccion: SeccionExportable
  periodo: PeriodoEvaluacion
  faltaFiltro?: string | null
}) {
  const [abierto, setAbierto] = useState(false)
  const nombreSeccion = `${seccion.grado}${seccion.seccion ? ` ${seccion.seccion}` : ""}`
  return (
    <>
      <span title={faltaFiltro ?? `Boletas de ${nombreSeccion} en ${periodo.nombre.toLowerCase()}`}>
        <Button variant="outline" size="sm" disabled={!!faltaFiltro} onClick={() => setAbierto(true)}>
          <FileText data-icon="inline-start" />
          Boletas
        </Button>
      </span>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Boletas de notas</DialogTitle>
            <DialogDescription>
              {nombreSeccion} {seccion.nivel} · {periodo.nombre}
            </DialogDescription>
          </DialogHeader>
          {abierto && <Contenido seccion={seccion} periodo={periodo} onCerrar={() => setAbierto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Contenido({ seccion, periodo, onCerrar }: {
  seccion: SeccionExportable
  periodo: PeriodoEvaluacion
  onCerrar: () => void
}) {
  const { data: boleta, isLoading, isError, error } = useQuery({
    queryKey: ["boletas", seccion.idGradoSeccion, periodo.numero],
    queryFn: () => notasFinalesApi.boletas(seccion.idGradoSeccion, periodo.numero),
  })
  const [idMatricula, setIdMatricula] = useState("")
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    if (!boleta) return
    setGenerando(true)
    try {
      const colegio = await portalApi.colegio().catch(() => null)
      generarPdfBoletas(boleta, colegio, await logoColegio(colegio), idMatricula ? Number(idMatricula) : null)
      toast.success(idMatricula ? "Boleta descargada" : `${boleta.alumnos.length} boletas descargadas`)
      onCerrar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la boleta")
    } finally {
      setGenerando(false)
    }
  }

  if (isLoading) return <CargandoTarjetas filas={1} />
  if (isError || !boleta) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : "No se pudieron cargar las notas"}</p>
  }

  return (
    <>
      {boleta.alumnos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay alumnos matriculados en esta sección.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Alumno</p>
          <FilterSelect
            value={idMatricula}
            onValueChange={setIdMatricula}
            options={boleta.alumnos.map((a) => ({ value: String(a.idMatricula), label: a.nombre }))}
            allLabel={`Toda la sección (${boleta.alumnos.length} alumnos)`}
            opcionesLargas
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Incluye las notas de {boleta.periodos.length === 1 ? "este periodo" : `los periodos 1 al ${boleta.periodo}`}, las
            conclusiones y la asistencia del periodo. Toda la sección sale en un solo PDF, un alumno por página.
          </p>
        </div>
      )}
      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" disabled={generando || !boleta.alumnos.length} onClick={descargar}>
          {generando && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Descargar PDF
        </Button>
      </DialogFooter>
    </>
  )
}
