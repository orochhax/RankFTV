"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "ui.render_failed", digest: error.digest ?? "client" }));
  }, [error.digest]);

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-lg items-center px-6 py-16 text-center">
      <div className="w-full rounded-3xl bg-white p-8 ring-1 ring-black/5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Falha temporária</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Não foi possível abrir esta tela</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Tente novamente. Se o problema continuar, informe o código exibido abaixo ao suporte.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-gray-400">Código: {error.digest}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Tentar novamente
          </button>
          <Link href="/" className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
