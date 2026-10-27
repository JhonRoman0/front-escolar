"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

import { BloqueFoto } from "@/components/shared/bloque-foto"
import { CampoChip } from "@/components/shared/campo-chip"
import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { useCrudAlumnos, useSubirFotoAlumno } from "@/hooks/use-estudiantes"
import type { AlumnoResponse } from "@/lib/api/estudiantes"
import { formatearFecha } from "@/lib/fechas"

/**
 * Del alumno solo se corrigen la foto y la discapacidad: el resto se registró
 * al matricularlo. Sus apoderados se editan desde la fila del alumno.
 */
export function AlumnoEditarDialog({
  alumno,
  onOpenChange,
}: {
  alumno: AlumnoResponse | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!alumno} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Editar alumno</DialogTitle>
        </DialogHeader>
        {alumno && <Formulario alumno={alumno} onCerrar={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ alumno, onCerrar }: { alumno: AlumnoResponse; onCerrar: () => void }) {
  const crud = useCrudAlumnos()
  const subirFoto = useSubirFotoAlumno()
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(alumno.urlFoto)
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState(alumno.tieneDiscapacidad)
  const [discapacidad, setDiscapacidad] = useState(alumno.discapacidad ?? "")
  const [intentado, setIntentado] = useState(false)
  const enviando = crud.actualizar.isPending || subirFoto.isPending
  const faltaDescripcion = tieneDiscapacidad && !discapacidad.trim()

  async function handleGuardar() {
    setIntentado(true)
    if (faltaDescripcion) return
    try {
      if (foto) await subirFoto.mutateAsync({ id: alumno.idAlumno, file: foto })
      await crud.actualizar.mutateAsync({
        id: alumno.idAlumno,
        data: { tieneDiscapacidad, discapacidad: tieneDiscapacidad ? discapacidad.trim() : null },
      })
      toast.success("Alumno actualizado")
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el alumno")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <BloqueFoto
          preview={preview}
          alt="Foto del alumno"
          iniciales={`${alumno.nombre[0] ?? ""}${alumno.apellidoPat[0] ?? ""}`.toUpperCase()}
          fallback="A"
          hayFotoNueva={!!foto}
          mostrarQuitar={!!foto}
          onChangeArchivo={(file) => {
            setFoto(file)
            setPreview(URL.createObjectURL(file))
          }}
          onQuitar={() => {
            setFoto(null)
            setPreview(alumno.urlFoto)
          }}
        />
        <TarjetaSeccion className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-medium">{alumno.nombre} {alumno.apellidoPat} {alumno.apellidoMat}</p>
          <p className="text-muted-foreground">DNI {alumno.documentoIdentidad ?? "—"} · {alumno.sexo === "FEMENINO" ? "Femenino" : alumno.sexo === "MASCULINO" ? "Masculino" : "—"}</p>
          <p className="text-muted-foreground">Nació el {alumno.fechaNacimiento ? formatearFecha(alumno.fechaNacimiento) : "—"}</p>
          <p className="text-muted-foreground">{alumno.direccion ?? "—"}</p>
          <p className="pt-1 text-xs text-muted-foreground">Estos datos se registraron al matricularlo y no se modifican.</p>
        </TarjetaSeccion>
      </div>

      <CampoChip checked={tieneDiscapacidad} onCheckedChange={setTieneDiscapacidad}>
        Tiene alguna discapacidad
      </CampoChip>
      {tieneDiscapacidad && (
        <Field>
          <FieldLabel>Discapacidad *</FieldLabel>
          <FieldContent>
            <Textarea rows={2} maxLength={255} placeholder="Describe la discapacidad del alumno" value={discapacidad} onChange={(e) => setDiscapacidad(e.target.value)} />
            <FieldError errors={intentado && faltaDescripcion ? [{ message: "Describe la discapacidad" }] : []} />
          </FieldContent>
        </Field>
      )}

      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" onClick={handleGuardar} disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </div>
  )
}
