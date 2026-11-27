"use client"

import { FiltrosCambiosDocente, opcionesFiltro } from "./filtros-cambios-docente"
import { paginarFilas, TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { coincideBusqueda, tokensBusqueda } from "@/lib/busqueda"

import { useState } from "react"
import { ArrowLeftRight, Ban, Check, Eye, Loader2, MessageSquareText, Pencil, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import CambioDocenteDetalleDialog from "@/components/academico/cambio-docente-detalle-dialog"
import CambioDocenteFormDialog, {
  type ModoCambioDocente,
} from "@/components/academico/cambio-docente-form-dialog"
import {
  ESTADO_CAMBIO,
  ETIQUETA_ESTADO_CAMBIO,
  ETIQUETA_TIPO_CAMBIO,
  VARIANTE_ESTADO_CAMBIO,
  etiquetaCantidadAsignaciones,
} from "@/components/academico/cambios-docente-constantes"
import {
  useCambiosDocente,
  useCancelarCambio,
  useFinalizarCambio,
  useResolverIncidencia,
} from "@/hooks/use-academico"
import { usePuede, usePuedeLeer } from "@/hooks/use-permisos"
import type { CambioDocenteResponse } from "@/lib/api/academico"
import { formatearFecha } from "@/lib/fechas"

type Accion = {
  cambio: CambioDocenteResponse
  tipo: "cancelar" | "observacion"
}

type Formulario = {
  modo: ModoCambioDocente
  cambio?: CambioDocenteResponse
}

export default function CambiosTab() {
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [detalle, setDetalle] = useState<CambioDocenteResponse | null>(null)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [textoAccion, setTextoAccion] = useState("")

  const puedeLeer = usePuedeLeer("CAMBIOS_DOCENTE")
  const puedeCrear = usePuede("CAMBIOS_DOCENTE", "CREAR")
  const puedeActualizar = usePuede("CAMBIOS_DOCENTE", "ACTUALIZAR")
  const { data: cambios = [], isLoading, isError } = useCambiosDocente(puedeLeer)
  const resolver = useResolverIncidencia()
  const finalizar = useFinalizarCambio()
  const cancelar = useCancelarCambio()

  const [pagina, setPagina] = useState(0)
  const [busqueda, buscar] = useState("")
  const [tipo, setTipo] = useState("")
  const [estado, setEstado] = useState("")
  const tokens = tokensBusqueda(busqueda)
  const visibles = cambios.filter(cambio => (!tipo || cambio.tipo === tipo)
    && (!estado || cambio.estado === estado)
    && coincideBusqueda([cambio.docenteAnterior, cambio.docenteNuevo], tokens))
  const paginacion = paginarFilas(visibles, pagina)

  function abrirFormulario(modo: ModoCambioDocente, cambio?: CambioDocenteResponse) {
    setFormulario({ modo, cambio })
  }

  function abrirAccion(cambio: CambioDocenteResponse, tipo: Accion["tipo"]) {
    setAccion({ cambio, tipo })
    setTextoAccion("")
  }

  function cerrarAccion() {
    setAccion(null)
    setTextoAccion("")
  }

  async function confirmarAccion() {
    if (!accion) return
    try {
      if (accion.tipo === "observacion") {
        await resolver.mutateAsync({
          id: accion.cambio.idCambio,
          data: { resolucion: textoAccion },
        })
        toast.success("Observación administrativa registrada. La incidencia sigue pendiente.")
      } else {
        await cancelar.mutateAsync({ id: accion.cambio.idCambio, motivo: textoAccion })
        toast.success("Cambio cancelado")
      }
      cerrarAccion()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción")
    }
  }

  async function handleFinalizar(id: number, reintento = false) {
    try {
      const respuesta = await finalizar.mutateAsync(id)
      if (respuesta.estado === ESTADO_CAMBIO.VIGENTE) {
        toast.error(respuesta.motivoIncidencia ?? "La devolución sigue pendiente.")
        return
      }
      toast.success(reintento ? "Finalización reintentada correctamente" : "Cambio finalizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo finalizar el cambio")
    }
  }

  const pendiente = resolver.isPending || finalizar.isPending || cancelar.isPending

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderSeccion
          titulo="Cambios de docente"
          descripcion="Registra y gestiona cambios temporales o definitivos sobre las asignaciones."
          icono={ArrowLeftRight}
          acciones={
            <BotonNuevo
              texto="Nuevo cambio"
              puedeCrear={puedeCrear}
              onClick={() => abrirFormulario("crear")}
            />
          }
        />

        <FiltrosCambiosDocente busqueda={busqueda} onBuscar={buscar} placeholder="Buscar titular o sustituto"
          filtros={[
            { label: "Tipo", value: tipo, onValueChange: setTipo, options: opcionesFiltro(ETIQUETA_TIPO_CAMBIO) },
            { label: "Estado", value: estado, onValueChange: setEstado, options: opcionesFiltro(ETIQUETA_ESTADO_CAMBIO) },
          ]}
          reiniciarPagina={() => setPagina(0)}
          limpiar={() => { buscar(""); setTipo(""); setEstado("") }}
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Cambio</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Sustituto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={6} />
              ) : isError ? (
                <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos columnas={6} mensaje="Aún no hay cambios de docente registrados." />
              ) : (
                paginacion.content.map((cambio) => {
                  const esProgramado = cambio.estado === ESTADO_CAMBIO.PROGRAMADO
                  const esVigente = cambio.estado === ESTADO_CAMBIO.VIGENTE
                  const conIncidencia = cambio.incidencia

                  return (
                    <TableRow key={cambio.idCambio}>
                      <TableCell>
                        <div className="font-medium">{cambio.motivo}</div>
                        <div className="text-xs text-muted-foreground">
                          {ETIQUETA_TIPO_CAMBIO[cambio.tipo]} ·{" "}
                          {etiquetaCantidadAsignaciones(cambio.detalles.length)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{cambio.docenteAnterior}</TableCell>
                      <TableCell className="text-sm">{cambio.docenteNuevo || "Sin cobertura"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={VARIANTE_ESTADO_CAMBIO[cambio.estado]}>
                            {ETIQUETA_ESTADO_CAMBIO[cambio.estado]}
                          </Badge>
                          {conIncidencia && (
                            <Tooltip>
                              <TooltipTrigger
                                render={<Badge variant="danger" className="cursor-help" />}
                              >
                                Incidencia
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {cambio.motivoIncidencia ?? "Motivo de incidencia no registrado"}
                                {cambio.resolucionAdministrativa
                                  ? ` — Observación administrativa: ${cambio.resolucionAdministrativa}`
                                  : ""}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatearFecha(cambio.fechaInicio)}
                        {cambio.fechaFin ? ` → ${formatearFecha(cambio.fechaFin)}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {puedeLeer && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Ver detalle"
                              aria-label={`Ver detalle del cambio de ${cambio.docenteAnterior}`}
                              onClick={() => setDetalle(cambio)}
                            >
                              <Eye />
                            </Button>
                          )}
                          {puedeActualizar && (esProgramado || esVigente) && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Editar"
                              aria-label={`Editar cambio de ${cambio.docenteAnterior}`}
                              onClick={() => abrirFormulario(cambio.estado === ESTADO_CAMBIO.VIGENTE ? "editar-vigente" : "editar-programado", cambio)}
                            >
                              <Pencil />
                            </Button>
                          )}
                          {puedeActualizar && esProgramado && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Anular"
                              aria-label={`Anular cambio programado de ${cambio.docenteAnterior}`}
                              onClick={() => abrirAccion(cambio, "cancelar")}
                            >
                              <Ban />
                            </Button>
                          )}
                          {puedeActualizar && esVigente && !conIncidencia && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Devolver docente"
                              aria-label={`Devolver docente del cambio de ${cambio.docenteAnterior}`}
                              onClick={() => void handleFinalizar(cambio.idCambio)}
                            >
                              <Check />
                            </Button>
                          )}
                          {puedeActualizar && esVigente && conIncidencia && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Ver incidencia"
                              aria-label={`Ver incidencia del cambio de ${cambio.docenteAnterior}`}
                              onClick={() => abrirAccion(cambio, "observacion")}
                            >
                              <MessageSquareText />
                            </Button>
                          )}
                          {puedeActualizar && esVigente && conIncidencia && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Reanudar devolución"
                              aria-label={`Reanudar devolución del cambio de ${cambio.docenteAnterior}`}
                              onClick={() => void handleFinalizar(cambio.idCambio, true)}
                            >
                              <RotateCcw />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablaPaginacion data={isLoading || isError ? null : paginacion} onPage={setPagina} />

        {!puedeCrear && !puedeActualizar && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="size-4" />
            Solo tienes permisos de lectura sobre los cambios.
          </p>
        )}

        {formulario && (
          <CambioDocenteFormDialog
            key={`${formulario.modo}-${formulario.cambio?.idCambio ?? "nuevo"}`}
            open
            onOpenChange={(abierto) => !abierto && setFormulario(null)}
            modo={formulario.modo}
            cambio={formulario.cambio}
          />
        )}

        <CambioDocenteDetalleDialog
          open={!!detalle}
          onOpenChange={(abierto) => !abierto && setDetalle(null)}
          cambio={detalle}
        />

        <Dialog open={!!accion} onOpenChange={(abierto) => !abierto && cerrarAccion()}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>
                {accion?.tipo === "observacion"
                  ? "Observación administrativa"
                  : "Cancelar cambio"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {accion?.tipo === "observacion" && (
                <p className="text-sm text-muted-foreground">
                  Registrar la observación no resuelve la incidencia; podrás reintentar la finalización.
                </p>
              )}
              <Field>
                <FieldLabel>
                  {accion?.tipo === "observacion" ? "Observación" : "Motivo de cancelación"}
                </FieldLabel>
                <FieldContent>
                  <Input value={textoAccion} onChange={(evento) => setTextoAccion(evento.target.value)} />
                </FieldContent>
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarAccion}>
                Cerrar
              </Button>
              <Button
                variant="brand"
                disabled={pendiente || !textoAccion.trim()}
                onClick={() => void confirmarAccion()}
              >
                {pendiente && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
