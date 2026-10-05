import { PortalHero } from "@/components/portal/public/portal-hero"
import { PortalPublicacionesPreview } from "@/components/portal/public/portal-publicaciones"
import { PortalEventosPreview } from "@/components/portal/public/portal-eventos"
import { PortalGaleriasPreview } from "@/components/portal/public/portal-galerias"

export const metadata = {
  title: "Portal del Colegio",
}

export default function PortalPage() {
  return (
    <>
      <PortalHero />
      <PortalPublicacionesPreview />
      <PortalEventosPreview />
      <PortalGaleriasPreview />
    </>
  )
}
