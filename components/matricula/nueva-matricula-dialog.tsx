"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Stepper } from "@/components/shared/stepper"
import { useCrudMatriculas } from "@/hooks/use-matricula"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePuede } from "@/hooks/use-permisos"
import { BotonFicha } from "./boton-ficha"
import type { ApoderadoBusqueda, InscripcionApoderado, InscripcionRequest, MatriculaResponse } from "@/lib/api/matricula"
import type { ApoderadoPasoValues } from "@/lib/schemas/matricula"

import { PasoAlumno, type AlumnoPaso } from "./paso-alumno"
import { apoderadoDesdeBusqueda, PasoApoderado } from "./paso-apoderado"
import { PasoMatricula, type DatosMatriculaPaso } from "./paso-matricula"

const PASOS = ["Alumno", "Apoderado", "Matrícula"]

export function aApoderadoRequest(a: ApoderadoPasoValues): InscripcionApoderado {
  const contacto = {
    documentoIdentidad: a.documentoIdentidad,
    idParentesco: a.idParentesco,
    direccion: a.direccion.trim(),
    celular: a.celular,
  }
  if (a.estado === "APODERADO") return contacto
  if (a.estado === "USUARIO") return { ...contacto, sexo: a.sexo }
  return {
    ...contacto,
    sexo: a.sexo,
    nombre: a.nombre.trim(),
    apellidoPat: a.apellidoPat.trim(),
    apellidoMat: a.apellidoMat.trim(),
    fechaNaci: a.fechaNaci,
    gmail: a.gmail.trim(),
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
  onCreada,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreada?: (matricula: MatriculaResponse) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <Asistente onCerrar={() => onOpenChange(false)} onCreada={onCreada} />}
    </Dialog>
  )
}

function Asistente({ onCerrar, onCreada }: { onCerrar: () => void; onCreada?: (matricula: MatriculaResponse) => void }) {
  const crud = useCrudMatriculas()
  const puedeImprimirFicha = usePuede("MATRICULAS", "IMPRIMIR_FICHA")
  const [matriculaCreada, setMatriculaCreada] = useState<MatriculaResponse | null>(null)
  const [paso, setPaso] = useState(1)
  const [alumno, setAlumno] = useState<AlumnoPaso | null>(null)
  const [apoderados, setApoderados] = useState<ApoderadoPasoValues[]>([])
  // Los que ya tenía el alumno: si no quedan en el formulario, dejan de ser sus apoderados.
  const [vinculados, setVinculados] = useState<ApoderadoBusqueda[]>([])

  function handleAlumno(datos: AlumnoPaso, previos: ApoderadoBusqueda[] | null) {
    // Un alumno del colegio trae a sus apoderados; si se cambió de alumno, se descartan.
    if (previos?.length && datos.idAlumno !== alumno?.idAlumno) {
      setApoderados(previos.map(apoderadoDesdeBusqueda))
      setVinculados(previos)
    } else if (alumno && datos.valores.documentoIdentidad !== alumno.valores.documentoIdentidad) {
      setApoderados([])
      setVinculados([])
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
      const creada = await crud.inscribir.mutateAsync({ data: request, foto: alumno.foto, comprobante })
      const nuevos = apoderados.filter((a) => a.estado === "NUEVO").map((a) => a.gmail.trim())
      if (creada.credencialesEnviadas === false) {
        toast.warning(
          "Matrícula creada, pero no se pudieron enviar los accesos del apoderado. Revisa su correo en Estudiantes y marca Restablecer contraseña.",
          { id: guardando }
        )
      } else {
        toast.success(
          nuevos.length
            ? `Matrícula creada. Los accesos se enviaron a ${nuevos.join(" y ")}`
            : "Matrícula creada",
          { id: guardando }
        )
      }
      onCreada?.(creada)
      if (puedeImprimirFicha) setMatriculaCreada(creada)
      else onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la matrícula", { id: guardando })
    }
  }

  const contenido = matriculaCreada ? (
      <div className="flex min-h-0 flex-col items-center gap-3 overflow-y-auto py-2 text-center">
        <CircleCheck className="size-10 shrink-0 text-exito" aria-hidden />
        <div className="w-full min-w-0 space-y-1 break-words">
          <p className="text-base font-semibold">Matrícula creada</p>
          <p className="text-sm text-muted-foreground">{matriculaCreada.alumno}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
          <BotonFicha idMatricula={matriculaCreada.idMatricula} alumno={matriculaCreada.alumno} conTexto />
        </div>
      </div>
    ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="shrink-0">
        <Stepper steps={PASOS} paso={paso} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {paso === 1 && <PasoAlumno value={alumno} onCancelar={onCerrar} onSiguiente={handleAlumno} />}
        {paso === 2 && alumno && (
          <PasoApoderado
            value={apoderados}
            idAlumno={alumno.idAlumno}
            vinculados={vinculados}
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
  return (
    <DialogContent className={`flex max-h-[90vh] flex-col ${matriculaCreada ? "sm:max-w-md" : "sm:max-w-2xl"}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Nueva matrícula</DialogTitle>
        </DialogHeader>
      {contenido}
    </DialogContent>
  )
}
