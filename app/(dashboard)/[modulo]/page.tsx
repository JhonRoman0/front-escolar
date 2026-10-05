"use client"

import { useParams } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ModuloPlaceholderPage() {
  const params = useParams<{ modulo: string }>()
  const slug = params?.modulo ?? ""

  const nombre = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>{nombre}</CardTitle>
          <CardDescription>Módulo en construcción</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Este módulo se implementará en una próxima fase.
          </p>
          <p className="text-muted-foreground">
            El menú dinámico por permisos ya está funcionando correctamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}