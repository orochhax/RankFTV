"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "ui.global_render_failed", digest: error.digest ?? "client" }));
  }, [error.digest]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16 text-center">
          <div className="w-full rounded-3xl bg-white p-8 ring-1 ring-black/5 shadow-sm">
            <title>Erro temporário | RankFTV</title>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500">RankFTV indisponível</p>
            <h1 className="mt-3 text-2xl font-bold">Ocorreu uma falha inesperada</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Tente recarregar a aplicação. Nenhum pagamento deve ser repetido até a tela confirmar o resultado.
            </p>
            {error.digest && <p className="mt-3 font-mono text-xs text-gray-400">Código: {error.digest}</p>}
            <button
              type="button"
              onClick={() => retry()}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Recarregar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
