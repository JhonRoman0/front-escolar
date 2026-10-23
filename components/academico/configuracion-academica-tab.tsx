"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Baby, BookOpen, GraduationCap, Lock, School, Timer, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"

import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { TEXTO_ESTADO_ANIO, useFiltrosMalla } from "@/components/academico/cursos-tab"
import { useConfiguracionAcademica, useGuardarConfiguracionAcademica } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import { ESTADO_ANIO, type ConfiguracionAcademicaResponse } from "@/lib/api/academico"

const LIBRE = "libre"

// "Libre" y de 30 a 60 minutos, de 5 en 5 (lo mismo que valida el backend).
const OPCIONES_DURACION = [
  { value: LIBRE, label: "Libre (sin bloques fijos)" },
  ...Array.from({ length: 7 }, (_, i) => 30 + i * 5).map((m) => ({ value: String(m), label: `${m} minutos` })),
]

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

/**
 * Reglas académicas de cada nivel en un año escolar. Por ahora la duración de
 * la hora académica, que define los bloques de los horarios en Asignaciones.
 */
export function ConfiguracionAcademicaTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio } = filtros
  const { data = [], isLoading, isError, refetch } = useConfiguracionAcademica(idAnio)
  const puedeEditar = usePuede("CONFIGURACION_ACADEMICA", "ACTUALIZAR")
  const editable = anio?.estado === ESTADO_ANIO.POR_COMENZAR

  const opcionesAnio = [...filtros.anios]
    .sort((a, b) => b.anio.localeCompare(a.anio))
    .map((a) => ({ value: String(a.idAnio), label: `${a.anio} (${TEXTO_ESTADO_ANIO[a.estado] ?? ""})` }))

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Configuración académica"
          descripcion="Duración de la hora académica de cada nivel. Define los bloques en que se arman los horarios de Asignaciones."
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

        {anio && !editable && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
            <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold leading-tight">
                Año escolar {anio.anio} {TEXTO_ESTADO_ANIO[anio.estado]}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Su configuración es de solo lectura. Solo se configura un año por comenzar.
              </p>
            </div>
          </div>
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
                key={`${config.idAnio}-${config.idNivel}-${config.minutosHoraAcademica ?? LIBRE}`}
                config={config}
                editable={editable && puedeEditar}
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

function NivelCard({ config, editable }: { config: ConfiguracionAcademicaResponse; editable: boolean }) {
  const guardar = useGuardarConfiguracionAcademica()
  const actual = config.minutosHoraAcademica == null ? LIBRE : String(config.minutosHoraAcademica)
  const [valor, setValor] = useState(actual)
  const Icono = ICONOS_NIVEL[claveIconoNivel(config.nivel)]
  const conAsignaciones = config.asignaciones > 0
  // Heredado o por defecto todavía no está guardado: guardarlo lo fija para este año.
  const sinGuardar = config.origen !== "CONFIGURADO"
  const cambio = valor !== actual

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await guardar.mutateAsync({
        idAnio: config.idAnio,
        idNivel: config.idNivel,
        minutosHoraAcademica: valor === LIBRE ? null : Number(valor),
      })
      toast.success(`Hora académica de ${config.nivel} guardada`)
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

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted p-2">
            <Timer className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Hora académica</p>
            <p className="font-mono text-lg font-semibold">{textoDuracion(config.minutosHoraAcademica)}</p>
          </div>
        </div>

        {editable && (
          <Field>
            <FieldLabel>Duración</FieldLabel>
            <FieldContent>
              <FilterSelect
                value={valor}
                onValueChange={(v) => v && setValor(v)}
                options={OPCIONES_DURACION}
                includeAll={false}
                className="w-full"
                disabled={conAsignaciones}
              />
              <FieldDescription className="text-xs">
                {conAsignaciones
                  ? `Ya tiene ${config.asignaciones} ${config.asignaciones === 1 ? "asignación" : "asignaciones"}: sus horarios se armaron con esta duración y ya no cambia.`
                  : valor === LIBRE
                    ? "Las clases duran lo que se elija, en pasos de 5 minutos."
                    : `Las clases duran bloques de ${valor} minutos (${valor}, ${Number(valor) * 2}, ${Number(valor) * 3}…).`}
              </FieldDescription>
            </FieldContent>
          </Field>
        )}

        {editable && !conAsignaciones && (
          <div className="mt-auto flex items-center justify-end">
            <BotonGuardar etiqueta="Guardar" enviando={guardar.isPending} size="sm" disabled={!cambio && !sinGuardar} />
          </div>
        )}
      </form>
    </div>
  )
}
