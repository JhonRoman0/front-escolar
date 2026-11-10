"use client"
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

export function HistorialCalificacionesDialog({ idMatricula, idAsignacion, nombre, disabled = false }: { idMatricula: number; idAsignacion: number; nombre: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [periodo, setPeriodo] = useState("todos")
  const historial = useHistorialCalificaciones(idMatricula, idAsignacion, open)
  return <>
    <Button type="button" variant="ghost" size="icon" disabled={disabled} title={disabled ? "Guarda las notas pendientes antes de abrir el historial" : "Calificaciones anteriores"} aria-label={`Calificaciones anteriores de ${nombre}`} onClick={() => setOpen(true)}><History className="size-3.5" /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Calificaciones anteriores · {nombre}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Las notas históricas solo participan en los promedios actuales después de confirmar un reconocimiento.</p>
        {historial.isLoading ? <p>Cargando historial…</p> : historial.isError ? <p role="alert">{historial.error.message}</p> : <>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v ?? "todos")}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="todos">Todos los periodos</SelectItem>
              {[...new Set(historial.data?.map(n => n.periodo))].sort().map(p => <SelectItem key={p} value={String(p)}>Periodo {p}</SelectItem>)}
            </SelectContent>
          </Select>
          {!historial.data?.length && <p className="text-sm text-muted-foreground">No hay calificaciones anteriores en este curso y año.</p>}
          {historial.data?.filter(n => periodo === "todos" || n.periodo === Number(periodo)).map(n => <NotaAnterior key={n.idNotaOrigen} nota={n} idAsignacion={idAsignacion} />)}
        </>}
      </DialogContent>
    </Dialog>
  </>
}
function NotaAnterior({ nota, idAsignacion }: { nota: NotaHistorica; idAsignacion: number }) {
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
  return <article className="space-y-2 rounded-lg border p-3 text-sm">
    <p className="font-medium">{nota.evaluacion} · {nota.calificacion}</p>
    <p className="text-xs text-muted-foreground">{nota.seccion} · {nota.curso}{nota.area ? ` (${nota.area})` : ""} · Periodo {nota.periodo} · {formatearFecha(nota.fecha)}</p>
    <p className="text-xs">{nota.competencias.map(c => `${c.codigo}: ${c.nombre}`).join(" · ")}</p>
    {nota.bloqueo && <p className="text-xs text-muted-foreground">{nota.bloqueo}</p>}
    {nota.reconocimientos.map(r => <div key={r.idReconocimiento} className="space-y-2 border-t pt-2 text-xs">
      <p>{r.estado === RECONOCIMIENTO_ACTIVO ? "Reconocida" : "Anulada"}: {r.calificacion} → {r.evaluacionDestino} · {r.seccionDestino}</p>
      <p className="text-muted-foreground">{r.usuario} · {formatearFecha(r.fecha)}{r.motivoAnulacion ? ` · ${r.motivoAnulacion} · ${r.usuarioAnulacion}` : ""}</p>
      {r.puedeAnular && <div className="flex gap-2">
        <Input aria-label="Motivo de anulación" placeholder="Motivo de anulación" maxLength={MOTIVO_ANULACION_MAXIMO} value={motivos[r.idReconocimiento] ?? ""} onChange={e => setMotivos({ ...motivos, [r.idReconocimiento]: e.target.value })} />
        <Button type="button" variant="outline" disabled={anular.isPending || !motivos[r.idReconocimiento]?.trim()} onClick={async () => {
          try { await anular.mutateAsync({ id: r.idReconocimiento, motivo: motivos[r.idReconocimiento] }); toast.success("Reconocimiento anulado") }
          catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo anular") }
        }}>Anular</Button>
      </div>}
    </div>)}
    {puede && !nota.bloqueo && !seleccionando && <Button type="button" variant="outline" size="sm" onClick={() => setSeleccionando(true)}>Buscar evaluación compatible</Button>}
    {seleccionando && <div className="space-y-2">
      {candidatas.isLoading ? <p>Cargando…</p> : candidatas.isError ? <p role="alert">{candidatas.error.message}</p> : !candidatas.data?.length ? <p>No hay evaluaciones compatibles; la nota permanece en el historial.</p> : <>
        <Select value={destino} onValueChange={v => setDestino(v ?? "")}><SelectTrigger><SelectValue placeholder="Elige evaluación de destino" /></SelectTrigger><SelectContent>
          {candidatas.data.map(c => <SelectItem key={c.idEvaluacion} value={String(c.idEvaluacion)} disabled={!!c.bloqueo}>{c.nombre}{c.bloqueo ? ` · ${c.bloqueo}` : ""}</SelectItem>)}
        </SelectContent></Select>
        {elegida && <p>Reconocer <strong>{nota.calificacion}</strong> de {nota.seccion} / {nota.evaluacion} en <strong>{elegida.nombre}</strong> de la sección actual.</p>}
        <Button type="button" variant="brand" disabled={!elegida || !!elegida.bloqueo || reconocer.isPending} onClick={confirmar}>Confirmar reconocimiento</Button>
      </>}
    </div>}
  </article>
}
