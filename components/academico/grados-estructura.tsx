"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GraduationCap,
  type LucideIcon,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
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

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { useEliminarConToast } from "@/hooks/use-eliminar-toast"
import {
  AccionesFila,
  CampoAcceso,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useCrudGrados,
  useGrados,
  useNiveles,
  useTurnos,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import type {
  AnioEscolarResponse,
  GradoRequest,
  GradoResponse,
  TurnoResponse,
} from "@/lib/api/academico"
import { gradoSchema, type GradoValues } from "@/lib/schemas/academico"

interface GradosEstructuraProps {
  /** Navega a la subpestaña de Turnos. undefined si el usuario no puede verla. */
  onIrATurnos?: () => void
  /** Navega a la subpestaña de Año escolar. undefined si el usuario no puede verla. */
  onIrAAnios?: () => void
}

// Un grado se guarda como combinación de Nivel + Turno + Año escolar, así que sin
// un turno activo y un año vigente no hay nada que registrar. El bloqueo es solo
// visual: el backend sigue siendo la fuente de verdad de esas relaciones.
export function GradosEstructura({
  onIrATurnos,
  onIrAAnios,
}: GradosEstructuraProps) {
  const { data, isLoading, isError, refetch } = useGrados()
  const { data: turnos = [], isLoading: cargandoTurnos } = useTurnos()
  const { data: anios = [], isLoading: cargandoAnios } = useAniosEscolares()
  const { data: niveles = [] } = useNiveles()
  const crud = useCrudGrados()
  const puedeCrear = usePuede("GRADOS", "CREAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("GRADOS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<GradoResponse | null>(null)

  const turnoActivo = turnos.find((t) => t.accesoId === 1) ?? null
  const anioVigente = anios.find((a) => a.estado === 1) ?? null
  const faltaTurno = !turnoActivo
  const faltaAnio = !anioVigente
  const bloqueado = (faltaTurno || faltaAnio) && !cargandoTurnos && !cargandoAnios

  const eliminarConToast = useEliminarConToast()

  function handleEliminar(grado: GradoResponse) {
    return eliminarConToast(crud.eliminar.mutateAsync, {
      id: grado.idGrado,
      mensaje: `Grado "${grado.nombre}" eliminado`,
    })
  }

  if (bloqueado) {
    return (
      <RequisitosPendientes
        faltaTurno={faltaTurno}
        faltaAnio={faltaAnio}
        onIrATurnos={onIrATurnos}
        onIrAAnios={onIrAAnios}
      />
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Grados y secciones"
          descripcion="Un grado agrupa secciones dentro de un turno y año escolar."
          acciones={
            <BotonNuevo
              texto="Nuevo grado"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grado</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Secciones</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={7} />
              ) : isError ? (
                <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={7} mensaje="Aún no hay grados." />
              ) : (
                data.map((grado) => (
                  <TableRow key={grado.idGrado}>
                    <TableCell className="font-medium">{grado.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{grado.nivel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {grado.secciones.map((s) => (
                          <Badge key={s.idSeccion} variant="secondary">
                            {s.nombre}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{grado.turno}</TableCell>
                    <TableCell>{grado.anio}</TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={grado.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AccionesFila
                        puedeActualizar={puedeActualizar}
                        puedeEliminar={puedeEliminar}
                        onEditar={() => { setEditando(grado); setDialogOpen(true) }}
                        onEliminar={() => handleEliminar(grado)}
                        tituloEliminar="Eliminar grado"
                        descripcionEliminar={`Se marcará "${grado.nombre}" y sus secciones como eliminado.`}
                        ariaEditar={`Editar ${grado.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isError && <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>}
        <GradoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          grado={editando}
          niveles={niveles}
          anioVigente={anioVigente}
          turnoActivo={turnoActivo}
          anios={anios}
          turnos={turnos}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

interface RequisitosPendientesProps {
  faltaTurno: boolean
  faltaAnio: boolean
  onIrATurnos?: () => void
  onIrAAnios?: () => void
}

function RequisitosPendientes({
  faltaTurno,
  faltaAnio,
  onIrATurnos,
  onIrAAnios,
}: RequisitosPendientesProps) {
  const pendientes: {
    falta: boolean
    titulo: string
    descripcion: string
    icono: LucideIcon
    accion?: () => void
    etiqueta: string
  }[] = [
    {
      falta: faltaTurno,
      titulo: "No hay ningún turno activo",
      descripcion: "Los turnos agrupan las secciones y definen el horario de cada grado.",
      icono: Clock3,
      accion: onIrATurnos,
      etiqueta: "Ir a Turnos",
    },
    {
      falta: faltaAnio,
      titulo: "No hay un año escolar vigente",
      descripcion: "Solo puede existir un año vigente. Activa uno o crea el nuevo.",
      icono: CalendarDays,
      accion: onIrAAnios,
      etiqueta: "Ir a Año escolar",
    },
  ].filter((p) => p.falta)

  const sinPermiso = pendientes.filter((p) => !p.accion).length

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <HeaderSeccion
          titulo="Grados y secciones"
          descripcion="Un grado agrupa secciones dentro de un turno y un año escolar, así que ambos deben existir antes de registrarlo."
          icono={GraduationCap}
        />
        <ul className="flex flex-col gap-3">
          {pendientes.map((p) => {
            const Icono = p.icono
            return (
              <li
                key={p.etiqueta}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4"
              >
                <div className="flex items-start gap-3">
                  <Icono className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      {p.descripcion}
                    </p>
                  </div>
                </div>
                {p.accion && (
                  <Button variant="outline" size="sm" onClick={p.accion}>
                    {p.etiqueta}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {sinPermiso > 0 && (
          <p className="text-[13px] leading-5 text-muted-foreground">
            {sinPermiso === 1
              ? "Pide a un administrador que registre ese dato para habilitar esta sección."
              : "Pide a un administrador que registre esos datos para habilitar esta sección."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function GradoDialog({
  open,
  onOpenChange,
  grado,
  niveles,
  anioVigente,
  turnoActivo,
  anios,
  turnos,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grado?: GradoResponse | null
  niveles: { idNivel: number; nombre: string }[]
  anioVigente: AnioEscolarResponse | null
  turnoActivo: TurnoResponse | null
  anios: AnioEscolarResponse[]
  turnos: TurnoResponse[]
  crear: ReturnType<typeof useCrudGrados>["crear"]
  actualizar: ReturnType<typeof useCrudGrados>["actualizar"]
}) {
  const esEdicion = !!grado
  const form = useForm<GradoValues>({
    resolver: zodResolver(gradoSchema),
    defaultValues: {
      nombre: grado?.nombre ?? "",
      idNivel: grado?.idNivel ?? 0,
      idAnio: grado?.idAnio ?? anioVigente?.idAnio ?? 0,
      idTurno: grado?.idTurno ?? turnoActivo?.idTurno ?? 0,
      secciones: grado?.secciones.map((s) => s.nombre) ?? [],
      accesoId: grado?.accesoId ?? 1,
    },
  })

  // El diálogo se renderiza siempre y solo cambia `open`, así que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el form limpio
  // sin depender de una key que solo remonta cuando cambia el registro.
  useEffect(() => {
    if (!open) return
    form.reset({
      nombre: grado?.nombre ?? "",
      idNivel: grado?.idNivel ?? 0,
      idAnio: grado?.idAnio ?? anioVigente?.idAnio ?? 0,
      idTurno: grado?.idTurno ?? turnoActivo?.idTurno ?? 0,
      secciones: grado?.secciones.map((s) => s.nombre) ?? [],
      accesoId: grado?.accesoId ?? 1,
    })
  }, [open, grado, anioVigente, turnoActivo, form])
  // useWatch en vez de form.watch: watch() no se puede memoizar y hace que React
  // Compiler se salte el componente entero.
  const idNivelSeleccionado = useWatch({ control: form.control, name: "idNivel" })
  const idAnioVal = useWatch({ control: form.control, name: "idAnio" })
  const idTurnoVal = useWatch({ control: form.control, name: "idTurno" })
  const enviando = crear.isPending || actualizar.isPending

  // El backend ya no distingue Inicial del resto: la migracion de DataSeeder le
  // engancho una letra a la fila que antes se llamaba "Unica", asi que todos los
  // niveles, Inicial incluido, llevan secciones.
  function buildRequest(values: GradoValues): GradoRequest {
    return {
      nombre: values.nombre,
      idNivel: values.idNivel,
      idAnio: values.idAnio,
      idTurno: values.idTurno,
      secciones: values.secciones.map((s) => s.trim()).filter(Boolean),
      ...(esEdicion ? { accesoId: values.accesoId } : {}),
    }
  }

  async function onSubmit(values: GradoValues) {
    try {
      if (esEdicion && grado) await actualizar.mutateAsync({ id: grado.idGrado, data: buildRequest(values) })
      else await crear.mutateAsync(buildRequest(values))
      toast.success(esEdicion ? "Grado actualizado" : "Grado creado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar grado" : "Nuevo grado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller control={form.control} name="nombre" render={({ field }) => (<Field><FieldLabel>Nombre del grado</FieldLabel><FieldContent><Input placeholder="Primero de Secundaria" autoFocus {...field} /><FieldError errors={[form.formState.errors.nombre]} /></FieldContent></Field>)} />
            <Controller control={form.control} name="idNivel" render={({ field }) => (<Field><FieldLabel>Nivel</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}><SelectTrigger className="w-full"><SelectValue>{niveles.find((n) => n.idNivel === field.value)?.nombre ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{niveles.map((n) => (<SelectItem key={n.idNivel} value={String(n.idNivel)}>{n.nombre}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldError errors={[form.formState.errors.idNivel]} /></FieldContent></Field>)} />
            <FieldSet><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Controller control={form.control} name="idAnio" render={({ field }) => (<Field><FieldLabel>Año escolar</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}><SelectTrigger className="w-full"><SelectValue>{anios.find((a) => a.idAnio === field.value)?.anio ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{anios.map((a) => (<SelectItem key={a.idAnio} value={String(a.idAnio)}>{a.anio}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldError errors={[form.formState.errors.idAnio]} /></FieldContent></Field>)} /><Controller control={form.control} name="idTurno" render={({ field }) => (<Field><FieldLabel>Turno</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}><SelectTrigger className="w-full"><SelectValue>{turnos.find((t) => t.idTurno === field.value)?.nombre ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{turnos.map((t) => (<SelectItem key={t.idTurno} value={String(t.idTurno)}>{t.nombre}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldError errors={[form.formState.errors.idTurno]} /></FieldContent></Field>)} /></div></FieldSet>
            <Field><FieldLabel>Secciones</FieldLabel><FieldContent><Controller control={form.control} name="secciones" render={({ field }) => (<div className="flex flex-col gap-2">{field.value.map((seccion, index) => (<div key={index} className="flex gap-2"><Input className="flex-1" placeholder="A" value={seccion} onChange={(e) => { const next = [...field.value]; next[index] = e.target.value; field.onChange(next) }} /><Button type="button" variant="outline" size="icon" disabled={field.value.length <= 1} onClick={() => field.onChange(field.value.filter((_, i) => i !== index))} aria-label={`Quitar sección ${index + 1}`}>X</Button></div>))}<Button type="button" variant="outline" size="sm" onClick={() => field.onChange([...field.value, ""])}>Agregar sección</Button></div>)} /><FieldError errors={[form.formState.errors.secciones]} /></FieldContent></Field>
            {esEdicion && (<Controller control={form.control} name="accesoId" render={({ field }) => (<Field><FieldLabel>Estado</FieldLabel><FieldContent><CampoAcceso value={field.value} onChange={field.onChange} /></FieldContent></Field>)} />)}
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><BotonGuardar etiqueta={esEdicion ? "Guardar cambios" : "Crear grado"} enviando={enviando} disabled={!idNivelSeleccionado || !idAnioVal || !idTurnoVal} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
