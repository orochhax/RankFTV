import { Building2 } from "lucide-react";

export default function ArenasPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-xl space-y-2">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Arenas</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Encontre sua arena</h1>
          <p className="text-sm text-white/50">
            Arenas de futevôlei parceiras da plataforma.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-12 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <Building2 className="mx-auto mb-4 size-12 text-gray-200" />
          <p className="font-semibold text-gray-700">Em breve</p>
          <p className="mt-1 text-sm text-gray-400">
            O módulo de arenas está a caminho. Em breve você poderá encontrar arenas, se matricular e acompanhar sua evolução.
          </p>
        </div>
      </div>
    </div>
  );
}
