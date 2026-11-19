export function normalizarBusqueda(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function tokensBusqueda(texto: string | null | undefined): string[] {
  const normalizado = normalizarBusqueda(texto)
  return normalizado ? normalizado.split(/\s+/) : []
}

export function coincideBusqueda(
  campos: Array<string | null | undefined>,
  tokens: string[]
): boolean {
  const terminos = tokens
  if (terminos.length === 0) return true
  const texto = normalizarBusqueda(
    campos.filter((campo): campo is string => !!campo).join(" ")
  )
  return terminos.every((termino) => texto.includes(termino))
}
