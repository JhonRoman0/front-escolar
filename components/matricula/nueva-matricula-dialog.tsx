"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Stepper } from "@/components/shared/stepper"
import { useCrudMatriculas } from "@/hooks/use-matricula"
import type { ApoderadoBusqueda, InscripcionApoderado, InscripcionRequest } from "@/lib/api/matricula"
import type { ApoderadoPasoValues } from "@/lib/schemas/matricula"

import { PasoAlumno, type AlumnoPaso } from "./paso-alumno"
import { apoderadoDesdeBusqueda, PasoApoderado } from "./paso-apoderado"
import { PasoMatricula, type DatosMatriculaPaso } from "./paso-matricula"

const PASOS = ["Alumno", "Apoderado", "Matrícula"]

export function aApoderadoRequest(a: ApoderadoPasoValues): InscripcionApoderado {
  const base = { documentoIdentidad: a.documentoIdentidad, idParentesco: a.idParentesco }
  if (a.estado === "APODERADO") return base
  const contacto = { ...base, sexo: a.sexo, direccion: a.direccion.trim(), celular: a.celular }
  if (a.estado === "USUARIO") return contacto
  return {
    ...contacto,
    nombre: a.nombre.trim(),
    apellidoPat: a.apellidoPat.trim(),
    apellidoMat: a.apellidoMat.trim(),
    fechaNaci: a.fechaNaci,
    gmail: a.gmail.trim(),
    contraseña: a.contraseña,
  }
}

function aRequest(alumno: AlumnoPaso, apoderados: ApoderadoPasoValues[]): InscripcionRequest {
  const v = alumno.valores
  return {
    alumno: {
      documentoIdentidad: v.documentoIdentidad,
      nombre: v.nombre.trim(),
      apellidoPat: v.apellidoPat.trim(),
      apellidoMat: v.apellidoMat.trim(),
      fechaNacimiento: v.fechaNacimiento,
      sexo: v.sexo,
      direccion: v.direccion.trim(),
      tieneDiscapacidad: v.tieneDiscapacidad,
      discapacidad: v.tieneDiscapacidad ? v.discapacidad.trim() : null,
    },
    apoderados: apoderados.map(aApoderadoRequest),
  }
}

/**
 * Asistente de matrícula. Nada se guarda hasta "Crear matrícula": el paso 2
 * solo valida alumno y apoderados en el back, y al final todo se guarda junto.
 * Cancelar en cualquier paso no deja registros a medias.
 */
export function NuevaMatriculaDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Nueva matrícula</DialogTitle>
        </DialogHeader>
        {/* Se monta al abrir: cada apertura empieza desde el paso 1 limpio. */}
        {open && <Asistente onCerrar={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Asistente({ onCerrar }: { onCerrar: () => void }) {
  const crud = useCrudMatriculas()
  const [paso, setPaso] = useState(1)
  const [alumno, setAlumno] = useState<AlumnoPaso | null>(null)
  const [apoderados, setApoderados] = useState<ApoderadoPasoValues[]>([])

  function handleAlumno(datos: AlumnoPaso, previos: ApoderadoBusqueda[] | null) {
    // Un alumno del colegio trae a sus apoderados; si se cambió de alumno, se descartan.
    if (previos?.length && datos.idAlumno !== alumno?.idAlumno) {
      setApoderados(previos.map(apoderadoDesdeBusqueda))
    } else if (alumno && datos.valores.documentoIdentidad !== alumno.valores.documentoIdentidad) {
      setApoderados([])
    }
    setAlumno(datos)
    setPaso(2)
  }

  async function handleApoderados(valores: ApoderadoPasoValues[]) {
    if (!alumno) return
    setApoderados(valores)
    try {
      await crud.validar.mutateAsync(aRequest(alumno, valores))
      setPaso(3)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revisa los datos de los apoderados")
    }
  }

  async function handleCrear(datos: DatosMatriculaPaso, comprobante: File | null) {
    if (!alumno) return
    const request: InscripcionRequest = {
      ...aRequest(alumno, apoderados),
      matricula: {
        idGradoSeccion: datos.idGradoSeccion,
        idMetodoPago: datos.idMetodoPago,
        codigoTransaccion: datos.codigoTransaccion.trim() || null,
        observaciones: datos.observaciones.trim() || null,
      },
    }
    const guardando = toast.loading("Creando matrícula...")
    try {
      await crud.inscribir.mutateAsync({ data: request, foto: alumno.foto, comprobante })
      const nuevos = apoderados.filter((a) => a.estado === "NUEVO").map((a) => a.gmail.trim())
      toast.success(
        nuevos.length
          ? `Matrícula creada. Los accesos se enviaron a ${nuevos.join(" y ")}`
          : "Matrícula creada",
        { id: guardando }
      )
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la matrícula", { id: guardando })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <Stepper steps={PASOS} paso={paso} />
      <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-1">
        {paso === 1 && <PasoAlumno value={alumno} onCancelar={onCerrar} onSiguiente={handleAlumno} />}
        {paso === 2 && alumno && (
          <PasoApoderado
            value={apoderados}
            idAlumno={alumno.idAlumno}
            validando={crud.validar.isPending}
            onAtras={(valores) => {
              setApoderados(valores)
              setPaso(1)
            }}
            onSiguiente={handleApoderados}
          />
        )}
        {paso === 3 && alumno && (
          <PasoMatricula
            alumno={alumno}
            apoderados={apoderados}
            enviando={crud.inscribir.isPending}
            onAtras={() => setPaso(2)}
            onCrear={handleCrear}
          />
        )}
      </div>
    </div>
  )
}
