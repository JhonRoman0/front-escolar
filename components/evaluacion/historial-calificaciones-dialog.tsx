"use client"
import type { PeriodoEvaluacion } from "@/lib/api/academico"
import { Badge } from "@/components/ui/badge"
import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { useState } from "react"
import { History } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePuede } from "@/hooks/use-permisos"
import { useHistorialCalificaciones, useCandidatas, useReconocerCalificacion, useAnularReconocimiento } from "@/hooks/use-evaluaciones"
import { MOTIVO_ANULACION_MAXIMO, RECONOCIMIENTO_ACTIVO, type NotaHistorica } from "@/lib/api/evaluaciones"
import { formatearFecha } from "@/lib/fechas"

export function HistorialCalificacionesDialog({ idMatricula, idAsignacion, nombre, periodos, disabled = false }: { idMatricula: number; idAsignacion: number; nombre: string; periodos: PeriodoEvaluacion[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [periodo, setPeriodo] = useState("todos")
  const historial = useHistorialCalificaciones(idMatricula, idAsignacion, open)
  const periodosConNotas = periodos.filter(p => historial.data?.some(n => n.periodo === p.numero))
  return <>
    <Button type="button" variant="ghost" size="icon" disabled={disabled} title={disabled ? "Guarda las notas pendientes antes de abrir el historial" : "Calificaciones anteriores"} aria-label={`Calificaciones anteriores de ${nombre}`} onClick={() => setOpen(true)}><History className="size-3.5" /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent forceOverlay className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Calificaciones anteriores · {nombre}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Las notas históricas solo participan en los promedios actuales después de confirmar un reconocimiento.</p>
        {historial.isLoading ? <p>Cargando historial…</p> : historial.isError ? <p role="alert">{historial.error.message}</p> : <>
          <Select items={[{ value: "todos", label: "Todos los periodos" }, ...periodosConNotas.map(p => ({ value: String(p.numero), label: p.nombre }))]} value={periodo} onValueChange={(v) => setPeriodo(v ?? "todos")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="todos">Todos los periodos</SelectItem>
              {periodosConNotas.map(p => <SelectItem key={p.numero} value={String(p.numero)}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          {!historial.data?.length && <p className="text-sm text-muted-foreground">No hay calificaciones anteriores en este curso y año.</p>}
          {historial.data?.filter(n => periodo === "todos" || n.periodo === Number(periodo)).map(n => <NotaAnterior key={n.idNotaOrigen} nota={n} periodoNombre={periodos.find(p => p.numero === n.periodo)?.nombre ?? String(n.periodo)} idAsignacion={idAsignacion} />)}
        </>}
      </DialogContent>
    </Dialog>
  </>
}
function NotaAnterior({ nota, idAsignacion, periodoNombre }: { nota: NotaHistorica; idAsignacion: number; periodoNombre: string }) {
  const [anulando, setAnulando] = useState<number | null>(null)
  const reconocidaActual = nota.reconocimientos.some(r => r.estado === RECONOCIMIENTO_ACTIVO && r.enSeccionActual)
  const puede = usePuede("EVALUACIONES", "CREAR")
  const [seleccionando, setSeleccionando] = useState(false)
  const [destino, setDestino] = useState("")
  const [motivos, setMotivos] = useState<Record<number, string>>({})
  const candidatas = useCandidatas(seleccionando ? nota.idNotaOrigen : null, idAsignacion)
  const reconocer = useReconocerCalificacion()
  const anular = useAnularReconocimiento()
  const elegida = candidatas.data?.find(c => c.idEvaluacion === Number(destino))
  async function confirmar() {
    if (!elegida || elegida.bloqueo) return
    try {
      await reconocer.mutateAsync({ idNotaOrigen: nota.idNotaOrigen, idEvaluacionDestino: elegida.idEvaluacion, calificacionOrigen: nota.calificacion })
      setSeleccionando(false); setDestino(""); toast.success("Calificación reconocida")
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo reconocer") }
  }
  return <TarjetaSeccion className="space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-medium">{nota.evaluacion}</p>
      <Badge variant="secondary">{nota.calificacion}</Badge>
    </div>
    <p className="text-xs text-muted-foreground">{nota.seccion} · {nota.curso}{nota.area ? ` (${nota.area})` : ""} · {periodoNombre} · {formatearFecha(nota.fecha)}</p>
    <ul className="space-y-1 text-xs">
      {nota.competencias.map(c => <li key={c.idCompetencia} className="flex gap-2"><span className="shrink-0 font-medium">{c.codigo}.</span><span>{c.nombre}</span></li>)}
    </ul>
    {nota.bloqueo && <p className="text-xs text-muted-foreground">{nota.bloqueo}</p>}
    {nota.reconocimientos.map(r => <div key={r.idReconocimiento} className="space-y-2 border-t pt-2 text-xs">
      <p><Badge variant={r.estado === RECONOCIMIENTO_ACTIVO ? "info" : "outline"}>{r.estado === RECONOCIMIENTO_ACTIVO ? "Reconocida" : "Anulada"}</Badge> {r.calificacion} → {r.evaluacionDestino} · {r.seccionDestino}</p>
      <p className="text-muted-foreground">{r.usuario} · {formatearFecha(r.fecha)}{r.motivoAnulacion ? ` · ${r.motivoAnulacion} · ${r.usuarioAnulacion}` : ""}</p>
      {r.puedeAnular && anulando !== r.idReconocimiento && <Button type="button" variant="outline" size="sm" disabled={anular.isPending} onClick={() => setAnulando(r.idReconocimiento)}>Anular</Button>}
      {r.puedeAnular && anulando === r.idReconocimiento && <div className="flex flex-col gap-2 sm:flex-row">
        <Input aria-label="Motivo de anulación" placeholder="Motivo de anulación" maxLength={MOTIVO_ANULACION_MAXIMO} value={motivos[r.idReconocimiento] ?? ""} onChange={e => setMotivos({ ...motivos, [r.idReconocimiento]: e.target.value })} />
        <Button type="button" variant="outline" disabled={anular.isPending || !motivos[r.idReconocimiento]?.trim()} onClick={async () => {
          try { await anular.mutateAsync({ id: r.idReconocimiento, motivo: motivos[r.idReconocimiento] }); setAnulando(null); setMotivos({}); toast.success("Reconocimiento anulado") }
          catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo anular") }
        }}>Confirmar anulación</Button>
        <Button type="button" variant="ghost" disabled={anular.isPending} onClick={() => { setAnulando(null); setMotivos({}) }}>Cancelar</Button>
      </div>}
    </div>)}
    {puede && !nota.bloqueo && !reconocidaActual && !seleccionando && <Button type="button" variant="outline" size="sm" onClick={() => setSeleccionando(true)}>Buscar evaluación compatible</Button>}
    {seleccionando && !reconocidaActual && <div className="space-y-2">
      {candidatas.isLoading ? <p>Cargando…</p> : candidatas.isError ? <p role="alert">{candidatas.error.message}</p> : !candidatas.data?.length ? <p>No hay evaluaciones compatibles; la nota permanece en el historial.</p> : <>
        <Select items={candidatas.data.map(c => ({ value: String(c.idEvaluacion), label: c.nombre }))} value={destino} onValueChange={v => setDestino(v ?? "")}><SelectTrigger className="h-auto min-h-8 w-full whitespace-normal [&_[data-slot=select-value]]:line-clamp-none"><SelectValue placeholder="Elige evaluación de destino" /></SelectTrigger><SelectContent>
          {candidatas.data.map(c => <SelectItem key={c.idEvaluacion} value={String(c.idEvaluacion)} disabled={!!c.bloqueo} className="py-1.5 [&>*:first-child]:shrink [&>*:first-child]:whitespace-normal">{c.nombre}{c.bloqueo ? ` · ${c.bloqueo}` : ""}</SelectItem>)}
        </SelectContent></Select>
        {elegida && <p>Reconocer <strong>{nota.calificacion}</strong> de {nota.seccion} / {nota.evaluacion} en <strong>{elegida.nombre}</strong> de la sección actual.</p>}
        <Button type="button" variant="brand" disabled={!elegida || !!elegida.bloqueo || reconocer.isPending} onClick={confirmar}>Confirmar reconocimiento</Button>
      </>}
    </div>}
  </TarjetaSeccion>
}
