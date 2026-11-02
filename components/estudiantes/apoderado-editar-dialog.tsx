"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, UserMinus } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { aApoderadoRequest } from "@/components/matricula/nueva-matricula-dialog"
import { Aviso, FormularioApoderado } from "@/components/matricula/paso-apoderado"
import { casillaTrasCambiarCorreo, CampoRestablecerContrasena } from "@/components/shared/campo-restablecer-contrasena"
import { useActualizarApoderado, useHijosDeApoderado, useReemplazarApoderado } from "@/hooks/use-estudiantes"
import type { AlumnoResponse, ApoderadoResponse } from "@/lib/api/estudiantes"
import { apoderadoPasoDefault, apoderadosPasoSchema, type ApoderadoPasoValues, type ApoderadosPasoValues } from "@/lib/schemas/matricula"

const SIN_ACCESOS = "Datos guardados, pero no se pudo enviar el correo"

/**
 * Mismo formulario que al agregar. Con su DNI se corrigen sus datos; con otro DNI
 * esa persona lo reemplaza como apoderado de este alumno.
 */
export function ApoderadoEditarDialog({
  alumno,
  apoderado,
  onOpenChange,
}: {
  alumno: AlumnoResponse | null
  apoderado: ApoderadoResponse | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!alumno && !!apoderado} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Editar apoderado</DialogTitle>
        </DialogHeader>
        {alumno && apoderado && (
          <Formulario alumno={alumno} apoderado={apoderado} onCerrar={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function valoresOriginales(apoderado: ApoderadoResponse): ApoderadoPasoValues {
  return {
    ...apoderadoPasoDefault,
    estado: "EDICION",
    documentoIdentidad: apoderado.documentoIdentidad ?? "",
    nombre: apoderado.nombre,
    apellidoPat: apoderado.apellidoPat,
    apellidoMat: apoderado.apellidoMat,
    fechaNaci: apoderado.fechaNaci ?? "",
    sexo: apoderado.sexo ?? "",
    direccion: apoderado.direccion ?? "",
    idParentesco: apoderado.idParentesco ?? 0,
    celular: apoderado.celular ?? "",
    gmail: apoderado.gmail ?? "",
  }
}

function Formulario({
  alumno,
  apoderado,
  onCerrar,
}: {
  alumno: AlumnoResponse
  apoderado: ApoderadoResponse
  onCerrar: () => void
}) {
  const actualizar = useActualizarApoderado()
  const reemplazar = useReemplazarApoderado()
  const [original] = useState(() => valoresOriginales(apoderado))
  const [restablecer, setRestablecer] = useState(false)
  const form = useForm<ApoderadosPasoValues>({
    resolver: zodResolver(apoderadosPasoSchema),
    defaultValues: { apoderados: [original] },
  })
  const estado = useWatch({ control: form.control, name: "apoderados.0.estado" })
  const esReemplazo = estado !== "EDICION"
  const enviando = actualizar.isPending || reemplazar.isPending

  // Sus hijos deciden qué pasa con su cuenta si sale; se avisa antes de guardar.
  const hijos = useHijosDeApoderado(apoderado.documentoIdentidad, alumno.idAlumno)
  const sinOtrosHijos = !!hijos && hijos.length <= 1

  function handleCambiarCorreo(anterior: string, nuevo: string) {
    const marcar = casillaTrasCambiarCorreo(anterior, nuevo, apoderado.gmail)
    if (marcar !== null) setRestablecer(marcar)
  }

  const handleGuardar = form.handleSubmit(async ({ apoderados: [valores] }) => {
    const dni = valores.documentoIdentidad
    const otroApoderado = alumno.apoderados.some(
      (a) => a.idApoderado !== apoderado.idApoderado && a.documentoIdentidad === dni
    )
    if (dni === alumno.documentoIdentidad || otroApoderado) {
      form.setError("apoderados.0.documentoIdentidad", {
        message: otroApoderado ? "Ese DNI ya es apoderado de este alumno" : "No puede ser el DNI del alumno",
      })
      return
    }
    try {
      if (valores.estado === "EDICION") {
        const actualizado = await actualizar.mutateAsync({
          id: apoderado.idApoderado,
          data: {
            documentoIdentidad: dni,
            nombre: valores.nombre.trim(),
            apellidoPat: valores.apellidoPat.trim(),
            apellidoMat: valores.apellidoMat.trim(),
            fechaNaci: valores.fechaNaci,
            sexo: valores.sexo,
            direccion: valores.direccion.trim(),
            celular: valores.celular,
            gmail: valores.gmail.trim(),
            restablecerContrasena: restablecer,
            idAlumno: alumno.idAlumno,
            idParentesco: valores.idParentesco,
          },
        })
        if (actualizado.credencialesEnviadas === false) {
          toast.warning(`${SIN_ACCESOS}: la contraseña no se cambió.`)
        } else {
          toast.success(
            actualizado.credencialesEnviadas
              ? `Apoderado actualizado. Se envió una contraseña nueva a ${valores.gmail.trim()}`
              : "Apoderado actualizado"
          )
        }
      } else {
        const reemplazado = await reemplazar.mutateAsync({
          id: apoderado.idApoderado,
          idAlumno: alumno.idAlumno,
          data: aApoderadoRequest(valores),
        })
        if (reemplazado.credencialesEnviadas === false) {
          toast.warning(`${SIN_ACCESOS} con sus accesos. Revisa su correo y marca Restablecer al editarlo.`)
        } else {
          toast.success(
            reemplazado.credencialesEnviadas
              ? `Apoderado reemplazado. Sus accesos se enviaron a ${valores.gmail.trim()}`
              : "Apoderado reemplazado"
          )
        }
      }
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el apoderado")
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <FormularioApoderado
        form={form}
        indice={0}
        idAlumno={alumno.idAlumno}
        original={original}
        onCambiarCorreo={handleCambiarCorreo}
      />

      {!esReemplazo && <CampoRestablecerContrasena checked={restablecer} onCheckedChange={setRestablecer} />}

      {esReemplazo && (
        <Aviso icono={UserMinus} titulo={`${apoderado.nombre} ${apoderado.apellidoPat} dejará de ser apoderado de este alumno`}>
          Perderá el acceso a sus datos al guardar.
          {sinOtrosHijos ? " Como no tiene otros hijos en el colegio, se eliminará su cuenta de apoderado." : ""}
        </Aviso>
      )}

      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" onClick={handleGuardar} disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {esReemplazo ? "Reemplazar apoderado" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </div>
  )
}
