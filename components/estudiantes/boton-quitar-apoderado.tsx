"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { useHijosDeApoderado, useQuitarApoderado } from "@/hooks/use-estudiantes"
import type { AlumnoResponse, ApoderadoResponse } from "@/lib/api/estudiantes"

export function BotonQuitarApoderado({
  alumno,
  apoderado,
}: {
  alumno: AlumnoResponse
  apoderado: ApoderadoResponse
}) {
  const quitar = useQuitarApoderado()
  const [abierto, setAbierto] = useState(false)
  const hijos = useHijosDeApoderado(apoderado.documentoIdentidad, alumno.idAlumno, abierto)
  const nombre = `${apoderado.nombre} ${apoderado.apellidoPat}`

  const consecuencia = !hijos
    ? ""
    : hijos.length > 1
      ? " Seguirá viendo a sus otros hijos."
      : " Como no tiene otros hijos en el colegio, se eliminará su cuenta de apoderado."

  async function handleConfirmar() {
    try {
      await quitar.mutateAsync({ id: apoderado.idApoderado, idAlumno: alumno.idAlumno })
      toast.success(`${nombre} ya no es apoderado de este alumno`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar el apoderado")
      throw error
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        className="size-7 rounded-[8px] border-[0.50px] border-[#A9A9AA]"
        aria-label={`Quitar a ${nombre}`}
        onClick={() => setAbierto(true)}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
      <ConfirmarEliminar
        open={abierto}
        onOpenChange={setAbierto}
        titulo="Quitar apoderado"
        descripcion={`${nombre} dejará de ser apoderado de ${alumno.nombre} ${alumno.apellidoPat}.${consecuencia}`}
        textoBoton="Quitar"
        onConfirm={handleConfirmar}
      />
    </>
  )
}
