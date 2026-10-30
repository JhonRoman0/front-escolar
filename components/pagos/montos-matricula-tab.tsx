"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Info, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { useAniosEscolares } from "@/hooks/use-academico"
import { useGuardarMontos, useMontosMatricula } from "@/hooks/use-pagos"
import { usePuede } from "@/hooks/use-permisos"
import { ACCESO, ESTADO_ANIO, estadoAnioTexto } from "@/lib/api/academico"
import type { MontoMatriculaResponse } from "@/lib/api/pagos"

export function MontosMatriculaTab() {
  const { data: anios = [] } = useAniosEscolares()
  const puedeActualizar = usePuede("PAGOS_MATRICULA", "ACTUALIZAR")
  const aniosActivos = useMemo(
    () => anios.filter((a) => a.accesoId !== ACCESO.ELIMINADO).sort((a, b) => b.anio.localeCompare(a.anio)),
    [anios]
  )
  // Por defecto el año por comenzar, que es el que se está matriculando.
  const porDefecto =
    aniosActivos.find((a) => a.estado === ESTADO_ANIO.POR_COMENZAR) ??
    aniosActivos.find((a) => a.estado === ESTADO_ANIO.VIGENTE) ??
    aniosActivos[0]
  const [idAnioElegido, setIdAnioElegido] = useState<string>("")
  const idAnio = idAnioElegido ? Number(idAnioElegido) : porDefecto?.idAnio ?? null
  const anio = aniosActivos.find((a) => a.idAnio === idAnio)

  const { data, isLoading, isError, refetch } = useMontosMatricula(idAnio)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Montos de matrícula"
          descripcion="Precio de la matrícula de cada nivel en el año escolar. Sin monto no se puede matricular en ese nivel."
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Año escolar"
            value={idAnio ? String(idAnio) : ""}
            onValueChange={setIdAnioElegido}
            includeAll={false}
            className="w-[280px] max-w-full shrink-0"
            options={aniosActivos.map((a) => ({
              value: String(a.idAnio),
              label: `${a.anio} · ${estadoAnioTexto(a.estado)}`,
            }))}
          />
        </div>
        {isLoading || !data ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableBody>
                {isError ? (
                  <MensajeSinDatos columnas={2} mensaje="No se pudo cargar. Recarga la pantalla." />
                ) : idAnio ? (
                  <FilasCargando columnas={2} filas={3} />
                ) : (
                  <MensajeSinDatos columnas={2} mensaje="Aún no hay años escolares." />
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <FormularioMontos
            key={`${idAnio}-${JSON.stringify(data.map((m) => [m.idNivel, m.monto, m.sugerido]))}`}
            idAnio={idAnio as number}
            anioTexto={anio ? `${anio.anio} · ${estadoAnioTexto(anio.estado)}` : ""}
            anioCerrado={anio?.estado === ESTADO_ANIO.CERRADO}
            montos={data}
            puedeActualizar={puedeActualizar}
          />
        )}
        {isError && <BotonReintentar refetch={refetch} />}
      </CardContent>
    </Card>
  )
}

function FormularioMontos({
  idAnio,
  anioTexto,
  anioCerrado,
  montos,
  puedeActualizar,
}: {
  idAnio: number
  anioTexto: string
  anioCerrado: boolean
  montos: MontoMatriculaResponse[]
  puedeActualizar: boolean
}) {
  const guardar = useGuardarMontos()
  const [guardados, setGuardados] = useState(montos)
  const copiados = guardados.every((m) => m.monto == null) && guardados.some((m) => m.sugerido != null)
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(montos.map((m) => [m.idNivel, String(m.monto ?? m.sugerido ?? "")]))
  )
  const editable = puedeActualizar && !anioCerrado && !!anioTexto
  const hayCambios = montos.some((m) => {
    const texto = valores[m.idNivel]?.trim() ?? ""
    const actual = texto === "" ? null : Number(texto)
    return actual !== (guardados.find((g) => g.idNivel === m.idNivel)?.monto ?? null)
  })
  const [pendiente, setPendiente] = useState<{
    idAnio: number
    anio: string
    montos: { idNivel: number; nivel: string; monto: number }[]
  } | null>(null)
  const envio = useRef<Promise<void> | null>(null)

  function handleGuardar() {
    if (!editable || !hayCambios || !montos.length || pendiente || guardar.isPending || envio.current) return
    const invalido = montos.find((m) => {
      const texto = valores[m.idNivel]?.trim() ?? ""
      const monto = Number(texto)
      return !texto || !Number.isFinite(monto) || monto < 0.01
    })
    if (invalido) {
      toast.error(`Escribe un monto válido de al menos S/ 0.01 para ${invalido.nivel}`)
      return
    }
    setPendiente({
      idAnio,
      anio: anioTexto,
      montos: montos.map((m) => ({ idNivel: m.idNivel, nivel: m.nivel, monto: Number(valores[m.idNivel]) })),
    })
  }

  function confirmarGuardado(): Promise<void> {
    if (envio.current) return envio.current
    if (!pendiente || !editable) {
      const error = new Error("Ya no se pueden modificar los montos de este año escolar")
      toast.error(error.message)
      return Promise.reject(error)
    }
    const datos = pendiente
    const promesa = (async () => {
      try {
        const resultado = await guardar.mutateAsync({
          idAnio: datos.idAnio,
          montos: datos.montos.map(({ idNivel, monto }) => ({ idNivel, monto })),
        })
        setGuardados(resultado)
        setValores(Object.fromEntries(resultado.map((m) => [m.idNivel, String(m.monto ?? m.sugerido ?? "")])))
        toast.success("Montos de matrícula guardados")
        setPendiente(null)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al guardar")
        throw error
      } finally {
        envio.current = null
      }
    })()
    envio.current = promesa
    return promesa
  }

  return (
    <div className="flex flex-col gap-4">
      {copiados && (
        <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p>Este año aún no tiene montos: se copiaron los del año anterior. Revísalos y guarda para aplicarlos.</p>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader appearance="soft-gray">
            <TableRow>
              <TableHead>Nivel</TableHead>
              <TableHead className="w-48 text-center">Monto (S/)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {montos.map((m) => (
              <TableRow key={m.idNivel}>
                <TableCell className="font-medium">{m.nivel}</TableCell>
                <TableCell className="text-center">
                  <Input
                    className="text-center enabled:text-foreground enabled:font-medium enabled:border-foreground/30"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!editable || !!pendiente || guardar.isPending}
                    value={valores[m.idNivel] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [m.idNivel]: e.target.value }))}
                    aria-label={`Monto de ${m.nivel}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {anioCerrado && (
        <p className="text-xs text-muted-foreground">El año está cerrado: sus montos ya no se modifican.</p>
      )}
      {editable && (
        <div className="flex justify-end">
          <Button variant="brand" onClick={handleGuardar} disabled={!hayCambios || !montos.length || !!pendiente || guardar.isPending}>
            {guardar.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Guardar montos
          </Button>
        </div>
      )}
      <ConfirmarEliminar
        open={!!pendiente}
        onOpenChange={(open) => {
          if (!open && !envio.current) setPendiente(null)
        }}
        disabled={guardar.isPending}
        titulo="Confirmar montos de matrícula"
        descripcion={pendiente ? `Año escolar ${pendiente.anio}. Se guardarán los siguientes montos:` : ""}
        contenido={pendiente && (
          <dl className="space-y-2">
            {pendiente.montos.map((m) => (
              <div key={m.idNivel} className="flex items-start justify-between gap-4">
                <dt className="min-w-0 break-words text-sm text-muted-foreground">{m.nivel}</dt>
                <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground tabular-nums">
                  {m.monto.toLocaleString("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 20 })}
                </dd>
              </div>
            ))}
          </dl>
        )}
        textoBoton="Confirmar y guardar"
        variantConfirmar="brand"
        icono={null}
        onConfirm={confirmarGuardado}
      />
    </div>
  )
}
