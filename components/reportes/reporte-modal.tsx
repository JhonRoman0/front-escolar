"use client"

import { useState, type ReactNode } from "react"
import { FileSpreadsheet, FileText, Loader2, Table } from "lucide-react"
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
import { useColegioPublico } from "@/hooks/use-portal"
import { fechaHoyISO } from "@/lib/fechas"

type Formato = "pdf" | "excel" | "csv"

export type Preset = "todo" | "hoy" | "ayer" | "ultimos_7" | "este_mes" | "personalizado"

const ETIQUETA_PRESET: Record<Preset, string> = {
  hoy: "Hoy",
  ayer: "Ayer",
  todo: "Todos",
  ultimos_7: "Últimos 7 días",
  este_mes: "Este mes",
  personalizado: "Personalizado",
}

export interface FiltroDef {
  id: string
  label: string
  opciones?: { value: string; label: string }[]
  valor?: string
  onChange?: (valor: string) => void
  render?: () => ReactNode
  /** Obliga a elegir un valor: no ofrece "Todos". */
  sinTodos?: boolean
}

function aISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

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
    case "todo":
      return { inicio: "", fin: "" }
    default:
      return { inicio: fechaHoyISO(), fin: fechaHoyISO() }
  }
}

interface ReporteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion?: string
  /** El primero es el inicial. Vacío: el reporte no se filtra por fechas. */
  presets?: Preset[]
  etiquetaTodo?: string
  filtros?: FiltroDef[]
  onDescargar: (
    formato: Formato,
    inicio: string,
    fin: string,
    filtros: Record<string, string>,
    contexto: { colegio: string; filtros: string[] }
  ) => Promise<void>
  nombreColegio?: string
}

export function ReporteModal({ open, onOpenChange, titulo, descripcion, ...resto }: ReporteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <Contenido onCerrar={() => onOpenChange(false)} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

/** Filtros con valor, en texto para el encabezado del archivo. */
function textoFiltros(filtros: FiltroDef[]): string[] {
  return filtros.flatMap((f) => {
    const opcion = f.valor ? f.opciones?.find((o) => o.value === f.valor) : undefined
    return opcion ? [`${f.label}: ${opcion.label}`] : []
  })
}

function Contenido({
  presets = ["ultimos_7", "este_mes", "personalizado"],
  etiquetaTodo = "Todos",
  filtros = [],
  onDescargar,
  onCerrar,
}: Omit<ReporteModalProps, "open" | "onOpenChange" | "titulo" | "descripcion"> & { onCerrar: () => void }) {
  const { data: colegio } = useColegioPublico()
  const [preset, setPreset] = useState<Preset>(presets[0] ?? "todo")
  const [{ inicio, fin }, setRango] = useState(() => rangoDePreset(presets[0] ?? "todo"))
  const [generando, setGenerando] = useState<Formato | null>(null)

  function cambiaPreset(nuevo: string | null) {
    if (!nuevo) return
    setPreset(nuevo as Preset)
    if (nuevo !== "personalizado") {
      setRango(rangoDePreset(nuevo as Preset))
    }
  }

  async function descargar(formato: Formato) {
    if (preset !== "todo" && (!inicio || !fin || inicio > fin)) {
      toast.error("La fecha inicial no puede ser mayor que la final")
      return
    }

    setGenerando(formato)
    try {
      const filtroValues: Record<string, string> = {}
      for (const f of filtros) {
        if (f.valor) filtroValues[f.id] = f.valor
      }
      await onDescargar(formato, inicio, fin, filtroValues, {
        colegio: colegio?.nombre ?? "Sistema Escolar",
        filtros: textoFiltros(filtros),
      })
      onCerrar()
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
    <>
        <div className="space-y-4">
          {presets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rango de fechas</p>
            <Select value={preset} onValueChange={cambiaPreset}>
              <SelectTrigger className="w-full">
                <SelectValue>{preset === "todo" ? etiquetaTodo : ETIQUETA_PRESET[preset]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {presets.includes("todo") && (
                  <SelectItem value="todo">{etiquetaTodo}</SelectItem>
                )}
                {presets.includes("hoy") && (
                  <SelectItem value="hoy">Hoy</SelectItem>
                )}
                {presets.includes("ayer") && (
                  <SelectItem value="ayer">Ayer</SelectItem>
                )}
                {presets.includes("ultimos_7") && (
                  <SelectItem value="ultimos_7">Últimos 7 días</SelectItem>
                )}
                {presets.includes("este_mes") && (
                  <SelectItem value="este_mes">Este mes</SelectItem>
                )}
                {presets.includes("personalizado") && (
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          )}

          {presets.length > 0 && preset !== "todo" && (
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
          )}

          {filtros.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {filtros.map((f) => (
                <div key={f.id} className={f.render ? "col-span-2 space-y-2" : "space-y-2"}>
                  {f.render ? (
                    <>
                      <p className="text-sm font-medium">{f.label}</p>
                      {f.render()}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{f.label}</p>
                      <Select value={f.valor ?? ""} onValueChange={(v) => f.onChange?.(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {f.opciones?.find((o) => o.value === f.valor)?.label ??
                              "Todos"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {!f.sinTodos && <SelectItem value="">Todos</SelectItem>}
                          {f.opciones?.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onCerrar}
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
    </>
  )
}
