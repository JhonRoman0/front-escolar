"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy, KeyRound, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useDocentes } from "@/hooks/use-academico"
import {
  useGenerarAutorizacion,
  useValidarAutorizacion,
} from "@/hooks/use-evaluacion"
import { usePuede } from "@/hooks/use-permisos"
import { autorizacionRequestSchema } from "@/lib/schemas/evaluacion"

export function formatearExpiracion(iso: string): string {
  const fecha = new Date(iso)
  return fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function AutorizacionDialog({
  open,
  onOpenChange,
  onAplicar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAplicar: (codigo: string) => void
}) {
  const { usuario } = useAuth()
  const generar = useGenerarAutorizacion()
  const validar = useValidarAutorizacion()
  const puedeAutorizar = usePuede("NOTAS", "AUTORIZAR")
  const { data: docentes = [] } = useDocentes()

  const [idDestinatario, setIdDestinatario] = useState(
    usuario?.idUsuario ? String(usuario.idUsuario) : ""
  )
  const [codigo, setCodigo] = useState("")
  const [codigoManual, setCodigoManual] = useState("")
  const [copiado, setCopiado] = useState(false)

  const destinatarioSel = docentes.find((d) => String(d.idUsuario) === idDestinatario)
  const esYo = idDestinatario === String(usuario?.idUsuario)
  const nombreDestinatario = esYo
    ? usuario
      ? `${usuario.nombre} ${usuario.apellidoPat}`.trim()
      : "Yo"
    : destinatarioSel
      ? `${destinatarioSel.nombre} ${destinatarioSel.apellidoPat}`.trim()
      : ""

  async function handleGenerar() {
    const id = Number(idDestinatario)
    const parsed = autorizacionRequestSchema.safeParse({ idUsuarioDestinatario: id })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Selecciona un destinatario válido.")
      return
    }
    if (!nombreDestinatario) {
      toast.error("Elige a quién va asignado el código.")
      return
    }
    try {
      const resp = await generar.mutateAsync({ idUsuarioDestinatario: id })
      setCodigo(resp.codigo)
      setCopiado(false)
      toast.success(
        `Código para ${nombreDestinatario}. Vence a las ${formatearExpiracion(resp.fechaExpiracion)}.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al generar el código"
      )
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      toast.success("Código copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  async function aplicar(texto: string) {
    if (texto.length !== 8) return
    try {
      await validar.mutateAsync(texto)
      onAplicar(texto)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "El código de autorización no es válido"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código de autorización</DialogTitle>
          <DialogDescription>
            Las notas que ya existen solo pueden modificarse con un código de
            autorización del director (válido 10 minutos, un solo uso). El
            código se valida antes de aplicarse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {puedeAutorizar && (
            <div className="space-y-3 rounded-lg border p-3">
              {codigo ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={codigo}
                      className="font-mono text-center text-lg tracking-widest"
                    />
                    <Button type="button" variant="outline" onClick={copiar} aria-label="Copiar código">
                      {copiado ? <Check /> : <Copy />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código para {nombreDestinatario}. Caduca en 10 minutos y
                    solo sirve una vez.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    El código se asigna a un docente (quien modificará la nota).
                  </p>
                  <Select
                    value={idDestinatario}
                    onValueChange={(v) => {
                      if (v) {
                        setIdDestinatario(v)
                        setCodigo("")
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {nombreDestinatario || "Selecciona el destinatario"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {usuario?.idUsuario && (
                        <SelectItem value={String(usuario.idUsuario)}>
                          Yo ({usuario.nombre} {usuario.apellidoPat})
                        </SelectItem>
                      )}
                      {docentes.map((d) => (
                        <SelectItem key={d.idUsuario} value={String(d.idUsuario)}>
                          {d.nombre} {d.apellidoPat} {d.apellidoMat} · {d.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleGenerar}
                    disabled={generar.isPending || !idDestinatario}
                    className="w-full"
                  >
                    {generar.isPending && <Loader2 className="animate-spin" />}
                    <KeyRound />
                    Generar código
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              {puedeAutorizar
                ? "O pega un código entregado por el director:"
                : "Pega aquí el código que te entregó el director para modificar la nota:"}
            </p>
            <Input
              value={codigoManual}
              onChange={(e) =>
                setCodigoManual(e.target.value.toUpperCase())
              }
              placeholder="Código de 8 caracteres"
              className="font-mono text-center text-lg tracking-widest uppercase"
              maxLength={8}
            />
            <Button
              type="button"
              onClick={() => aplicar(codigoManual.trim().toUpperCase())}
              disabled={
                codigoManual.trim().length !== 8 || validar.isPending
              }
              className="w-full"
            >
              {validar.isPending && <Loader2 className="animate-spin" />}
              Usar este código
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <DialogTrigger render={<Button variant="outline" />}>
            Cerrar
          </DialogTrigger>
          {codigo && (
            <Button
              type="button"
              onClick={() => aplicar(codigo)}
              disabled={validar.isPending}
            >
              {validar.isPending && <Loader2 className="animate-spin" />}
              Usar el código generado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}