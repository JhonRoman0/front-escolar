"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

const emptySubscribe = () => () => {}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const montado = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const oscuro = montado && resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(oscuro ? "light" : "dark")}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
    >
      {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}