"use client"

import Image from "next/image"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

export default function SinAccesoPage() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#EEF3FF] p-4 sm:p-8 dark:bg-[#0a1626]">
      <div className="flex w-full max-w-2xl flex-col items-center space-y-8 text-center">
        {/* Ilustración */}
        <div className="w-full max-w-md">
          <Image
            src="/error-illustration.svg"
            alt="Sin acceso"
            width={500}
            height={500}
            priority
            className="h-auto w-full"
          />
        </div>

        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Sin acceso
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Tu usuario no tiene permisos para este módulo. Contacta a un
            administrador para que te asigne los permisos necesarios.
          </p>
        </div>

        {/* Acción */}
        <Button
          size="lg"
          variant="outline"
          onClick={logout}
          className="text-primary"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}