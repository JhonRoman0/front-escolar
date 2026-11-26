"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EstadoDato } from "@/lib/api/dashboard"
import type { EstadisticasResponse } from "@/lib/api/asistencia"

interface AsistenciaHoyChartProps {
  estadisticas?: EstadisticasResponse
  estado: EstadoDato
}

const ESTADOS = [
  { key: "presentes", nombre: "Puntual", color: "#10b981" },
  { key: "tardanzas", nombre: "Tardanza", color: "#f59e0b" },
  { key: "justificados", nombre: "Justificada", color: "#8b5cf6" },
  { key: "inasistencias", nombre: "Inasistencia", color: "#ef4444" },
] as const

export function AsistenciaHoyChart({
  estadisticas,
  estado,
}: AsistenciaHoyChartProps) {
  const datos = ESTADOS.map((e) => ({
    nombre: e.nombre,
    total: estadisticas?.[e.key] ?? 0,
    color: e.color,
  }))
  const mensaje =
    estado === "error"
      ? "No se pudo cargar la asistencia."
      : estado === "sin-anio"
        ? "Seleccione un año escolar para ver la asistencia."
        : estado === "sin-datos"
          ? "Sin datos de asistencia para el año seleccionado."
          : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asistencia de hoy</CardTitle>
        <CardDescription>
          Alumnos por estado de asistencia en el día
        </CardDescription>
      </CardHeader>
      <CardContent>
        {estado === "cargando" ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : mensaje ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            {mensaje}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={datos} margin={{ top: 8, right: 8, left: -16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="nombre"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--brand-subtle)" }}
                formatter={(valor) => [`${valor} alumno(s)`, "Total"]}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {datos.map((d) => (
                  <Cell key={d.nombre} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
