"use client"

import { useState } from "react"
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Table,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { reportesApi } from "@/lib/api/reportes"
import { generarCsvAsistencia } from "@/lib/reportes/generar-csv"
import { generarExcelAsistencia } from "@/lib/reportes/generar-excel"
import { generarPdfAsistencia } from "@/lib/reportes/generar-pdf"
import { fechaHoyISO } from "@/lib/fechas"

type Formato = "pdf" | "excel" | "csv"

type Preset = "hoy" | "ayer" | "ultimos_7" | "este_mes" | "personalizado"

function aISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Rango [inicio, fin] ISO según el preset elegido. */
function rangoDePreset(preset: Preset): { inicio: string; fin: string } {
  const hoy = new Date()
  switch (preset) {
    case "hoy":
      return { inicio: aISO(hoy), fin: aISO(hoy) }
    case "ayer": {
      const ayer = new Date(hoy)
      ayer.setDate(hoy.getDate() - 1)
      return { inicio: aISO(ayer), fin: aISO(ayer) }
    }
    case "ultimos_7": {
      const desde = new Date(hoy)
      desde.setDate(hoy.getDate() - 6)
      return { inicio: aISO(desde), fin: aISO(hoy) }
    }
    case "este_mes":
      return {
        inicio: aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        fin: aISO(hoy),
      }
    default:
      return { inicio: fechaHoyISO(), fin: fechaHoyISO() }
  }
}

interface GenerarReporteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nombre del colegio para el encabezado del PDF (default: "Sistema Escolar"). */
  nombreColegio?: string
}

export function GenerarReporteModal({
  open,
  onOpenChange,
  nombreColegio = "Sistema Escolar",
}: GenerarReporteModalProps) {
  const [preset, setPreset] = useState<Preset>("ultimos_7")
  const [{ inicio, fin }, setRango] = useState(() =>
    rangoDePreset("ultimos_7")
  )
  const [generando, setGenerando] = useState<Formato | null>(null)

  function cambiaPreset(nuevo: string | null) {
    if (!nuevo) return
    setPreset(nuevo as Preset)
    if (nuevo !== "personalizado") {
      setRango(rangoDePreset(nuevo as Preset))
    }
  }

  async function descargar(formato: Formato) {
    if (!inicio || !fin || inicio > fin) {
      toast.error("La fecha inicial no puede ser mayor que la final")
      return
    }

    setGenerando(formato)
    try {
      const datos = await reportesApi.general(inicio, fin)
      if (datos.length === 0) {
        toast.warning("No hay registros de asistencia en el rango seleccionado")
        return
      }

      if (formato === "pdf") {
        generarPdfAsistencia({ datos, inicio, fin, nombreColegio })
      } else if (formato === "excel") {
        generarExcelAsistencia({ datos, inicio, fin })
      } else {
        generarCsvAsistencia({ datos, inicio, fin })
      }

      toast.success(
        `Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el reporte"
      )
    } finally {
      setGenerando(null)
    }
  }

  const ocupado = generando !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar reporte de asistencia</DialogTitle>
          <DialogDescription>
            Descarga todos los registros del rango en PDF, Excel o CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Rango de fechas</p>
            <Select value={preset} onValueChange={cambiaPreset}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="ayer">Ayer</SelectItem>
                <SelectItem value="ultimos_7">Últimos 7 días</SelectItem>
                <SelectItem value="este_mes">Este mes</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Desde</p>
              <Input
                type="date"
                value={inicio}
                max={fechaHoyISO()}
                disabled={preset !== "personalizado"}
                onChange={(e) =>
                  e.target.value && setRango({ inicio: e.target.value, fin })
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Hasta</p>
              <Input
                type="date"
                value={fin}
                max={fechaHoyISO()}
                disabled={preset !== "personalizado"}
                onChange={(e) =>
                  e.target.value && setRango({ inicio, fin: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ocupado}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => descargar("csv")}
            disabled={ocupado}
          >
            {generando === "csv" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Table />
            )}
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => descargar("excel")}
            disabled={ocupado}
          >
            {generando === "excel" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileSpreadsheet />
            )}
            Excel
          </Button>
          <Button onClick={() => descargar("pdf")} disabled={ocupado}>
            {generando === "pdf" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileText />
            )}
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
