"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { useAdminContactos, useActualizarContactoEstado } from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

const ESTADO_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "danger" }> = {
  0: { label: "Pendiente", variant: "info" },
  1: { label: "Leído", variant: "secondary" },
  2: { label: "Contestado", variant: "success" },
}

export default function ContactosTab() {
  const { data: contactos = [], isLoading } = useAdminContactos()
  const actualizarEstado = useActualizarContactoEstado()

  function cambiarEstado(id: number, estado: number) {
    actualizarEstado.mutate(
      { id, estado },
      {
        onSuccess: () => toast.success("Estado actualizado"),
        onError: () => toast.error("Error al actualizar"),
      }
    )
  }

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {contactos.length} mensaje(s) de contacto
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay mensajes de contacto.
                </TableCell>
              </TableRow>
            ) : (
              contactos.map((msg) => {
                const estado = ESTADO_LABELS[msg.estado] ?? ESTADO_LABELS[0]
                return (
                  <TableRow key={msg.idMensaje}>
                    <TableCell className="font-medium">{msg.nombreRemitente}</TableCell>
                    <TableCell className="text-sm">{msg.correo}</TableCell>
                    <TableCell className="text-sm">{msg.asunto ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatearFecha(new Date(msg.fechaEnvio))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {msg.estado !== 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => cambiarEstado(msg.idMensaje, 1)}
                          >
                            Marcar leído
                          </Button>
                        )}
                        {msg.estado !== 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => cambiarEstado(msg.idMensaje, 2)}
                          >
                            Contestado
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
    </div>
  )
}
