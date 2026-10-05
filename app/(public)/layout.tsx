"use client"

import Providers from "@/app/providers"
import { PortalHeader } from "@/components/portal/public/portal-header"
import { PortalFooter } from "@/components/portal/public/portal-footer"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-col bg-white">
        <PortalHeader />
        <main className="flex-1">{children}</main>
        <PortalFooter />
      </div>
    </Providers>
  )
}
