"use client"

import { AlumnosTab } from "./alumnos-tab"

export default function EstudiantesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Estudiantes</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Alumnos y sus apoderados — expande la fila para ver apoderados</p>
      </div>
      <AlumnosTab />
    </div>
  )
}