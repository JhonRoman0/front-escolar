import { PortalColegioInfo } from "@/components/portal/public/portal-colegio-info"

export default function ColegioPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#0f1e3d]">Info del Colegio</h1>
        <p className="mt-2 text-muted-foreground">
          Conoce todo sobre nuestra institución
        </p>
      </div>

      <div className="rounded-2xl border border-[#e1e7f0] bg-white p-8 shadow-sm">
        <PortalColegioInfo />
      </div>
    </div>
  )
}
