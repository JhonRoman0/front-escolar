"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileSpreadsheet, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import type { PeriodoEvaluacion, TipoPeriodo } from "@/lib/api/academico"
import { notasFinalesApi, type PendientesSiagie } from "@/lib/api/notas-finales"
import { descargarBlob } from "@/lib/descargas"

/** "RegNotas_Secundaria_1ro_A_B1_2027.xlsx", como lo nombra el backend. */
function nombreArchivo(s: SeccionExportable, periodo: PeriodoEvaluacion): string {
  const partes = ["RegNotas", s.nivel, s.grado, (s.seccion ?? "UNICA").toUpperCase(),
    `${s.tipoPeriodo === "TRIMESTRE" ? "T" : "B"}${periodo.numero}`, s.anio]
  return `${partes.join("_").normalize("NFD").replace(/[^A-Za-z0-9_.-]/g, "")}.xlsx`
}

export interface SeccionExportable {
  idGradoSeccion: number
  nivel: string
  grado: string
  seccion: string | null
  tipoPeriodo: TipoPeriodo
  anio: string
}

/**
 * Registro de notas de toda la sección (todas las áreas) con formato SIAGIE.
 * Si faltan notas finales avisa antes de descargar.
 */
export function BotonExportarSiagie({
  seccion,
  periodo,
  faltaFiltro,
}: {
  seccion: SeccionExportable
  periodo: PeriodoEvaluacion
  /** Mensaje si aún no se eligieron todos los filtros: el botón queda deshabilitado. */
  faltaFiltro?: string | null
}) {
  const [trabajando, setTrabajando] = useState(false)
  const [pendientes, setPendientes] = useState<PendientesSiagie | null>(null)
  const nombreSeccion = `${seccion.grado}${seccion.seccion ? ` ${seccion.seccion}` : ""}`

  async function descargar() {
    const blob = await notasFinalesApi.exportarSiagie(seccion.idGradoSeccion, periodo.numero)
    descargarBlob(blob, nombreArchivo(seccion, periodo))
    toast.success(`Registro de notas de ${nombreSeccion} descargado`)
  }

  async function handleClick() {
    setTrabajando(true)
    try {
      const resumen = await notasFinalesApi.pendientesSiagie(seccion.idGradoSeccion, periodo.numero)
      if (resumen.faltantes > 0) setPendientes(resumen)
      else await descargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el Excel")
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <>
      {/* Un botón deshabilitado no muestra su title: lo muestra el contenedor. */}
      <span title={faltaFiltro ?? `Todas las áreas de ${nombreSeccion} en ${periodo.nombre.toLowerCase()}`}>
      <Button variant="outline" size="sm" disabled={trabajando || !!faltaFiltro} onClick={handleClick}>
        {trabajando ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FileSpreadsheet data-icon="inline-start" />}
        Exportar SIAGIE
      </Button>
      </span>
      <ConfirmarEliminar
        open={pendientes != null}
        onOpenChange={(open) => !open && setPendientes(null)}
        titulo="Faltan notas finales"
        descripcion={
          pendientes
            ? `Faltan ${pendientes.faltantes} de ${pendientes.esperadas} notas en ${nombreSeccion}: ${pendientes.areas
                .map((a) => `${a.area} (${a.faltantes})`)
                .join(", ")}. Esas celdas quedarán vacías en el Excel.`
            : ""
        }
        textoBoton="Descargar igual"
        icono={<FileSpreadsheet className="text-amber-600" />}
        variantConfirmar="brand"
        onConfirm={async () => {
          try {
            await descargar()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo generar el Excel")
            throw error
          }
        }}
      />
    </>
  )
}
