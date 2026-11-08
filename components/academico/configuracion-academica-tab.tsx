"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Baby, BookOpen, CalendarRange, GraduationCap, Info, Lock, School, Scale, Timer, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"

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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.map((config) => (
              <NivelCard
                // Al guardar llega la respuesta nueva y la tarjeta arranca limpia.
                key={`${config.idAnio}-${config.idNivel}-${JSON.stringify([
                  config.minutosHoraAcademica,
                  config.escala,
                  config.tipoPeriodo,
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

function Seccion({ icono: Icono, titulo, valor, children }: {
  icono: LucideIcon
  titulo: string
  valor?: string
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-muted p-2">
          <Icono className="size-4 text-muted-foreground" />
        </span>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{titulo}</p>
          {valor && <p className="text-sm font-semibold">{valor}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function NivelCard({ config, anio, editable, editaHora }: {
  config: ConfiguracionAcademicaResponse
  anio: AnioEscolarResponse | null
  editable: boolean
  /** La hora académica solo cambia con el año por comenzar. */
  editaHora: boolean
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

  const Icono = ICONOS_NIVEL[claveIconoNivel(config.nivel)]
  const conAsignaciones = config.asignaciones > 0
  // Heredado o por defecto todavía no está guardado: guardarlo lo fija para este año.
  const sinGuardar = config.origen !== "CONFIGURADO"
  const cambio =
    minutos !== minutosActual ||
    escala !== config.escala ||
    tipo !== config.tipoPeriodo ||
    JSON.stringify(periodos) !== JSON.stringify(periodosActuales)

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
        // Sin fechas no se tocan los periodos (salvo que cambie el tipo: el backend los borra).
        periodos: conFechas ? periodos : null,
      })
      toast.success(`Configuración de ${config.nivel} guardada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

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

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 p-4">
        <Seccion icono={Timer} titulo="Hora académica" valor={textoDuracion(config.minutosHoraAcademica)}>
          {editable && editaHora && (
            <Field>
              <FieldLabel>Duración</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={minutos}
                  onValueChange={(v) => v && setMinutos(v)}
                  options={OPCIONES_DURACION}
                  includeAll={false}
                  className="w-full"
                  disabled={conAsignaciones}
                />
                <FieldDescription className="text-xs">
                  {conAsignaciones
                    ? `Ya tiene ${config.asignaciones} ${config.asignaciones === 1 ? "asignación" : "asignaciones"}: sus horarios se armaron con esta duración.`
                    : minutos === LIBRE
                      ? "Las clases duran lo que se elija, en pasos de 5 minutos."
                      : `Las clases duran bloques de ${minutos} minutos (${minutos}, ${Number(minutos) * 2}, ${Number(minutos) * 3}…).`}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        </Seccion>

        <Seccion icono={Scale} titulo="Escala de calificación" valor={textoEscala(config.escala)}>
          {editable && (
            <Field>
              <FieldContent>
                <FilterSelect
                  value={escala}
                  onValueChange={(v) => v && setEscala(v as EscalaCalificacion)}
                  options={OPCIONES_ESCALA}
                  includeAll={false}
                  className="w-full"
                />
                <FieldDescription className="text-xs">Solo se aplica a {config.nivel.toLowerCase()}.</FieldDescription>
              </FieldContent>
            </Field>
          )}
        </Seccion>

        <Seccion
          icono={CalendarRange}
          titulo="Periodos de evaluación"
          valor={TIPOS_PERIODO.find((t) => t.value === config.tipoPeriodo)?.label}
        >
          {editable ? (
            <div className="flex flex-col gap-3">
              <FilterSelect
                value={tipo}
                onValueChange={(v) => v && cambiarTipo(v as TipoPeriodo)}
                options={OPCIONES_TIPO}
                includeAll={false}
                className="w-full"
              />
              {anio?.fechaInicio && anio?.fechaFin ? (
                <EditorPeriodos
                  tipo={tipo}
                  value={periodos}
                  onChange={setPeriodos}
                  inicioAnio={anio.fechaInicio}
                  finAnio={anio.fechaFin}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Define primero las fechas de inicio y fin del año escolar.
                </p>
              )}
            </div>
          ) : (
            <ListaPeriodos periodos={config.periodos} />
          )}
        </Seccion>

        {editable && (
          <div className="mt-auto flex items-center justify-end">
            <BotonGuardar etiqueta="Guardar" enviando={guardar.isPending} size="sm" disabled={!cambio && !sinGuardar} />
          </div>
        )}
      </form>
    </div>
  )
}
