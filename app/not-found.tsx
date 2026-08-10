import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-lg items-center px-6 py-16 text-center">
      <div className="w-full rounded-3xl bg-white p-8 ring-1 ring-black/5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Erro 404</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          O endereço pode ter mudado ou o conteúdo não está mais disponível.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/campeonatos" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            Ver campeonatos
          </Link>
          <Link href="/" className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
