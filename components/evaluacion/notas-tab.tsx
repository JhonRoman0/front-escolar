"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, FileDown, GraduationCap, KeyRound, Loader2, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import {
  useAsignacionesUsuario,
  useCompetencias,
  useRegistrarNotasBatch,
} from "@/hooks/use-evaluacion"
import { useMatriculas } from "@/hooks/use-matricula"
import { AutorizacionDialog } from "./autorizacion-dialog"
import { PromedioDialog } from "./promedio-view"
import { usePuede } from "@/hooks/use-permisos"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfNotas } from "@/lib/reportes/generar-pdf"
import { generarExcelNotas } from "@/lib/reportes/generar-excel"
import { generarCsvNotas } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import {
  calificacionesPrimariaSecundaria,
  calificacionesInicial,
  esCalificacionC,
} from "@/lib/schemas/evaluacion"

const TAMANIO_PAGINA = 500

const CALIFICACION_COLORS: Record<string, string> = {
  AD: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  C: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
}

interface FilaNota {
  idMatricula: number
  codigoAlumno: string
  alumno: string
  calificacion: string
  conclusionDescriptiva: string
  yaExiste: boolean
  calificacionExistente?: string
}

export default function NotasTab() {
  const { data: asignaciones = [], isLoading: cargandoAsignaciones } =
    useAsignacionesUsuario()
  const { data: matriculas } = useMatriculas(0, TAMANIO_PAGINA)

  const [idAsignacion, setIdAsignacion] = useState(0)
  const [idCompetencia, setIdCompetencia] = useState(0)
  const [bimestre, setBimestre] = useState(1)
  const [valores, setValores] = useState<
    Record<number, { calificacion: string; conclusionDescriptiva: string }>
  >({})
  const [codigo, setCodigo] = useState("")
  const [autorizacionOpen, setAutorizacionOpen] = useState(false)
  const [promedioSel, setPromedioSel] = useState<{
    idMatricula: number
    nombre: string
    codigo: string
  } | null>(null)

  const asignacionSel = asignaciones.find((a) => a.idAsignacion === idAsignacion)
  const idCurso = asignacionSel?.idCurso ?? 0

  const { data: competencias = [], isLoading: cargandoCompetencias } =
    useCompetencias(idCurso || undefined)

  const competenciaSel = competencias.find((c) => c.idCompetencia === idCompetencia)

  const registrar = useRegistrarNotasBatch()
  const puedeExportar = usePuede("NOTAS", "IMPRIMIR_EXPORTAR")
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroBimestre, setFiltroBimestre] = useState("")
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)

  const alumnos = useMemo(() => {
    if (!asignacionSel) return []
    return (matriculas?.content ?? [])
      .filter((m) => m.accesoId === 1 && m.idGradoSeccion === asignacionSel.idGradoSeccion)
      .sort((a, b) => a.alumno.localeCompare(b.alumno, "es"))
  }, [matriculas, asignacionSel])

  const calificacionesPermitidas = useMemo(() => {
    if (!asignacionSel) return calificacionesPrimariaSecundaria
    const grado = asignacionSel.grado
    const esInicial = grado?.toLowerCase().includes("año") || grado?.toLowerCase().includes("inicial")
    return esInicial ? calificacionesInicial : calificacionesPrimariaSecundaria
  }, [asignacionSel])

  const filas: FilaNota[] = useMemo(() => {
    return alumnos.map((m) => {
      const editado = valores[m.idMatricula]
      return {
        idMatricula: m.idMatricula,
        codigoAlumno: m.codigoAlumno,
        alumno: m.alumno,
        calificacion: editado?.calificacion ?? "",
        conclusionDescriptiva: editado?.conclusionDescriptiva ?? "",
        yaExiste: false,
        calificacionExistente: undefined,
      }
    })
  }, [alumnos, valores])

  const hayCambios = filas.some((f) => f.calificacion !== "")

  function setCalificacion(idMatricula: number, cal: string) {
    setValores((prev) => ({
      ...prev,
      [idMatricula]: {
        calificacion: cal,
        conclusionDescriptiva: prev[idMatricula]?.conclusionDescriptiva ?? "",
      },
    }))
  }

  function setConclusion(idMatricula: number, texto: string) {
    setValores((prev) => ({
      ...prev,
      [idMatricula]: {
        calificacion: prev[idMatricula]?.calificacion ?? "",
        conclusionDescriptiva: texto,
      },
    }))
  }

  const opcionesBimestre = [
    { value: "1", label: "1er Bimestre" },
    { value: "2", label: "2do Bimestre" },
    { value: "3", label: "3er Bimestre" },
    { value: "4", label: "4to Bimestre" },
  ]

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.notas(inicio, fin, {
      idGradoSeccion: filtroGradoSeccion ?? undefined,
      bimestre: filtros.bimestre ? Number(filtros.bimestre) : undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay notas en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfNotas({ datos, inicio, fin })
    else if (formato === "excel") generarExcelNotas({ datos, inicio, fin })
    else generarCsvNotas({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  async function handleGuardar() {
    if (!idCompetencia) {
      toast.error("Selecciona una competencia")
      return
    }
    const filasParaGuardar = filas.filter((f) => f.calificacion !== "")
    if (filasParaGuardar.length === 0) {
      toast.error("Asigna al menos una calificación antes de guardar.")
      return
    }

    const conC = filasParaGuardar.filter((f) => esCalificacionC(f.calificacion))
    const sinConclusion = conC.filter((f) => !f.conclusionDescriptiva.trim())
    if (sinConclusion.length > 0) {
      toast.error(
        `Falta conclusión descriptiva para ${sinConclusion.length} alumno(s) con calificación C.`
      )
      return
    }

    try {
      await registrar.mutateAsync({
        idCompetencia,
        bimestre,
        notas: filasParaGuardar.map((f) => ({
          idMatricula: f.idMatricula,
          calificacion: f.calificacion,
          conclusionDescriptiva: f.conclusionDescriptiva || null,
        })),
        codigoAutorizacion: codigo || null,
      })
      toast.success("Notas guardadas correctamente")
      setValores({})
      setCodigo("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar"
      toast.error(message)
      if (message.includes("autorización")) {
        setAutorizacionOpen(true)
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Registrar notas</h2>
              <p className="text-sm text-muted-foreground">
                Elige la asignación, competencia y bimestre para calificar.
              </p>
            </div>
            {puedeExportar && (
              <Button variant="outline" size="sm" onClick={() => setReporteOpen(true)}>
                <FileDown />
                Generar reporte
              </Button>
            )}
          </div>

          {cargandoAsignaciones ? (
            <CargandoTarjetas filas={1} />
          ) : asignaciones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              No tienes asignaciones. Si eres docente, pide que te asignen cursos.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <p className="mb-1 text-sm font-medium">Asignación</p>
                <Select
                  value={idAsignacion ? String(idAsignacion) : ""}
                  onValueChange={(v) => {
                    setIdAsignacion(Number(v))
                    setIdCompetencia(0)
                    setValores({})
                    setCodigo("")
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {asignacionSel
                        ? `${asignacionSel.curso} - ${asignacionSel.grado} ${asignacionSel.seccion}`
                        : "Selecciona"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {asignaciones.map((a) => (
                      <SelectItem key={a.idAsignacion} value={String(a.idAsignacion)}>
                        {a.curso} - {a.grado} {a.seccion} ({a.turno})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Competencia</p>
                <Select
                  value={idCompetencia ? String(idCompetencia) : ""}
                  onValueChange={(v) => {
                    setIdCompetencia(Number(v))
                    setValores({})
                    setCodigo("")
                  }}
                  disabled={!idAsignacion}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {competenciaSel?.competencia ??
                        (idAsignacion ? "Selecciona" : "Primero asignación")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cargandoCompetencias ? (
                      <SelectItem value="cargando" disabled>
                        Cargando...
                      </SelectItem>
                    ) : competencias.length === 0 ? (
                      <SelectItem value="vacio" disabled>
                        Sin competencias para este curso
                      </SelectItem>
                    ) : (
                      competencias.map((c) => (
                        <SelectItem key={c.idCompetencia} value={String(c.idCompetencia)}>
                          {c.competencia}
                        </SelectItem>
                      ))
                    )}
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
                      {opcionesBimestre.find((b) => b.value === String(bimestre))?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesBimestre.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {codigo && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                    <CheckCircle2 className="text-emerald-600" />
                    <span className="font-mono font-semibold">{codigo}</span>
                    <Button variant="ghost" size="sm" onClick={() => setCodigo("")}>
                      Quitar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {idCompetencia > 0 && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {asignacionSel?.curso} - {asignacionSel?.grado} {asignacionSel?.seccion}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {competenciaSel?.competencia} · B{bimestre}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutorizacionOpen(true)}
                >
                  <KeyRound />
                  Autorización
                </Button>
                <Button onClick={handleGuardar} disabled={registrar.isPending || !hayCambios}>
                  {registrar.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  Guardar notas
                </Button>
              </div>
            </div>

            {alumnos.length === 0 ? (
              <MensajeSinDatos
                columnas={3}
                mensaje="No hay alumnos matriculados en esta sección."
              />
            ) : (
              <div className="space-y-3">
                {filas.map((fila) => (
                  <div
                    key={fila.idMatricula}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-[180px]">
                      <p className="font-medium">{fila.alumno}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {fila.codigoAlumno}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <div className="w-24">
                        <Select
                          value={fila.calificacion || ""}
                          onValueChange={(v) => v && setCalificacion(fila.idMatricula, v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sin nota" />
                          </SelectTrigger>
                          <SelectContent>
                            {calificacionesPermitidas.map((cal) => (
                              <SelectItem key={cal} value={cal}>
                                {cal}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {fila.calificacion && (
                        <Badge className={CALIFICACION_COLORS[fila.calificacion] ?? ""}>
                          {fila.calificacion}
                        </Badge>
                      )}
                      {esCalificacionC(fila.calificacion) && (
                        <div className="flex-1">
                          <Textarea
                            placeholder="Conclusión descriptiva (obligatoria para C)"
                            value={fila.conclusionDescriptiva}
                            onChange={(e) =>
                              setConclusion(fila.idMatricula, e.target.value)
                            }
                            maxLength={200}
                            rows={2}
                            className="text-sm"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fila.conclusionDescriptiva.length}/200
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPromedioSel({
                          idMatricula: fila.idMatricula,
                          nombre: fila.alumno,
                          codigo: fila.codigoAlumno,
                        })
                      }
                    >
                      <GraduationCap />
                      Ver promedio
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AutorizacionDialog
        key={autorizacionOpen ? "abierto" : "cerrado"}
        open={autorizacionOpen}
        onOpenChange={setAutorizacionOpen}
        onAplicar={(c) => {
          setCodigo(c)
          setAutorizacionOpen(false)
          toast.success("Código de autorización aplicado")
        }}
      />

      {promedioSel && (
        <PromedioDialog
          idMatricula={promedioSel.idMatricula}
          nombreAlumno={promedioSel.nombre}
          codigoAlumno={promedioSel.codigo}
          open={!!promedioSel}
          onOpenChange={(open) => {
            if (!open) setPromedioSel(null)
          }}
        />
      )}

      <ReporteModal
        open={reporteOpen}
        onOpenChange={setReporteOpen}
        titulo="Reporte de notas"
        descripcion="Descarga todas las notas del rango en PDF, Excel o CSV."
        presets={["ultimos_7", "este_mes", "personalizado"]}
        filtros={[
          {
            id: "bimestre",
            label: "Bimestre",
            opciones: opcionesBimestre,
            valor: filtroBimestre,
            onChange: setFiltroBimestre,
          },
          {
            id: "idGradoSeccion",
            label: "Grado y sección",
            opciones: [],
            valor: "",
            onChange: () => {},
            render: () => (
              <GradoSeccionCascada
                value={filtroGradoSeccion}
                onChange={setFiltroGradoSeccion}
              />
            ),
          },
        ]}
        onDescargar={handleDescargarReporte}
      />
    </div>
  )
}
