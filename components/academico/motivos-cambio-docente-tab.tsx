"use client"

import { FiltrosCambiosDocente, opcionesFiltro } from "./filtros-cambios-docente"
import { paginarFilas, TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { coincideBusqueda, tokensBusqueda } from "@/lib/busqueda"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Settings2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { AccionesFila, FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import {
  useActualizarMotivoCambioDocente,
  useCrearMotivoCambioDocente,
  useEliminarMotivoCambioDocente,
  useMotivosCambioDocente,
} from "@/hooks/use-academico"
import { ACCESO, type MotivoCambioDocenteResponse } from "@/lib/api/academico"
import {
  motivoCambioDocenteSchema,
  type MotivoCambioDocenteValues,
} from "@/lib/schemas/academico"

function valoresInicialesMotivo(
  motivo?: MotivoCambioDocenteResponse | null
): MotivoCambioDocenteValues {
  return {
    nombre: motivo?.nombre ?? "",
    aplicaTemporal: motivo?.aplicaTemporal ?? true,
    aplicaDefinitivo: motivo?.aplicaDefinitivo ?? true,
  }
}

export default function MotivosCambioDocenteTab({
  puedeConfigurar,
}: {
  puedeConfigurar: boolean
}) {
  const { data: motivos = [], isLoading, isError, refetch } = useMotivosCambioDocente()
  const crear = useCrearMotivoCambioDocente()
  const actualizar = useActualizarMotivoCambioDocente()
  const eliminar = useEliminarMotivoCambioDocente()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<MotivoCambioDocenteResponse | null>(null)

  const [pagina, setPagina] = useState(0)
  const [busqueda, buscar] = useState("")
  const [aplicabilidad, setAplicabilidad] = useState("")
  const [estado, setEstado] = useState("")
  const tokens = tokensBusqueda(busqueda)
  const visibles = motivos.filter(motivo => (!estado || String(motivo.activo ? ACCESO.ACTIVO : ACCESO.INACTIVO) === estado)
    && (!aplicabilidad || (aplicabilidad === "temporal" ? motivo.aplicaTemporal : motivo.aplicaDefinitivo))
    && coincideBusqueda([motivo.nombre], tokens))
  const paginacion = paginarFilas(visibles, pagina)

  function manejarOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditando(null)
  }

  async function handleEliminar(motivo: MotivoCambioDocenteResponse) {
    try {
      await eliminar.mutateAsync(motivo.idMotivoCambioDocente)
      toast.success(`Motivo "${motivo.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el motivo")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderSeccion
          titulo="Motivos de cambio de docente"
          descripcion="Catálogo de motivos disponibles al registrar un cambio. Sin motivos, el formulario de cambios permanece vacío."
          icono={Settings2}
          acciones={
            <BotonNuevo
              texto="Nuevo motivo"
              puedeCrear={puedeConfigurar}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />

        <FiltrosCambiosDocente busqueda={busqueda} onBuscar={buscar} placeholder="Buscar motivo"
          filtros={[
            { label: "Aplicabilidad", value: aplicabilidad, onValueChange: setAplicabilidad,
              options: opcionesFiltro({ temporal: "Temporal", definitiva: "Definitiva" }) },
            { label: "Estado", value: estado, onValueChange: setEstado,
              options: opcionesFiltro({ [ACCESO.ACTIVO]: "Activo", [ACCESO.INACTIVO]: "Inactivo" }) },
          ]}
          reiniciarPagina={() => setPagina(0)}
          limpiar={() => { buscar(""); setAplicabilidad(""); setEstado("") }}
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Temporal</TableHead>
                <TableHead>Definitivo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={4} />
              ) : isError ? (
                <MensajeSinDatos columnas={4} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos
                  columnas={4}
                  mensaje="Aún no hay motivos. Créalos aquí para habilitar el formulario de cambios."
                />
              ) : (
                paginacion.content.map((motivo) => (
                  <TableRow key={motivo.idMotivoCambioDocente}>
                    <TableCell className="font-medium">{motivo.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={motivo.aplicaTemporal ? "success" : "outline"}>
                        {motivo.aplicaTemporal ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={motivo.aplicaDefinitivo ? "success" : "outline"}>
                        {motivo.aplicaDefinitivo ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AccionesFila
                        puedeActualizar={puedeConfigurar}
                        puedeEliminar={puedeConfigurar}
                        onEditar={() => {
                          setEditando(motivo)
                          setDialogOpen(true)
                        }}
                        onEliminar={() => handleEliminar(motivo)}
                        tituloEliminar="Eliminar motivo"
                        descripcionEliminar={`Se dejará de ofrecer "${motivo.nombre}" en los cambios.`}
                        ariaEditar={`Editar ${motivo.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablaPaginacion data={isLoading || isError ? null : paginacion} onPage={setPagina} />

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        <MotivoDialog
          key={editando?.idMotivoCambioDocente ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={manejarOpenChange}
          motivo={editando}
          crear={crear}
          actualizar={actualizar}
        />
      </CardContent>
    </Card>
  )
}

type CrearMotivo = ReturnType<typeof useCrearMotivoCambioDocente>
type ActualizarMotivo = ReturnType<typeof useActualizarMotivoCambioDocente>

function MotivoDialog({
  open,
  onOpenChange,
  motivo,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  motivo: MotivoCambioDocenteResponse | null
  crear: CrearMotivo
  actualizar: ActualizarMotivo
}) {
  const form = useForm<MotivoCambioDocenteValues>({
    resolver: zodResolver(motivoCambioDocenteSchema),
    defaultValues: valoresInicialesMotivo(motivo),
  })

  useEffect(() => {
    if (open) form.reset(valoresInicialesMotivo(motivo))
  }, [open, motivo, form])

  function cerrar() {
    form.reset(valoresInicialesMotivo(motivo))
    onOpenChange(false)
  }

  async function guardar(values: MotivoCambioDocenteValues) {
    try {
      if (motivo) {
        await actualizar.mutateAsync({
          id: motivo.idMotivoCambioDocente,
          data: values,
        })
        toast.success("Motivo actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Motivo creado")
      }
      cerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el motivo")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(siguiente) => {
        if (!siguiente) form.reset(valoresInicialesMotivo(motivo))
        onOpenChange(siguiente)
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{motivo ? "Editar motivo" : "Nuevo motivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(guardar)} className="flex min-h-0 flex-col gap-4" noValidate>
          <DialogBody className="space-y-4 overflow-visible">
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre</FieldLabel>
                  <FieldContent>
                    <Input {...field} />
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="aplicaTemporal"
              render={({ field }) => (
                <Field>
                  <FieldContent>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      Aplica a cambios temporales
                    </label>
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="aplicaDefinitivo"
              render={({ field }) => (
                <Field>
                  <FieldContent>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      Aplica a cambios definitivos
                    </label>
                    <FieldError errors={[form.formState.errors.aplicaDefinitivo]} />
                  </FieldContent>
                </Field>
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button>
            <BotonGuardar
              etiqueta="Guardar"
              enviando={crear.isPending || actualizar.isPending}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
