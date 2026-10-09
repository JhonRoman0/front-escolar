"use client"

import CuentaVista from "@/components/cuenta/cuenta-vista"

export default function CuentaPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Cuenta</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">
          Tu cuenta y seguridad.
        </p>
      </div>
      <CuentaVista />
    </div>
  )
}