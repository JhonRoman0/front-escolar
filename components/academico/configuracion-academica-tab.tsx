"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Baby, BookOpen, CalendarRange, GraduationCap, Info, Lock, Pencil, School, Scale, Timer, TrendingUp, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { EditorPeriodos, ListaPeriodos } from "@/components/academico/editor-periodos"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useFiltrosMalla } from "@/hooks/use-filtros-malla"
import { TEXTO_ESTADO_ANIO } from "@/components/academico/filtros-malla"
import { useConfiguracionAcademica, useGuardarConfiguracionAcademica } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import {
  ESTADO_ANIO,
  type AnioEscolarResponse,
  type ConfiguracionAcademicaResponse,
  type EscalaCalificacion,
  type TipoPeriodo,
} from "@/lib/api/academico"
import { cantidadPeriodos, ESCALAS, erroresPeriodos, TIPOS_PERIODO, type RangoPeriodo } from "@/lib/calificaciones"

const LIBRE = "libre"

// "Libre" y de 30 a 60 minutos, de 5 en 5 (lo mismo que valida el backend).
const OPCIONES_DURACION = [
  { value: LIBRE, label: "Libre (sin bloques fijos)" },
  ...Array.from({ length: 7 }, (_, i) => 30 + i * 5).map((m) => ({ value: String(m), label: `${m} minutos` })),
]

const OPCIONES_ESCALA = ESCALAS.map((e) => ({ value: e.value, label: `${e.label} (${e.detalle})` }))
const OPCIONES_TIPO = TIPOS_PERIODO.map((t) => ({ value: t.value, label: t.label }))

// Nota mínima para aprobar un área: en literal no vale C (nadie desaprobaría); en vigesimal de 1 a 20.
const MINIMAS: Record<EscalaCalificacion, { value: string; label: string }[]> = {
  LITERAL: ["AD", "A", "B"].map((n) => ({ value: n, label: n })),
  VIGESIMAL: Array.from({ length: 20 }, (_, i) => String(i + 1)).map((n) => ({ value: n, label: n })),
}
const MINIMA_POR_DEFECTO: Record<EscalaCalificacion, string> = { LITERAL: "B", VIGESIMAL: "11" }
const OPCIONES_AREAS = Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => ({
  value: n,
  label: `${n} ${n === "1" ? "área" : "áreas"}`,
}))

const ICONOS_NIVEL: Record<string, LucideIcon> = {
  inicial: Baby,
  primaria: BookOpen,
  secundaria: GraduationCap,
  otro: School,
}

function claveIconoNivel(nombre: string) {
  const n = nombre.toLowerCase()
  if (n.includes("inicial")) return "inicial"
  if (n.includes("primaria")) return "primaria"
  if (n.includes("secundaria")) return "secundaria"
  return "otro"
}

function textoDuracion(minutos: number | null) {
  return minutos == null ? "Libre" : `${minutos} min`
}

function textoEscala(escala: EscalaCalificacion) {
  const e = ESCALAS.find((x) => x.value === escala)
  return e ? `${e.label} (${e.detalle})` : escala
}

/** Mismo largo que pide el tipo: conserva las fechas que ya había. */
function ajustarPeriodos(periodos: RangoPeriodo[], tipo: TipoPeriodo): RangoPeriodo[] {
  return Array.from({ length: cantidadPeriodos(tipo) }, (_, i) => periodos[i] ?? { fechaInicio: "", fechaFin: "" })
}

/**
 * Reglas académicas de cada nivel en un año escolar: hora académica, escala de
 * calificación y periodos. Todo se edita con el año por comenzar.
 */
export function ConfiguracionAcademicaTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio } = filtros
  const { data = [], isLoading, isError, refetch } = useConfiguracionAcademica(idAnio)
  const puedeEditar = usePuede("CONFIGURACION_ACADEMICA", "ACTUALIZAR")
  const porComenzar = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  const algunoEditable = data.some((c) => c.editable)

  const opcionesAnio = [...filtros.anios]
    .sort((a, b) => b.anio.localeCompare(a.anio))
    .map((a) => ({ value: String(a.idAnio), label: `${a.anio} (${TEXTO_ESTADO_ANIO[a.estado] ?? ""})` }))

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Configuración académica"
          descripcion="Hora académica, escala de calificación y periodos de evaluación de cada nivel."
        />

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Año"
            value={idAnio ? String(idAnio) : ""}
            onValueChange={(v) => v && filtros.setIdAnio(Number(v))}
            options={opcionesAnio}
            includeAll={false}
            allLabel="Selecciona"
            className="w-[240px]"
          />
        </div>

        {anio && !porComenzar && (
          <Aviso
            icono={algunoEditable ? Info : Lock}
            titulo={`Año escolar ${anio.anio} ${TEXTO_ESTADO_ANIO[anio.estado]}`}
            texto={
              algunoEditable
                ? "Los niveles que aún no tienen periodos se pueden configurar una sola vez. La hora académica ya no cambia."
                : "Su configuración es de solo lectura. Solo se configura un año por comenzar."
            }
          />
        )}

        {isLoading ? (
          <CargandoTarjetas filas={3} />
        ) : isError ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No se pudo cargar la configuración. Recarga la pantalla.
          </div>
        ) : !data.length ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Aún no hay niveles registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
            {data.map((config) => (
              <NivelCard
                // Al guardar llega la respuesta nueva y la tarjeta arranca limpia.
                key={`${config.idAnio}-${config.idNivel}-${JSON.stringify([
                  config.minutosHoraAcademica,
                  config.escala,
                  config.tipoPeriodo,
                  config.notaMinima,
                  config.areasParaRepetir,
                  config.periodos,
                ])}`}
                config={config}
                anio={anio}
                editable={config.editable && puedeEditar}
                editaHora={porComenzar}
              />
            ))}
          </div>
        )}

        {isError && (
          <div>
            <BotonReintentar refetch={refetch} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Aviso({ icono: Icono, titulo, texto }: { icono: LucideIcon; titulo: string; texto: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
      <Icono className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold leading-tight">{titulo}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{texto}</p>
      </div>
    </div>
  )
}

/** Una línea del resumen: ícono, etiqueta y valor. */
function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icono className="size-3.5 shrink-0 text-muted-foreground" />
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="ml-auto text-right font-medium">{valor}</dd>
    </div>
  )
}

/** Fila del formulario: etiqueta a la izquierda, control a la derecha. */
function Fila({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[130px_1fr] sm:gap-3">
      <span className="pt-2 text-sm font-medium">{etiqueta}</span>
      <div className="flex flex-col gap-1">
        {children}
        {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      </div>
    </div>
  )
}

/** Resumen del nivel; se edita en un diálogo. */
function NivelCard({ config, anio, editable, editaHora }: {
  config: ConfiguracionAcademicaResponse
  anio: AnioEscolarResponse | null
  editable: boolean
  /** La hora académica y la promoción solo cambian con el año por comenzar. */
  editaHora: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const Icono = ICONOS_NIVEL[claveIconoNivel(config.nivel)]
  const tipo = TIPOS_PERIODO.find((t) => t.value === config.tipoPeriodo)?.label ?? ""
  const areas = `${config.areasParaRepetir} ${config.areasParaRepetir === 1 ? "área" : "áreas"}`

  return (
    <div className="flex flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icono className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{config.nivel}</span>
        </div>
        <Badge variant={config.origen === "CONFIGURADO" ? "success" : config.origen === "HEREDADO" ? "secondary" : "outline"}>
          {config.origen === "CONFIGURADO"
            ? `Configurado en ${config.anio}`
            : config.origen === "HEREDADO"
              ? `Heredado de ${config.anioOrigen}`
              : "Valor por defecto"}
        </Badge>
      </div>

      <dl className="flex flex-1 flex-col gap-2.5 p-4">
        <Dato icono={Timer} etiqueta="Hora académica" valor={textoDuracion(config.minutosHoraAcademica)} />
        <Dato icono={Scale} etiqueta="Escala" valor={textoEscala(config.escala)} />
        {/* Siempre la fila, para que las tarjetas queden alineadas. */}
        <Dato
          icono={TrendingUp}
          etiqueta="Promoción"
          valor={config.conRepitencia ? `Mínima ${config.notaMinima} · repite con ${areas}` : "No aplica (no repite)"}
        />
        <Dato icono={CalendarRange} etiqueta="Periodos" valor={tipo} />
        <ListaPeriodos periodos={config.periodos} />
      </dl>

      {editable && (
        <div className="flex justify-end border-t px-4 py-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)}>
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {config.nivel} · {config.anio}
            </DialogTitle>
          </DialogHeader>
          {abierto && (
            <FormularioNivel config={config} anio={anio} editaHora={editaHora} onCerrar={() => setAbierto(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormularioNivel({ config, anio, editaHora, onCerrar }: {
  config: ConfiguracionAcademicaResponse
  anio: AnioEscolarResponse | null
  editaHora: boolean
  onCerrar: () => void
}) {
  const guardar = useGuardarConfiguracionAcademica()
  const minutosActual = config.minutosHoraAcademica == null ? LIBRE : String(config.minutosHoraAcademica)
  const periodosActuales = ajustarPeriodos(
    config.periodos.map((p) => ({ fechaInicio: p.fechaInicio, fechaFin: p.fechaFin })),
    config.tipoPeriodo
  )
  const [minutos, setMinutos] = useState(minutosActual)
  const [escala, setEscala] = useState(config.escala)
  const [tipo, setTipo] = useState(config.tipoPeriodo)
  const [periodos, setPeriodos] = useState(periodosActuales)
  const [notaMinima, setNotaMinima] = useState(config.notaMinima)
  const [areas, setAreas] = useState(String(config.areasParaRepetir))

  const conAsignaciones = config.asignaciones > 0
  // Heredado o por defecto todavía no está guardado: guardarlo lo fija para este año.
  const sinGuardar = config.origen !== "CONFIGURADO"
  const cambio =
    minutos !== minutosActual ||
    escala !== config.escala ||
    tipo !== config.tipoPeriodo ||
    notaMinima !== config.notaMinima ||
    areas !== String(config.areasParaRepetir) ||
    JSON.stringify(periodos) !== JSON.stringify(periodosActuales)

  // La mínima de otra escala no vale: vuelve a la de por defecto.
  function cambiarEscala(nueva: EscalaCalificacion) {
    setEscala(nueva)
    setNotaMinima(nueva === config.escala ? config.notaMinima : MINIMA_POR_DEFECTO[nueva])
  }

  function cambiarTipo(nuevo: TipoPeriodo) {
    setTipo(nuevo)
    setPeriodos((actuales) => ajustarPeriodos(actuales, nuevo))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const conFechas = periodos.some((p) => p.fechaInicio || p.fechaFin)
    if (conFechas && erroresPeriodos(periodos, tipo, anio?.fechaInicio ?? null, anio?.fechaFin ?? null).some(Boolean)) {
      toast.error("Revisa las fechas de los periodos")
      return
    }
    try {
      await guardar.mutateAsync({
        idAnio: config.idAnio,
        idNivel: config.idNivel,
        minutosHoraAcademica: minutos === LIBRE ? null : Number(minutos),
        escala,
        tipoPeriodo: tipo,
        // La promoción solo cambia con el año por comenzar.
        notaMinima: editaHora && config.conRepitencia ? notaMinima : null,
        areasParaRepetir: editaHora && config.conRepitencia ? Number(areas) : null,
        // Sin fechas no se tocan los periodos (salvo que cambie el tipo: el backend los borra).
        periodos: conFechas ? periodos : null,
      })
      toast.success(`Configuración de ${config.nivel} guardada`)
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {editaHora && (
        <Fila
          etiqueta="Hora académica"
          ayuda={
            conAsignaciones
              ? `Ya tiene ${config.asignaciones} ${config.asignaciones === 1 ? "asignación" : "asignaciones"}: no se puede cambiar.`
              : undefined
          }
        >
          <FilterSelect
            value={minutos}
            onValueChange={(v) => v && setMinutos(v)}
            options={OPCIONES_DURACION}
            includeAll={false}
            className="w-full"
            disabled={conAsignaciones}
          />
        </Fila>
      )}

      <Fila etiqueta="Escala">
        <FilterSelect
          value={escala}
          onValueChange={(v) => v && cambiarEscala(v as EscalaCalificacion)}
          options={OPCIONES_ESCALA}
          includeAll={false}
          className="w-full"
        />
      </Fila>

      {editaHora && config.conRepitencia && (
        <Fila
          etiqueta="Promoción"
          ayuda="Un área se desaprueba si su promedio (vigesimal) o la mitad de sus competencias (literal) quedan bajo la mínima."
        >
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect
              label="Mínima"
              value={notaMinima}
              onValueChange={(v) => v && setNotaMinima(v)}
              options={MINIMAS[escala]}
              includeAll={false}
              className="w-full"
            />
            <FilterSelect
              label="Repite con"
              value={areas}
              onValueChange={(v) => v && setAreas(v)}
              options={OPCIONES_AREAS}
              includeAll={false}
              className="w-full"
            />
          </div>
        </Fila>
      )}

      <Fila etiqueta="Periodos">
        <FilterSelect
          value={tipo}
          onValueChange={(v) => v && cambiarTipo(v as TipoPeriodo)}
          options={OPCIONES_TIPO}
          includeAll={false}
          className="w-full"
        />
      </Fila>
      {anio?.fechaInicio && anio?.fechaFin ? (
        <EditorPeriodos tipo={tipo} value={periodos} onChange={setPeriodos} inicioAnio={anio.fechaInicio} finAnio={anio.fechaFin} />
      ) : (
        <p className="text-xs text-muted-foreground">Define primero las fechas de inicio y fin del año escolar.</p>
      )}

      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <BotonGuardar etiqueta="Guardar" enviando={guardar.isPending} disabled={!cambio && !sinGuardar} />
      </DialogFooter>
    </form>
  )
}
