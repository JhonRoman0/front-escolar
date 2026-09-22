"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useEnviarContacto } from "@/hooks/use-portal"

const schema = z.object({
  nombreRemitente: z.string().min(2, "Nombre requerido"),
  correo: z.string().email("Correo inválido"),
  celular: z.string().optional(),
  asunto: z.string().optional(),
  mensaje: z.string().min(5, "Escribe un mensaje"),
})

type FormularioContacto = z.infer<typeof schema>

export function PortalContactoForm() {
  const enviar = useEnviarContacto()
  const [enviado, setEnviado] = useState(false)

  const form = useForm<FormularioContacto>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreRemitente: "",
      correo: "",
      celular: "",
      asunto: "",
      mensaje: "",
    },
  })

  function onSubmit(data: FormularioContacto) {
    enviar.mutate(data, {
      onSuccess: () => {
        toast.success("Mensaje enviado correctamente")
        setEnviado(true)
        form.reset()
      },
      onError: () => {
        toast.error("No se pudo enviar el mensaje. Intenta nuevamente.")
      },
    })
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-3 text-4xl">✉️</div>
        <h3 className="mb-2 text-lg font-semibold text-green-800">
          ¡Mensaje enviado!
        </h3>
        <p className="text-sm text-green-700">
          Gracias por comunicarte. Te responderemos a la brevedad.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setEnviado(false)}
        >
          Enviar otro mensaje
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#0f1e3d]">
            Nombre completo *
          </label>
          <Input placeholder="Tu nombre" {...form.register("nombreRemitente")} />
          {form.formState.errors.nombreRemitente && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.nombreRemitente.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#0f1e3d]">
            Correo electrónico *
          </label>
          <Input type="email" placeholder="correo@ejemplo.com" {...form.register("correo")} />
          {form.formState.errors.correo && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.correo.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#0f1e3d]">
            Celular
          </label>
          <Input placeholder="999 888 777" {...form.register("celular")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#0f1e3d]">
            Asunto
          </label>
          <Input placeholder="¿Sobre qué quieres consultar?" {...form.register("asunto")} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#0f1e3d]">
          Mensaje *
        </label>
        <Textarea
          placeholder="Escribe tu mensaje aquí..."
          rows={5}
          {...form.register("mensaje")}
        />
        {form.formState.errors.mensaje && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.mensaje.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="bg-[#004497] text-white hover:bg-[#003377]"
        disabled={enviar.isPending}
      >
        <Send className="mr-2 h-4 w-4" />
        {enviar.isPending ? "Enviando..." : "Enviar mensaje"}
      </Button>
    </form>
  )
}
