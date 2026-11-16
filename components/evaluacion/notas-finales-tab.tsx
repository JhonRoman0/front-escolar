"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown, Lock, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { ReporteModal } from "@/components/reportes/reporte-modal"
import { useFiltrosAcademicos } from "@/components/reportes/use-filtros-academicos"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { EstadoPeriodoBadge } from "@/components/shared/estado-periodo-badge"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useAniosEscolares } from "@/hooks/use-academico"
import { useCursosFinales, useDetalleNotaFinal, useGuardarNotasFinales, useReabrirNotaFinal } from "@/hooks/use-notas-finales"
import { usePuede, usePuedeLeer } from "@/hooks/use-permisos"
import { anioParaFiltro, estadoAnioTexto } from "@/lib/api/academico"
import type { CeldaNotaFinal, DetalleNotaFinal, NotaFinalItem } from "@/lib/api/notas-finales"
import { reportesApi } from "@/lib/api/reportes"
import { ESCALAS, errorCalificacion, errorConclusion, periodoParaFiltro } from "@/lib/calificaciones"
import { generarCsvNotas } from "@/lib/reportes/generar-csv"
import { generarExcelNotas } from "@/lib/reportes/generar-excel"
import { generarPdfNotas } from "@/lib/reportes/generar-pdf"
import { BotonBoletas } from "./boton-boletas"
import { BotonExportarSiagie } from "./boton-exportar-siagie"
import { CeldaNotaFinalEditable, MOTIVO_MAXIMO, type ModoCelda, type ValorNotaFinal } from "./celda-nota-final"
import { FiltrosCurso, useFiltrosCurso } from "./filtros-curso"
import { NotasAnuales } from "./notas-anuales"

const OPCIONES_PERIODO_REPORTE = [1, 2, 3, 4].map((n) => ({ value: String(n), label: `Periodo ${n}` }))

function clave(idMatricula: number, idCompetencia: number) {
  return `${idMatricula}-${idCompetencia}`
}

type Vista = "bimestrales" | "anuales"

export default function NotasFinalesTab() {
  const { data: anios = [] } = useAniosEscolares()
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const idAnio = idAnioElegido ?? anioParaFiltro(anios)?.idAnio ?? null
  // Cada submódulo tiene su permiso: se ve solo el que el usuario puede leer.
  const puedeBimestrales = usePuedeLeer("NOTAS")
  const puedeAnuales = usePuedeLeer("NOTAS_ANUALES")
  const [vistaElegida, setVistaElegida] = useState<Vista | null>(null)
  const vista: Vista = vistaElegida ?? (puedeBimestrales ? "bimestrales" : "anuales")
  const anual = vista === "anuales"
  const { data: cursos = [], isLoading: cargandoCursos } = useCursosFinales(idAnio, anual)

  const filtrosCurso = useFiltrosCurso(cursos, (c) => ({
    clave: `${c.idGradoSeccion}-${c.idArea}`,
    curso: c.area,
    turno: c.turno,
    nivel: c.nivel,
    grado: c.grado,
    seccion: c.seccion,
  }))
  const curso = filtrosCurso.seleccionado
  // El periodo depende del nivel; cambiar de curso o de periodo no toca los demás filtros.
  const periodos = filtrosCurso.delNivel?.periodos ?? []
  const [numeroElegido, setNumeroElegido] = useState<number | null>(null)
  const periodo = periodos.find((p) => p.numero === numeroElegido) ?? periodoParaFiltro(periodos)
  const { data: detalle, isLoading: cargandoDetalle } = useDetalleNotaFinal(
    curso?.idGradoSeccion ?? null,
    curso?.idArea ?? null,
    periodo?.numero ?? null
  )

  const puedeExportar = usePuede("NOTAS", "IMPRIMIR_EXPORTAR")
  const puedeExportarSiagie = usePuede("NOTAS", "EXPORTAR_SIAGIE")
  const puedeImprimirBoletas = usePuede("NOTAS", "IMPRIMIR_BOLETA")
  const anioElegido = anios.find((a) => a.idAnio === idAnio)
  // Boletas y Excel son de toda la sección: basta con tenerla elegida, sin el curso.
  const deLaSeccion = filtrosCurso.deLaSeccion
  const faltaFiltro = deLaSeccion ? null : "Elige turno, nivel, grado y sección"
  const seccionElegida = anioElegido
    ? {
        idGradoSeccion: deLaSeccion?.idGradoSeccion ?? 0,
        nivel: deLaSeccion?.nivel ?? "",
        grado: deLaSeccion?.grado ?? "",
        seccion: deLaSeccion?.seccion ?? null,
        tipoPeriodo: filtrosCurso.delNivel?.tipoPeriodo ?? "BIMESTRE",
        anio: anioElegido.anio,
      }
    : null
  const [reporteOpen, setReporteOpen] = useState(false)
  const filtrosReporte = useFiltrosAcademicos()
  const [periodoReporte, setPeriodoReporte] = useState("")

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.notas(inicio, fin, {
      idGradoSeccion: filtros.idGradoSeccion ? Number(filtros.idGradoSeccion) : undefined,
      bimestre: filtros.periodo ? Number(filtros.periodo) : undefined,
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

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <HeaderSeccion
            titulo="Notas finales"
            descripcion={
              anual
                ? "Nota del año de cada competencia, cuando ya terminó el último periodo."
                : "Nota de cada competencia en el periodo. En literal las evaluaciones sirven de guía; en vigesimal la nota es su promedio."
            }
          />
          {!anual && (
          <div className="flex flex-wrap items-center gap-2">
          {puedeImprimirBoletas && seccionElegida && periodo && (
            <BotonBoletas seccion={seccionElegida} periodo={periodo} faltaFiltro={faltaFiltro} />
          )}
          {puedeExportarSiagie && seccionElegida && periodo && (
            <BotonExportarSiagie seccion={seccionElegida} periodo={periodo} faltaFiltro={faltaFiltro} />
          )}
          {puedeExportar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                filtrosReporte.iniciar({ idAnio })
                setPeriodoReporte("")
                setReporteOpen(true)
              }}
            >
              <FileDown data-icon="inline-start" />
              Generar reporte
            </Button>
          )}
          </div>
          )}
        </div>

        {puedeBimestrales && puedeAnuales && (
          <div className="flex w-fit rounded-md border p-0.5">
            {(["bimestrales", "anuales"] as const).map((v) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={vista === v ? "secondary" : "ghost"}
                className="h-7"
                onClick={() => setVistaElegida(v)}
              >
                {v === "bimestrales" ? "Bimestrales" : "Anuales"}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={idAnio ? String(idAnio) : ""}
            onValueChange={(v) => {
              setIdAnioElegido(Number(v))
              filtrosCurso.reiniciar()
              setNumeroElegido(null)
            }}
            options={[...anios]
              .sort((a, b) => b.anio.localeCompare(a.anio))
              .map((a) => ({ value: String(a.idAnio), label: `${a.anio} · ${estadoAnioTexto(a.estado)}` }))}
            includeAll={false}
            label="Año"
            className="w-[170px]"
          />
          <FiltrosCurso {...filtrosCurso.props} cargando={cargandoCursos} />
          {!anual && periodos.length > 0 && (
            <FilterSelect
              label="Periodo"
              value={periodo ? String(periodo.numero) : ""}
              onValueChange={(v) => setNumeroElegido(Number(v))}
              options={periodos.map((p) => ({ value: String(p.numero), label: p.nombre }))}
              includeAll={false}
              className="w-[180px]"
            />
          )}
        </div>

        {!cargandoCursos && !cursos.length ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No tienes cursos para calificar en este año.
          </p>
        ) : filtrosCurso.delNivel && !periodos.length ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {filtrosCurso.delNivel.nivel} aún no tiene periodos: defínelos en Académico → Configuración académica.
          </p>
        ) : !curso ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {cargandoCursos ? "Cargando cursos…" : `${filtrosCurso.faltaElegir} para ver sus notas.`}
          </p>
        ) : anual ? (
          <NotasAnuales curso={curso} />
        ) : cargandoDetalle || !detalle ? (
          <CargandoTarjetas filas={2} />
        ) : (
          <TablaNotas
            // Cambiar de curso o periodo, o guardar, arranca la tabla limpia.
            key={JSON.stringify([detalle.curso.idGradoSeccion, detalle.curso.idArea, detalle.periodo.numero, detalle.alumnos])}
            detalle={detalle}
          />
        )}

        <ReporteModal
          open={reporteOpen}
          onOpenChange={setReporteOpen}
          titulo="Reporte de notas"
          descripcion="Descarga las notas finales del rango en PDF, Excel o CSV."
          presets={["ultimos_7", "este_mes", "personalizado"]}
          filtros={[
            ...filtrosReporte.filtros,
            {
              id: "periodo",
              label: "Periodo",
              opciones: OPCIONES_PERIODO_REPORTE,
              valor: periodoReporte,
              onChange: setPeriodoReporte,
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}

function TablaNotas({ detalle }: { detalle: DetalleNotaFinal }) {
  const guardar = useGuardarNotasFinales()
  const reabrir = useReabrirNotaFinal()
  const [motivo, setMotivo] = useState("")
  const { escala, competencias } = detalle
  const vigesimal = escala === "VIGESIMAL"

  // Lo guardado, o en vigesimal el promedio de las evaluaciones como punto de partida.
  const originales: Record<string, ValorNotaFinal> = {}
  const iniciales: Record<string, ValorNotaFinal> = {}
  for (const alumno of detalle.alumnos) {
    for (const celda of alumno.notas) {
      const guardado = { calificacion: celda.calificacion ?? "", conclusion: celda.conclusionDescriptiva ?? "" }
      originales[clave(alumno.idMatricula, celda.idCompetencia)] = guardado
      iniciales[clave(alumno.idMatricula, celda.idCompetencia)] =
        celda.calificacion == null && escala === "VIGESIMAL" && celda.promedio != null
          ? { calificacion: String(celda.promedio), conclusion: "" }
          : guardado
    }
  }
  const [valores, setValores] = useState(iniciales)

  // Una nota nueva la pone quien registra o quien corrige; una ya puesta, o la de un
  // periodo cerrado que el alumno cursó en otra sección, solo quien corrige.
  const puedeGuardar = detalle.puedeRegistrar || detalle.puedeCorregir
  function modo(celda: CeldaNotaFinal): ModoCelda {
    const sinEvaluaciones = celda.calificacion == null && celda.guia.length === 0 && !celda.soloDireccion
    // Con la nota del año puesta, las del periodo ya no cambian.
    if (sinEvaluaciones || celda.conNotaAnual) return "lectura"
    const permitido = celda.calificacion == null && !celda.soloDireccion ? puedeGuardar : detalle.puedeCorregir
    if (!permitido) return "lectura"
    // En vigesimal la nota es el promedio: solo se escribe la conclusión.
    return vigesimal && (celda.guia.length > 0 || celda.calificacion != null) ? "conclusion" : "nota"
  }
  const porCorregir = (celda: CeldaNotaFinal) => celda.calificacion != null || celda.soloDireccion

  const cambios = detalle.alumnos.flatMap((alumno) =>
    alumno.notas
      .filter((celda) => modo(celda) !== "lectura")
      .map((celda) => ({ alumno, celda, k: clave(alumno.idMatricula, celda.idCompetencia) }))
      .filter(({ k }) => JSON.stringify(valores[k]) !== JSON.stringify(originales[k]))
  )
  const pendientes = cambios.filter(({ celda, k }) => celda.calificacion != null || valores[k].calificacion.trim())
  // Cambiar una nota ya registrada pide motivo y deja la anterior en el historial.
  const corregidas = pendientes.filter(({ celda }) => celda.calificacion != null)

  async function onReabrir(idMatricula: number, idCompetencia: number, motivoReapertura: string) {
    try {
      await reabrir.mutateAsync({
        idGradoSeccion: detalle.curso.idGradoSeccion,
        idArea: detalle.curso.idArea,
        periodo: detalle.periodo.numero,
        idMatricula,
        idCompetencia,
        motivo: motivoReapertura,
      })
      toast.success("Nota reabierta: sus evaluaciones ya se pueden corregir")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reabrir la nota")
      return false
    }
  }

  async function onGuardar() {
    if (corregidas.some(({ k }) => !valores[k].calificacion.trim())) {
      toast.error("Para quitar una nota ya registrada, usa Reabrir")
      return
    }
    const conError = pendientes.filter(({ k }) =>
      errorCalificacion(escala, valores[k].calificacion) ||
      errorConclusion(escala, valores[k].calificacion, valores[k].conclusion)
    )
    if (conError.length) {
      toast.error(`Revisa ${conError.length} ${conError.length === 1 ? "nota" : "notas"}: falta la conclusión o el valor no es válido`)
      return
    }
    if (corregidas.length && !motivo.trim()) {
      toast.error("Escribe el motivo de la corrección")
      return
    }
    const item = ({ alumno, celda, k }: (typeof pendientes)[number]): NotaFinalItem => ({
      idMatricula: alumno.idMatricula,
      idCompetencia: celda.idCompetencia,
      calificacion: valores[k].calificacion.trim() || null,
      conclusionDescriptiva: valores[k].conclusion.trim() || null,
    })
    const base = {
      idGradoSeccion: detalle.curso.idGradoSeccion,
      idArea: detalle.curso.idArea,
      periodo: detalle.periodo.numero,
      motivo: motivo.trim() || null,
    }
    const nuevas = pendientes.filter(({ celda }) => !porCorregir(celda)).map(item)
    const correcciones = pendientes.filter(({ celda }) => porCorregir(celda)).map(item)
    try {
      // Sin permiso de registrar (o con el periodo cerrado) las nuevas van por la ruta de corregir.
      const porCorreccion = detalle.puedeRegistrar ? correcciones : [...nuevas, ...correcciones]
      await guardar.mutateAsync({
        nuevas: detalle.puedeRegistrar && nuevas.length ? { ...base, notas: nuevas } : null,
        correcciones: porCorreccion.length ? { ...base, notas: porCorreccion } : null,
      })
      toast.success("Notas guardadas")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las notas")
    }
  }

  const avisos = competencias.filter((c) => c.sinEvaluaciones.length)
  const escalaTexto = ESCALAS.find((e) => e.value === escala)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Escala {escalaTexto?.detalle}</Badge>
        <EstadoPeriodoBadge estado={detalle.periodo.estado} />
        {!detalle.puedeCorregir && detalle.puedeRegistrar && (
          <span>Las notas ya registradas solo las cambia quien tiene permiso de corregir.</span>
        )}
      </div>

      {!puedeGuardar && (
        <p className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          {!detalle.periodoEditable
            ? detalle.curso.anioVigente ? "El periodo aún no empieza." : "El año no está vigente: solo lectura."
            : detalle.periodo.estado === "CERRADO"
              ? "El periodo ya cerró: sus notas las registra quien puede corregir notas."
              : "No tienes permiso para registrar notas: solo lectura."}
        </p>
      )}

      {detalle.periodo.estado === "CERRADO" && puedeGuardar && (
        <p className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <Lock className="size-3.5 text-amber-600" />
          El periodo ya cerró: cada cambio queda registrado y las correcciones piden motivo.
        </p>
      )}

      {avisos.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          {avisos.map((c) => (
            <p key={c.idCompetencia} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span>
                Competencia {c.codigo}: {c.sinEvaluaciones.join(", ")}{" "}
                {c.sinEvaluaciones.length === 1 ? "aún no tiene" : "aún no tienen"} evaluaciones en este periodo.
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[220px]">Alumno</TableHead>
              {competencias.map((c) => (
                <TableHead key={c.idCompetencia} className="min-w-[160px] text-center">
                  <Tooltip>
                    <TooltipTrigger render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}>
                      Competencia {c.codigo}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{c.nombre}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.alumnos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2 + competencias.length} className="h-20 text-center text-muted-foreground">
                  No hay alumnos matriculados en esta sección.
                </TableCell>
              </TableRow>
            ) : (
              detalle.alumnos.map((alumno, i) => (
                <TableRow key={alumno.idMatricula}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{alumno.nombre}</p>
                    <p className="text-xs text-muted-foreground">{alumno.codigo}</p>
                  </TableCell>
                  {alumno.notas.map((celda) => {
                    const k = clave(alumno.idMatricula, celda.idCompetencia)
                    const codigoCompetencia = competencias.find((c) => c.idCompetencia === celda.idCompetencia)?.codigo ?? ""
                    return (
                      <TableCell key={celda.idCompetencia}>
                        <CeldaNotaFinalEditable
                          celda={celda}
                          escala={escala}
                          valor={valores[k]}
                          onChange={(v) => setValores((actual) => ({ ...actual, [k]: v }))}
                          modo={modo(celda)}
                          alumno={alumno.nombre}
                          competencia={codigoCompetencia}
                          onReabrir={
                            detalle.puedeCorregir && celda.calificacion != null && !celda.conNotaAnual
                              ? (m) => onReabrir(alumno.idMatricula, celda.idCompetencia, m)
                              : undefined
                          }
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {puedeGuardar && (
        <form
          className="flex items-center justify-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void onGuardar()
          }}
        >
          {corregidas.length > 0 && (
            <Input
              className="h-8 max-w-xs"
              placeholder="Motivo de la corrección *"
              maxLength={MOTIVO_MAXIMO}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-label="Motivo de la corrección"
            />
          )}
          <span className="text-xs text-muted-foreground">
            {pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? "cambio" : "cambios"} sin guardar` : ""}
          </span>
          <BotonGuardar etiqueta="Guardar notas" enviando={guardar.isPending} disabled={!pendientes.length} />
        </form>
      )}
    </div>
  )
}
