"use client"

import { toast } from "sonner"
import { z } from "zod"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { BotonGuardar } from "@/components/shared/boton-guardar"
import { SelectorFecha } from "@/components/shared/selector-fecha"
import { useGuardarEvaluacion } from "@/hooks/use-evaluaciones"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { competenciaCompleta, type AvanceFinal, type CursoEvaluable, type EvaluacionResumen } from "@/lib/api/evaluaciones"
import { dateAIso, diaSemanaIso, formatearFecha, isoADate } from "@/lib/fechas"

const schema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  competencias: z.array(z.number()).min(1, "Marca al menos una competencia"),
})

type Valores = z.infer<typeof schema>

/** Crear o editar una evaluación: nombre, fecha dentro del periodo y competencias que afecta. */
export function EvaluacionFormDialog({
  open,
  onOpenChange,
  curso,
  periodo,
  evaluacion,
  avance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curso: CursoEvaluable
  periodo: PeriodoEvaluacion
  /** Sin evaluación: se crea una nueva. */
  evaluacion: EvaluacionResumen | null
  /** Notas finales ya registradas por competencia en el periodo. */
  avance: AvanceFinal[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{evaluacion ? "Editar evaluación" : "Nueva evaluación"}</DialogTitle>
        </DialogHeader>
        {open && (
          <Formulario curso={curso} periodo={periodo} evaluacion={evaluacion} avance={avance} onCerrar={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Bajo cada competencia: cerrada para todos, o cuántos ya no se podrán calificar. */
function AvisoAvance({ avance, marcada }: { avance: AvanceFinal | undefined; marcada: boolean }) {
  if (!avance || avance.conNotaFinal === 0) return null
  if (competenciaCompleta(avance)) {
    return <span className="block text-xs">Todos los alumnos ya tienen nota final en esta competencia.</span>
  }
  if (!marcada) return null
  return (
    <span className="block text-xs text-amber-700 dark:text-amber-400">
      {avance.conNotaFinal} {avance.conNotaFinal === 1 ? "alumno ya tiene" : "alumnos ya tienen"} nota final: no podrás calificarlos en esta evaluación.
    </span>
  )
}
const NOMBRES_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
const LUNES_A_VIERNES = [1, 2, 3, 4, 5]

/** Días de clase del curso; sin horario, de lunes a viernes. */
function diasHabilitados(curso: CursoEvaluable): number[] {
  return curso.diasClase.length ? curso.diasClase : LUNES_A_VIERNES
}

/** Hoy si es día de clase dentro del periodo; si no, la próxima clase; si tampoco, vacío. */
function fechaInicial(curso: CursoEvaluable, periodo: PeriodoEvaluacion): string {
  const dias = diasHabilitados(curso)
  const feriados = new Set(curso.feriados)
  const hoy = new Date().toLocaleDateString("en-CA")
  const fecha = isoADate(hoy > periodo.fechaInicio ? hoy : periodo.fechaInicio)
  const fin = isoADate(periodo.fechaFin)
  while (fecha && fin && fecha <= fin) {
    if (dias.includes(diaSemanaIso(fecha)) && !feriados.has(dateAIso(fecha))) return dateAIso(fecha)
    fecha.setDate(fecha.getDate() + 1)
  }
  return ""
}

function textoDias(dias: number[]): string {
  const nombres = dias.map((d) => `${NOMBRES_DIA[d - 1]}${d >= 6 ? "s" : ""}`)
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`
}

function Formulario({ curso, periodo, evaluacion, avance, onCerrar }: {
  curso: CursoEvaluable
  periodo: PeriodoEvaluacion
  evaluacion: EvaluacionResumen | null
  avance: AvanceFinal[]
  onCerrar: () => void
}) {
  const avancePor = new Map(avance.map((a) => [a.idCompetencia, a]))
  const yaMarcadas = new Set(evaluacion?.competencias.map((c) => c.idCompetencia) ?? [])
  /** Cerrada para toda la sección: no se puede marcar (salvo que la evaluación ya la tuviera). */
  const cerrada = (id: number) => !yaMarcadas.has(id) && competenciaCompleta(avancePor.get(id))
  const guardar = useGuardarEvaluacion()
  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: evaluacion?.nombre ?? "",
      fecha: evaluacion?.fecha ?? fechaInicial(curso, periodo),
      // Con una sola competencia no hay nada que elegir.
      competencias: evaluacion?.competencias.map((c) => c.idCompetencia)
        ?? (curso.competencias.length === 1 && !competenciaCompleta(avance.find((a) => a.idCompetencia === curso.competencias[0].idCompetencia))
          ? [curso.competencias[0].idCompetencia]
          : []),
    },
  })
  const { errors } = form.formState
  // Con notas, cambiar fecha o competencias movería notas ya puestas: solo el nombre.
  const bloqueada = (evaluacion?.notasRegistradas ?? 0) > 0

  const onSubmit = form.handleSubmit(async (valores) => {
    try {
      await guardar.mutateAsync({
        id: evaluacion?.idEvaluacion,
        data: {
          idAsignacion: curso.idAsignacion,
          periodo: periodo.numero,
          nombre: valores.nombre.trim(),
          fecha: valores.fecha,
          competencias: valores.competencias,
        },
      })
      toast.success(evaluacion ? "Evaluación actualizada" : "Evaluación creada")
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la evaluación")
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="break-words text-sm font-medium">{curso.curso}</p>
        <p className="text-xs text-muted-foreground" title={`${formatearFecha(periodo.fechaInicio)} al ${formatearFecha(periodo.fechaFin)}`}>
          {periodo.nombre}
        </p>
      </div>
      {bloqueada && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          Ya tiene notas registradas: solo se puede cambiar el nombre.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre-evaluacion" className="text-sm font-medium">Nombre *</label>
        <Input
          id="nombre-evaluacion"
          maxLength={100}
          placeholder="Ej.: Examen de la unidad 1"
          aria-invalid={!!errors.nombre}
          {...form.register("nombre")}
        />
        <FieldError errors={[errors.nombre]} />
      </div>

      <Controller
        name="fecha"
        control={form.control}
        render={({ field }) => (
          <SelectorFecha
            label="Fecha de la evaluación *"
            value={field.value}
            onChange={field.onChange}
            min={periodo.fechaInicio}
            max={periodo.fechaFin}
            diasSemana={diasHabilitados(curso)}
            fechasBloqueadas={curso.feriados}
            deshabilitado={bloqueada}
            className="max-w-[240px]"
            error={errors.fecha}
            descripcion={
              curso.diasClase.length
                ? `Este curso se dicta los ${textoDias(curso.diasClase)}`
                : "Este curso no tiene horario registrado: se permiten de lunes a viernes."
            }
          />
        )}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">Competencias que se evaluarán *</p>
        <p className="text-xs text-muted-foreground">
          Selecciona las competencias que evaluarás
        </p>
        <Controller
          name="competencias"
          control={form.control}
          render={({ field }) => (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              {curso.competencias.map((c) => (
                <label
                  key={c.idCompetencia}
                  className={`flex items-start gap-2 text-sm ${bloqueada || cerrada(c.idCompetencia) ? "text-muted-foreground" : "cursor-pointer"}`}
                >
                  <Checkbox
                    className="mt-0.5"
                    disabled={bloqueada || cerrada(c.idCompetencia)}
                    checked={field.value.includes(c.idCompetencia)}
                    onCheckedChange={(marcada) =>
                      field.onChange(
                        marcada ? [...field.value, c.idCompetencia] : field.value.filter((id) => id !== c.idCompetencia)
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{c.codigo}.</span> {c.nombre}
                    <AvisoAvance avance={avancePor.get(c.idCompetencia)} marcada={field.value.includes(c.idCompetencia)} />
                  </span>
                </label>
              ))}
            </div>
          )}
        />
        <FieldError errors={[errors.competencias]} />
      </div>

      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <BotonGuardar etiqueta={evaluacion ? "Guardar cambios" : "Crear evaluación"} enviando={guardar.isPending} />
      </DialogFooter>
    </form>
  )
}
