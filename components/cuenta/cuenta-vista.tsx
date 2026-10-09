"use client"

import { useState } from "react"
import { CircleUserRound, Lock } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { CambiarContrasenaDialog } from "@/components/cuenta/cambiar-contrasena-dialog"

export default function CuentaVista() {
  const { usuario } = useAuth()
  const [cambiarContrasenaAbierto, setCambiarContrasenaAbierto] = useState(false)

  if (!usuario) return null

  const nombreCompleto =
    `${usuario.nombre} ${usuario.apellidoPat} ${usuario.apellidoMat}`.trim()
  const partes = nombreCompleto.split(" ")
  const iniciales =
    partes.length >= 2
      ? partes[0][0].concat(partes[1][0])
      : partes[0].slice(0, 2)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CircleUserRound className="size-4 text-muted-foreground" />
            <CardTitle>Información de la cuenta</CardTitle>
          </div>
          <CardDescription>Aquí puedes ver la información de tu cuenta en el sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg bg-muted/40 p-4">
            <Avatar className="size-20 shrink-0">
              {usuario.urlFoto && <AvatarImage src={usuario.urlFoto} alt={nombreCompleto} />}
              <AvatarFallback className="text-lg">{iniciales}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{nombreCompleto}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {usuario.roles.length > 0 ? (
                  usuario.roles.map((rol) => (
                    <Badge key={rol.idRol} variant="secondary">
                      {rol.nombre}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">{usuario.nombreRol ?? "Usuario"}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CampoSoloLectura etiqueta="Código de usuario" valor={usuario.codigo} />
            <CampoSoloLectura etiqueta="Nombres y apellidos" valor={nombreCompleto} />
            <CampoSoloLectura etiqueta="Correo electrónico" valor={usuario.gmail ?? "—"} />
            {usuario.documentoIdentidad && (
              <CampoSoloLectura etiqueta="DNI" valor={usuario.documentoIdentidad} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <CardTitle>Seguridad</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Protege el acceso a tu cuenta.
              </p>
              <p className="text-sm text-muted-foreground">
                Puedes cambiar tu contraseña cuando lo necesites.
              </p>
            </div>
            <Button
              variant="brand"
              className="w-full sm:w-auto"
              onClick={() => setCambiarContrasenaAbierto(true)}
            >
              <Lock />
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      <CambiarContrasenaDialog
        open={cambiarContrasenaAbierto}
        onOpenChange={setCambiarContrasenaAbierto}
      />
    </div>
  )
}

function CampoSoloLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3.5 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{valor}</p>
    </div>
  )
}