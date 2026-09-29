import { PortalContactoForm } from "@/components/portal/public/portal-contacto"

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#0f1e3d]">Contáctanos</h1>
        <p className="mt-2 text-muted-foreground">
          Estamos aquí para atender tus consultas
        </p>
      </div>

      <div className="rounded-2xl border border-[#e1e7f0] bg-white p-8 shadow-sm">
        <PortalContactoForm />
      </div>
    </div>
  )
}
