"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { DashboardTab } from "@/components/dashboard/dashboard-tab"
import { urlModulo } from "@/lib/modulos"

export default function DashboardHome() {
  const { esAdmin, permisos } = useAuth()
  const router = useRouter()
  // Quien solo tiene el portal (el apoderado) entra directo a él.
  const soloPortal =
    !esAdmin && permisos?.modulos.length === 1 && urlModulo(permisos.modulos[0].modulo) === "/portal"

  useEffect(() => {
    if (soloPortal) router.replace("/portal")
  }, [soloPortal, router])

  if (soloPortal) return null
  return <DashboardTab />
}
