"use client"

import { useMemo, useState } from "react"
import { FileDown, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  CargandoTarjetas,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { useAsignacionesUsuario } from "@/hooks/use-evaluacion"
import { useConsolidado } from "@/hooks/use-evaluacion"
import { notasApi } from "@/lib/api/evaluacion"
import { usePuede } from "@/hooks/use-permisos"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"

const CALIFICACION_COLORS: Record<string, string> = {
  AD: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  C: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
}

const BIMESTRES = [
  { value: "1", label: "Bimestre 1" },
  { value: "2", label: "Bimestre 2" },
  { value: "3", label: "Bimestre 3" },
  { value: "4", label: "Bimestre 4" },
]

export default function ConsolidadoTab() {
  const { data: asignaciones = [], isLoading: cargandoAsignaciones } =
    useAsignacionesUsuario()
  const puedeExportar = usePuede("CONSOLIDADOS", "IMPRIMIR_EXPORTAR")

  const opcionesCurso = useMemo(() => {
    const vistos = new Set<number>()
    return asignaciones
      .filter((a) => {
        if (vistos.has(a.idCurso)) return false
        vistos.add(a.idCurso)
        return true
      })
      .map((a) => ({
        value: String(a.idCurso),
        label: a.curso,
      }))
  }, [asignaciones])

  const [idGradoSeccion, setIdGradoSeccion] = useState<number | null>(null)
  const [idCurso, setIdCurso] = useState(0)
  const [bimestre, setBimestre] = useState(1)

  const { data: consolidado = [], isLoading: cargandoConsolidado } =
    useConsolidado(
      idGradoSeccion != null && idGradoSeccion > 0 ? idGradoSeccion : undefined,
      bimestre,
      idCurso || undefined
    )

  const competencias = useMemo(() => {
    if (consolidado.length === 0) return []
    const first = consolidado[0]
    return [...first.competencias].sort((a, b) => a.orden - b.orden)
  }, [consolidado])

  async function handleExportarSiagie() {
    if (idGradoSeccion == null || idGradoSeccion <= 0) {
      toast.warning("Selecciona grado-sección")
      return
    }
    try {
      const blob = await notasApi.exportarSiagie(idGradoSeccion, bimestre)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `SIAGIE_GS${idGradoSeccion}_B${bimestre}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Archivo SIAGIE descargado")
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : null
      const msg = error instanceof Error ? error.message : "Error al exportar"
      if (status === 404) {
        toast.error("No hay plantilla SIAGIE vigente. Sube una plantilla primero.")
      } else if (status === 401 || msg.includes("expiró")) {
        toast.error("Sesión expirada. Inicia sesión nuevamente y vuelve a intentar.")
      } else {
        toast.error(msg || "No se pudo descargar el archivo SIAGIE")
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-[20px] border-[0.80px] border-[#D9DBE9]">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-[20px] font-semibold tracking-tight">Consolidado por competencias</h2>
              <p className="text-[14px] leading-5 text-muted-foreground">Vista estilo SIAGIE: calificaciones por competencia de cada alumno.</p>
            </div>
            {puedeExportar && (
              <Button variant="outline" size="sm" className="h-8 rounded-[8px] border-[#A9A9AA] text-[12px]" onClick={handleExportarSiagie} disabled={idGradoSeccion == null || idGradoSeccion <= 0 || !idCurso}>
                <Download data-icon="inline-start" />
                Exportar SIAGIE
              </Button>
            )}
          </div>

          {cargandoAsignaciones ? (
            <CargandoTarjetas filas={1} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <GradoSeccionCascada
                  value={idGradoSeccion || null}
                  onChange={(v) => setIdGradoSeccion(v ?? 0)}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Curso / Área</p>
                <Select
                  value={idCurso ? String(idCurso) : ""}
                  onValueChange={(v) => setIdCurso(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {idCurso
                        ? opcionesCurso.find((o) => o.value === String(idCurso))
                            ?.label ?? "Selecciona"
                        : "Selecciona"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesCurso.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Bimestre</p>
                <Select
                  value={String(bimestre)}
                  onValueChange={(v) => setBimestre(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {BIMESTRES.find((b) => b.value === String(bimestre))?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BIMESTRES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(idGradoSeccion != null && idGradoSeccion > 0 && idCurso > 0) && (
        <Card className="rounded-[20px] border-[0.80px] border-[#D9DBE9]">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="overflow-x-auto rounded-[8px] border border-[#D9DBE9]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8F9FA] hover:bg-[#F8F9FA]">
                    <TableHead className="min-w-[200px] whitespace-nowrap text-[12px] font-semibold text-[#495057]">Alumno</TableHead>
                    {cargandoConsolidado ? (
                      <TableHead>Cargando...</TableHead>
                    ) : consolidado.length > 0 ? (
                      competencias.map((c) => (
                        <TableHead key={c.idCompetencia} className="min-w-[120px] text-center whitespace-nowrap text-[12px] font-semibold text-[#495057]">
                          <div className="text-[12px] font-semibold">{c.competencia}</div>
                        </TableHead>
                      ))
                    ) : (
                      <TableHead />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargandoConsolidado ? (
                    <FilasCargando columnas={2} filas={4} />
                  ) : consolidado.length === 0 ? (
                    <MensajeSinDatos
                      columnas={competencias.length + 1}
                      mensaje="No hay notas registradas para estos filtros."
                    />
                  ) : (
                    consolidado.map((alumno) => (
                      <TableRow key={alumno.idMatricula}>
                        <TableCell>
                          <p className="font-medium">{alumno.alumno}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {alumno.codigoAlumno}
                          </p>
                        </TableCell>
                        {competencias.map((c) => {
                          const nota = alumno.competencias.find(
                            (nc) => nc.idCompetencia === c.idCompetencia
                          )
                          const cal = nota?.calificacion
                          const color = cal ? CALIFICACION_COLORS[cal] ?? "" : ""
                          return (
                            <TableCell key={c.idCompetencia} className="text-center">
                              {cal ? (
                                <Badge className={color} title={nota?.conclusionDescriptiva ?? undefined}>
                                  {cal}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
