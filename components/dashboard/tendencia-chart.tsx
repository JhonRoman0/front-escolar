"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TendenciaDia } from "@/lib/api/dashboard"

interface TendenciaChartProps {
  datos?: TendenciaDia[]
  cargando?: boolean
}

export function TendenciaChart({ datos, cargando }: TendenciaChartProps) {
  const hayDatos = !!datos?.some((d) => d.porcentaje != null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de la semana</CardTitle>
        <CardDescription>
          Porcentaje de asistencia de lunes a viernes (semana en curso)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : !hayDatos ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Sin datos de asistencia esta semana.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <LineChart
              data={datos}
              margin={{ top: 8, right: 16, left: -16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(valor) => [
                  valor == null ? "sin clase" : `${valor}%`,
                  "Asistencia",
                ]}
                labelFormatter={(_, payload) => {
                  const punto = payload?.[0]?.payload as
                    | TendenciaDia
                    | undefined
                  return punto ? `${punto.dia} ${punto.etiquetaCorta}` : ""
                }}
              />
              <Line
                type="monotone"
                dataKey="porcentaje"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--chart-1)" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
