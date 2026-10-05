"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Trash2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  useAdminAjustes,
  useCrearAjuste,
  useActualizarAjuste,
  useEliminarAjuste,
  type AjusteResponse,
} from "@/hooks/use-portal"

const schema = z.object({
  clave: z.string().min(1, "Clave requerida"),
  valor: z.string().min(1, "Valor requerido"),
})

type FormData = z.infer<typeof schema>

export default function AjustesTab() {
  const { data: ajustes = [], isLoading } = useAdminAjustes()
  const crear = useCrearAjuste()
  const actualizar = useActualizarAjuste()
  const eliminar = useEliminarAjuste()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AjusteResponse | null>(null)
  const [eliminando, setEliminando] = useState<AjusteResponse | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { clave: "", valor: "" },
  })

  function abrirCrear() {
    setEditando(null)
    form.reset({ clave: "", valor: "" })
    setDialogOpen(true)
  }

  function abrirEditar(aj: AjusteResponse) {
    setEditando(aj)
    form.reset({ clave: aj.clave, valor: aj.valor })
    setDialogOpen(true)
  }

  function onSubmit(data: FormData) {
    if (editando) {
      actualizar.mutate(
        { id: editando.idAjuste, data },
        {
          onSuccess: () => { toast.success("Ajuste actualizado"); setDialogOpen(false) },
          onError: () => toast.error("Error al actualizar"),
        }
      )
    } else {
      crear.mutate(data, {
        onSuccess: () => { toast.success("Ajuste creado"); setDialogOpen(false) },
        onError: () => toast.error("Error al crear"),
      })
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.idAjuste, {
      onSuccess: () => { toast.success("Ajuste eliminado"); setEliminando(null) },
      onError: () => toast.error("Error al eliminar"),
    })
  }

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{ajustes.length} ajuste(s)</p>
        <Button onClick={abrirCrear} size="sm"><Plus className="mr-2 h-4 w-4" /> Nuevo ajuste</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clave</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ajustes.map((aj) => (
              <TableRow key={aj.idAjuste}>
                <TableCell className="font-medium font-mono text-sm">{aj.clave}</TableCell>
                <TableCell className="text-sm">{aj.valor}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(aj)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setEliminando(aj)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar ajuste" : "Nuevo ajuste"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Clave *</label>
              <Input {...form.register("clave")} placeholder="nombre_clave" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor *</label>
              <Input {...form.register("valor")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
                {editando ? "Guardar cambios" : "Crear ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eliminando} onOpenChange={() => setEliminando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar ajuste</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar ajuste &quot;{eliminando?.clave}&quot;? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminar.isPending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
