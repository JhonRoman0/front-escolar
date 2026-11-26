"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DistribucionGrado, EstadoDato } from "@/lib/api/dashboard"

interface DistribucionGradoChartProps {
  datos?: DistribucionGrado[]
  estado: EstadoDato
}

export function DistribucionGradoChart({
  datos,
  estado,
}: DistribucionGradoChartProps) {
  const altura = Math.max(220, (datos?.length ?? 0) * 48 + 40)
  const mensaje =
    estado === "error"
      ? "No se pudo cargar la distribución."
      : estado === "sin-anio"
        ? "Seleccione un año escolar para ver la distribución."
        : estado === "sin-datos"
          ? "Sin alumnos matriculados en el año seleccionado."
          : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alumnos por grado</CardTitle>
        <CardDescription>
          Alumnos únicos matriculados en el año seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {estado === "cargando" ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : mensaje ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {mensaje}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={altura}>
            <BarChart
              data={datos}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="grado"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--brand-subtle)" }}
                formatter={(valor) => [`${valor} alumno(s)`, "Matriculados"]}
              />
              <Bar
                dataKey="alumnos"
                fill="var(--chart-1)"
                radius={[0, 6, 6, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
