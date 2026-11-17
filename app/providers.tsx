"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { crearQueryClient } from "@/lib/query-client"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(crearQueryClient)

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}