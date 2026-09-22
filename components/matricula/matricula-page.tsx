"use client"

import { usePuedeLeer } from "@/hooks/use-permisos"
import { MatriculasTab } from "./matriculas-tab"

export default function MatriculaPage() {
  const puedeMatriculas = usePuedeLeer("MATRICULAS")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Matrícula</h1>
        <p className="text-sm text-muted-foreground">
          Matrículas por año escolar y cambios de sección con historial.
        </p>
      </div>
      {puedeMatriculas && <MatriculasTab />}
    </div>
  )
}