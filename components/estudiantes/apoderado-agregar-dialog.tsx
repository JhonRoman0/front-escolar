"use client"

import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { aApoderadoRequest } from "@/components/matricula/nueva-matricula-dialog"
import { FormularioApoderado } from "@/components/matricula/paso-apoderado"
import { useAgregarApoderado } from "@/hooks/use-estudiantes"
import type { AlumnoResponse } from "@/lib/api/estudiantes"
import { apoderadoPasoDefault, apoderadosPasoSchema, type ApoderadosPasoValues } from "@/lib/schemas/matricula"

/** Segundo apoderado de un alumno ya matriculado: misma búsqueda y reglas que el paso 2 de matrícula. */
export function ApoderadoAgregarDialog({
  alumno,
  onOpenChange,
}: {
  alumno: AlumnoResponse | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!alumno} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Agregar apoderado</DialogTitle>
        </DialogHeader>
        {alumno && <Formulario alumno={alumno} onCerrar={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ alumno, onCerrar }: { alumno: AlumnoResponse; onCerrar: () => void }) {
  const agregar = useAgregarApoderado()
  const form = useForm<ApoderadosPasoValues>({
    resolver: zodResolver(apoderadosPasoSchema),
    defaultValues: { apoderados: [apoderadoPasoDefault] },
  })

  const handleGuardar = form.handleSubmit(async ({ apoderados: [apoderado] }) => {
    if (apoderado.documentoIdentidad === alumno.documentoIdentidad) {
      form.setError("apoderados.0.documentoIdentidad", { message: "No puede ser el DNI del alumno" })
      return
    }
    try {
      await agregar.mutateAsync({ idAlumno: alumno.idAlumno, data: aApoderadoRequest(apoderado) })
      toast.success(
        apoderado.estado === "NUEVO"
          ? `Apoderado agregado. Sus accesos se enviaron a ${apoderado.gmail.trim()}`
          : "Apoderado agregado"
      )
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el apoderado")
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Apoderado de {alumno.nombre} {alumno.apellidoPat} {alumno.apellidoMat}. Si el DNI ya es apoderado de otro alumno, solo se vincula.
      </p>
      <FormularioApoderado form={form} indice={0} idAlumno={alumno.idAlumno} />
      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" onClick={handleGuardar} disabled={agregar.isPending}>
          {agregar.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Agregar apoderado
        </Button>
      </DialogFooter>
    </div>
  )
}
