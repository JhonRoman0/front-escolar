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
import type { DistribucionGrado } from "@/lib/api/dashboard"

interface DistribucionGradoChartProps {
  datos?: DistribucionGrado[]
  cargando?: boolean
}

export function DistribucionGradoChart({
  datos,
  cargando,
}: DistribucionGradoChartProps) {
  const hayDatos = !!datos?.length
  // La altura crece con la cantidad de grados para que las barras respiren.
  const altura = Math.max(220, (datos?.length ?? 0) * 48 + 40)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alumnos por grado</CardTitle>
        <CardDescription>
          Matrículas activas agrupadas por grado escolar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : !hayDatos ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Sin matrículas registradas.
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
                cursor={{ fill: "var(--accent)" }}
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
