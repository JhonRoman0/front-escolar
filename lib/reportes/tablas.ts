import type {
  AlumnoReporteItem,
  DocenteReporteItem,
  MatriculaReporteItem,
  UsuarioReporteItem,
} from "@/lib/api/reportes"
import { generarCsvTabla } from "./generar-csv"
import { generarExcelTabla } from "./generar-excel"
import { generarPdfTabla } from "./generar-pdf"
import { edad, fechaCorta, type ColumnaReporte, type TablaReporte } from "./formato"

export type FormatoReporte = "pdf" | "excel" | "csv"

/** Datos del encabezado, comunes a los tres formatos. */
export interface ContextoReporte {
  inicio: string
  fin: string
  colegio: string
  /** Filtros aplicados, ya en texto: "Nivel: Primaria". */
  filtros: string[]
}

type Definicion<T> = (ColumnaReporte & { valor: (fila: T) => string | number | null })[]

function fecha(iso: string | null | undefined): string | null {
  return iso ? fechaCorta(iso) : null
}

function armar<T>(
  datos: T[],
  columnas: Definicion<T>,
  titulo: string,
  archivo: string,
  { inicio, fin, colegio, filtros }: ContextoReporte
): TablaReporte {
  const hoy = new Date().toLocaleDateString("en-CA")
  return {
    titulo,
    hoja: titulo.replace("Reporte de ", ""),
    archivo: inicio && fin ? `reporte-${archivo}-${inicio}_${fin}` : `reporte-${archivo}-${hoy}`,
    encabezado: [
      colegio,
      ...(inicio && fin ? [`Rango: ${fechaCorta(inicio)} — ${fechaCorta(fin)}`] : []),
      ...filtros,
      `Total de registros: ${datos.length}`,
      `Generado: ${new Date().toLocaleString("es-PE")}`,
    ],
    columnas: columnas.map(({ titulo, ancho, tipo }) => ({ titulo, ancho, tipo })),
    filas: datos.map((fila) => columnas.map((c) => c.valor(fila))),
  }
}

export function tablaUsuarios(datos: UsuarioReporteItem[], contexto: ContextoReporte): TablaReporte {
  return armar(
    datos,
    [
      { titulo: "Código", ancho: 14, tipo: "codigo", valor: (d) => d.codigo },
      { titulo: "Nombre", ancho: 34, valor: (d) => d.nombre },
      { titulo: "DNI", ancho: 11, tipo: "codigo", valor: (d) => d.documentoIdentidad },
      { titulo: "Correo", ancho: 32, valor: (d) => d.gmail },
      { titulo: "Celular", ancho: 12, tipo: "codigo", valor: (d) => d.celular },
      { titulo: "Roles", ancho: 24, valor: (d) => d.roles.join(", ") },
      { titulo: "Estado", ancho: 10, valor: (d) => d.estado },
      { titulo: "Fecha creación", ancho: 14, valor: (d) => fecha(d.fechaCreacion) },
    ],
    "Reporte de Usuarios",
    "usuarios",
    contexto
  )
}

export function tablaDocentes(datos: DocenteReporteItem[], contexto: ContextoReporte): TablaReporte {
  return armar(
    datos,
    [
      { titulo: "Código", ancho: 12, tipo: "codigo", valor: (d) => d.codigo },
      { titulo: "Nombre", ancho: 34, valor: (d) => d.nombre },
      { titulo: "DNI", ancho: 11, tipo: "codigo", valor: (d) => d.documentoIdentidad },
      { titulo: "Correo", ancho: 32, valor: (d) => d.gmail },
      { titulo: "Celular", ancho: 12, tipo: "codigo", valor: (d) => d.celular },
      { titulo: "Grado académico", ancho: 16, valor: (d) => d.gradoAcademico },
      { titulo: "Tipo contrato", ancho: 20, valor: (d) => d.tipoContrato },
      { titulo: "Niveles", ancho: 22, valor: (d) => d.niveles.join(", ") },
      { titulo: "Estado", ancho: 10, valor: (d) => d.estado },
      { titulo: "Fecha contratación", ancho: 17, valor: (d) => fecha(d.fechaContratacion) },
    ],
    "Reporte de Docentes",
    "docentes",
    contexto
  )
}

export function tablaAlumnos(datos: AlumnoReporteItem[], contexto: ContextoReporte): TablaReporte {
  // Sin el permiso de apoderados el back no los envía: la columna ni aparece.
  const conApoderados = datos.some((d) => d.apoderados != null)
  return armar(
    datos,
    [
      { titulo: "Código", ancho: 18, tipo: "codigo", valor: (d) => d.codigo },
      { titulo: "Nombre", ancho: 34, valor: (d) => d.nombre },
      { titulo: "DNI", ancho: 11, tipo: "codigo", valor: (d) => d.documentoIdentidad },
      { titulo: "Fecha nac.", ancho: 11, valor: (d) => fecha(d.fechaNacimiento) },
      { titulo: "Edad", ancho: 6, valor: (d) => edad(d.fechaNacimiento) },
      { titulo: "Nivel", ancho: 11, valor: (d) => d.nivel },
      { titulo: "Grado y sección", ancho: 15, valor: (d) => d.gradoSeccion },
      { titulo: "Turno", ancho: 9, valor: (d) => d.turno },
      ...(conApoderados
        ? [{ titulo: "Apoderados", ancho: 48, valor: (d: AlumnoReporteItem) => d.apoderados?.join("; ") ?? null }]
        : []),
      { titulo: "Fecha ingreso", ancho: 13, valor: (d) => fecha(d.fechaIngreso) },
    ],
    "Reporte de Alumnos",
    "alumnos",
    contexto
  )
}

export function tablaMatriculas(datos: MatriculaReporteItem[], contexto: ContextoReporte): TablaReporte {
  return armar(
    datos,
    [
      { titulo: "Alumno", ancho: 34, valor: (d) => d.alumno },
      { titulo: "Código", ancho: 18, tipo: "codigo", valor: (d) => d.codigo },
      { titulo: "DNI", ancho: 11, tipo: "codigo", valor: (d) => d.documentoIdentidad },
      { titulo: "Año", ancho: 6, valor: (d) => d.anio },
      { titulo: "Nivel", ancho: 11, valor: (d) => d.nivel },
      { titulo: "Grado y sección", ancho: 15, valor: (d) => d.gradoSeccion },
      { titulo: "Turno", ancho: 9, valor: (d) => d.turno },
      { titulo: "Método de pago", ancho: 16, valor: (d) => d.metodoPago },
      { titulo: "Monto (S/)", ancho: 10, tipo: "monto", valor: (d) => d.monto },
      { titulo: "Pagado (S/)", ancho: 10, tipo: "monto", valor: (d) => d.montoPago },
      { titulo: "Saldo (S/)", ancho: 10, tipo: "monto", valor: (d) => d.saldo },
      { titulo: "Fecha pago", ancho: 11, valor: (d) => fecha(d.fechaPago) },
      { titulo: "Registro", ancho: 11, valor: (d) => fecha(d.fechaRegistro) },
      { titulo: "Registrado por", ancho: 22, valor: (d) => d.registradoPor },
      { titulo: "Estado", ancho: 9, valor: (d) => d.estado },
    ],
    "Reporte de Matrícula",
    "matricula",
    contexto
  )
}

export function descargarTabla(formato: FormatoReporte, tabla: TablaReporte): void {
  if (formato === "pdf") generarPdfTabla(tabla)
  else if (formato === "excel") generarExcelTabla(tabla)
  else generarCsvTabla(tabla)
}
