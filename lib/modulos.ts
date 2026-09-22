import {
  BookOpen,
  Building,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Globe,
  GraduationCap,
  LayoutGrid,
  Newspaper,
  School,
  Shield,
  UserCheck,
  type LucideIcon,
} from "lucide-react"

export interface ModuloMenuItem {
  nombre: string
  url: string
  icon: LucideIcon
}

// Iconos por el nombre que manda el back en `modulos[].icono`
const ICONOS: Record<string, LucideIcon> = {
  shield: Shield,
  book: BookOpen,
  "user-graduate": GraduationCap,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  globe: Globe,
  school: School,
  "user-check": UserCheck,
  portal: Newspaper,
  colegio: Building,
  horario: CalendarDays,
}

export function iconoModulo(nombreIcono: string | null | undefined): LucideIcon {
  return (nombreIcono && ICONOS[nombreIcono]) || LayoutGrid
}

// "Académico" → "/academico", "Estudiantes" → "/estudiantes"
// "Portal" → "/gestion-portal" (via URL_OVERRIDES)
export function urlModulo(nombre: string): string {
  const clave = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
  if (URL_OVERRIDES[clave]) return URL_OVERRIDES[clave]
  return `/${clave}`
}

// Módulos sembrados por el back (DataSeeder). El guard usa esta lista para
// distinguir "ruta de módulo sin permiso" (→ /sin-acceso) de un 404 real.
export const RUTAS_MODULOS: string[] = [
  "/seguridad",
  "/academico",
  "/estudiantes",
  "/matricula",
  "/evaluacion",
  "/gestion-portal",
  "/colegio",
  "/asistencia",
  "/horario",
]

// Overrides: el back manda "Portal" pero la ruta admin es /gestion-portal
// para no colisionar con las rutas públicas /portal/*.
// "Consolidado" mapea a /evaluacion (ruta existente).
const URL_OVERRIDES: Record<string, string> = {
  portal: "/gestion-portal",
  consolidado: "/evaluacion",
}

export interface ModuloFuente {
  modulo: string
  icono?: string | null
}

// Normaliza la lista de módulos del back en items del menú
export function construirItemsModulos(modulos: ModuloFuente[]): ModuloMenuItem[] {
  return modulos
    .filter((m) => m.modulo)
    .map((m) => ({
      nombre: m.modulo,
      url: urlModulo(m.modulo),
      icon: iconoModulo(m.icono),
    }))
}