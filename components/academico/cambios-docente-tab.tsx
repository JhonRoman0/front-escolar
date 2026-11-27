"use client"

import { FiltrosCambiosDocente } from "./filtros-cambios-docente"
import { paginarFilas, TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { coincideBusqueda, tokensBusqueda } from "@/lib/busqueda"

import { useMemo, useState, type ComponentProps } from "react"
import { Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import CambioDocenteDetalleDialog from "@/components/academico/cambio-docente-detalle-dialog"
import SuspensionDetalleDialog from "@/components/academico/suspension-detalle-dialog"
import {
  ETIQUETA_ESTADO_CAMBIO,
  ETIQUETA_ESTADO_SUSPENSION,
  ETIQUETA_TIPO_CAMBIO,
  VARIANTE_ESTADO_CAMBIO,
  VARIANTE_ESTADO_SUSPENSION,
  VARIANTE_TIPO_CAMBIO,
  estadoSuspension,
} from "@/components/academico/cambios-docente-constantes"
import { useCambiosDocente, useSuspensiones } from "@/hooks/use-academico"
import { usePuedeLeer } from "@/hooks/use-permisos"
import type {
  CambioDocenteResponse,
  SuspensionResponse,
} from "@/lib/api/academico"
import { formatearFecha } from "@/lib/fechas"

type Variante = NonNullable<ComponentProps<typeof Badge>["variant"]>

type Origen =
  | { tipo: "cambio"; cambio: CambioDocenteResponse }
  | { tipo: "suspension"; suspension: SuspensionResponse }

type FilaHistorial = {
  id: string
  tipo: string
  estado: string
  variante: Variante
  docenteAnterior: string
  docenteNuevo: string
  motivo: string
  inicio: string
  fin: string | null
  origen: Origen
}

export default function CambiosDocenteTab() {
  const [detalleCambio, setDetalleCambio] = useState<CambioDocenteResponse | null>(null)
  const [detalleSuspension, setDetalleSuspension] = useState<SuspensionResponse | null>(null)

  const puedeCambios = usePuedeLeer("CAMBIOS_DOCENTE")
  const puedeSuspensiones = usePuedeLeer("SUSPENSIONES_DOCENTE")
  const {
    data: cambios = [],
    isLoading: cargandoCambios,
    isError: errorCambios,
    refetch: recargarCambios,
  } = useCambiosDocente(puedeCambios)
  const {
    data: suspensiones = [],
    isLoading: cargandoSuspensiones,
    isError: errorSuspensiones,
    refetch: recargarSuspensiones,
  } = useSuspensiones(puedeSuspensiones)

  const filas = useMemo(() => {
    const historial: FilaHistorial[] = []
    if (puedeCambios) historial.push(...cambios.map(filaCambio))
    if (puedeSuspensiones) historial.push(...suspensiones.map(filaSuspension))
    return historial.sort((a, b) =>
      b.inicio.localeCompare(a.inicio) || a.motivo.localeCompare(b.motivo)
    )
  }, [cambios, suspensiones, puedeCambios, puedeSuspensiones])

  const [pagina, setPagina] = useState(0)
  const [busqueda, buscar] = useState("")
  const [anio, setAnio] = useState("")
  const [tipo, setTipo] = useState("")
  const [estado, setEstado] = useState("")
  const tokens = tokensBusqueda(busqueda)
  const anioDe = (fila: FilaHistorial) => fila.origen.tipo === "cambio"
    ? fila.origen.cambio.anio : fila.origen.suspension.anio
  const opciones = (valores: (string | null | undefined)[]) =>
    [...new Set(valores.filter((valor): valor is string => Boolean(valor)))]
      .sort().map((value) => ({ value, label: value }))
  const visibles = filas.filter(fila => (!anio || anioDe(fila) === anio)
    && (!tipo || fila.tipo === tipo) && (!estado || fila.estado === estado)
    && coincideBusqueda([fila.docenteAnterior, fila.docenteNuevo], tokens))
  const paginacion = paginarFilas(visibles, pagina)

  const isLoading =
    (puedeCambios && cargandoCambios) || (puedeSuspensiones && cargandoSuspensiones)
  const isError =
    (puedeCambios && errorCambios) || (puedeSuspensiones && errorSuspensiones)

  async function recargar() {
    if (puedeCambios) await recargarCambios()
    if (puedeSuspensiones) await recargarSuspensiones()
  }

  function verDetalle(fila: FilaHistorial) {
    if (fila.origen.tipo === "cambio") setDetalleCambio(fila.origen.cambio)
    else setDetalleSuspension(fila.origen.suspension)
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderSeccion
          titulo="Historial de cambios de docente"
          descripcion="Registro histórico de sustituciones, cambios definitivos, devoluciones y suspensiones laborales."
        />

        <FiltrosCambiosDocente busqueda={busqueda} onBuscar={buscar} placeholder="Buscar por nombre"
          filtros={[
            { label: "Año escolar", value: anio, onValueChange: setAnio, options: opciones(filas.map(anioDe)).reverse() },
            { label: "Tipo", value: tipo, onValueChange: setTipo, options: opciones(filas.map(fila => fila.tipo)) },
            { label: "Estado", value: estado, onValueChange: setEstado, options: opciones(filas.map(fila => fila.estado)) },
          ]}
          reiniciarPagina={() => setPagina(0)}
          limpiar={() => { buscar(""); setAnio(""); setTipo(""); setEstado("") }}
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Docente anterior</TableHead>
                <TableHead>Docente nuevo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={7} />
              ) : isError ? (
                <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos columnas={7} mensaje="Aún no hay registros en el historial." />
              ) : (
                paginacion.content.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell>
                      <Badge variant={VARIANTE_TIPO_CAMBIO}>{fila.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fila.variante}>{fila.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fila.docenteAnterior}</TableCell>
                    <TableCell className="text-sm">{fila.docenteNuevo}</TableCell>
                    <TableCell className="text-xs">{fila.motivo}</TableCell>
                    <TableCell className="text-xs">
                      <div>{formatearFecha(fila.inicio)}</div>
                      {fila.fin && (
                        <div className="text-muted-foreground">
                          hasta {formatearFecha(fila.fin)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          title="Ver detalle"
                          aria-label={`Ver detalle del registro de ${fila.docenteAnterior}`}
                          onClick={() => verDetalle(fila)}
                        >
                          <Eye />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablaPaginacion data={isLoading || isError ? null : paginacion} onPage={setPagina} />

        {isError && (
          <BotonReintentar refetch={() => void recargar()} />
        )}

        <CambioDocenteDetalleDialog
          open={!!detalleCambio}
          onOpenChange={(abierto) => !abierto && setDetalleCambio(null)}
          cambio={detalleCambio}
        />
        <SuspensionDetalleDialog
          open={!!detalleSuspension}
          onOpenChange={(abierto) => !abierto && setDetalleSuspension(null)}
          suspension={detalleSuspension}
        />
      </CardContent>
    </Card>
  )
}

function filaCambio(cambio: CambioDocenteResponse): FilaHistorial {
  return {
    id: `cambio-${cambio.idCambio}`,
    tipo: ETIQUETA_TIPO_CAMBIO[cambio.tipo],
    estado: ETIQUETA_ESTADO_CAMBIO[cambio.estado],
    variante: VARIANTE_ESTADO_CAMBIO[cambio.estado],
    docenteAnterior: cambio.docenteAnterior,
    docenteNuevo: cambio.docenteNuevo ?? "Sin cobertura",
    motivo: cambio.motivoDetalle
      ? `${cambio.motivo} · ${cambio.motivoDetalle}`
      : cambio.motivo,
    inicio: cambio.fechaInicio,
    fin: cambio.fechaFin,
    origen: { tipo: "cambio", cambio },
  }
}

function filaSuspension(suspension: SuspensionResponse): FilaHistorial {
  const estado = estadoSuspension(suspension)
  return {
    id: `suspension-${suspension.idSuspension}`,
    tipo: "Suspensión",
    estado: ETIQUETA_ESTADO_SUSPENSION[estado],
    variante: VARIANTE_ESTADO_SUSPENSION[estado],
    docenteAnterior: suspension.docente,
    docenteNuevo: suspension.sustituto ?? "Sin sustituto",
    motivo: suspension.motivoDetalle
      ? `${suspension.motivo} · ${suspension.motivoDetalle}`
      : suspension.motivo,
    inicio: suspension.fechaInicio,
    fin: suspension.fechaFin,
    origen: { tipo: "suspension", suspension },
  }
}
