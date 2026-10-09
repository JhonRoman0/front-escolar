import { useEffect, useState } from "react"

/**
 * Devuelve `value` retrasado `delay` ms: solo cambia cuando el valor se mantiene
 * estable durante ese lapso. Pensado para alimentar queries de búsqueda y evitar
 * una petición por cada tecla.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
