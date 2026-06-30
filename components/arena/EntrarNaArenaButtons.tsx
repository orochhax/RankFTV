"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { entrarNaArena, entrarComCodigo } from "@/app/arena/actions";

type EntrarState = { error?: string; ok?: boolean };

export function EntrarNaArenaButtons({
  arenaId,
  vinculo,
  userId,
}: {
  arenaId: string;
  vinculo: { status: string } | null;
  userId: string | null;
}) {
  const [showCodigo, setShowCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoState, setCodigoState] = useState<EntrarState>({});
  const [pending, setPending] = useState(false);

  const [, pedirEntrada, pedirPending] = useActionState<EntrarState, FormData>(
    async (_prev, _fd) => {
      const r = await entrarNaArena(arenaId);
      return r;
    },
    {},
  );

  async function usarCodigo() {
    if (!codigo.trim()) return;
    setPending(true);
    const r = await entrarComCodigo(arenaId, codigo.trim());
    setCodigoState(r);
    setPending(false);
    if (r.ok) setCodigo("");
  }

  // Já é aluno
  if (vinculo?.status === "ativo") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-5 py-4 ring-1 ring-blue-100">
        <CheckCircle2 className="size-5 shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold text-blue-800">Você é aluno desta arena</p>
          <p className="text-sm text-blue-600">Acompanhe sua evolução no perfil.</p>
        </div>
      </div>
    );
  }

  if (vinculo?.status === "pendente") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-100">
        <Clock className="size-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800">Pedido aguardando aprovação</p>
          <p className="text-sm text-amber-600">O dono da arena vai revisar em breve.</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Faça login para entrar nesta arena.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Quer treinar nesta arena? Você pode pedir entrada ou usar o código de convite do dono.
      </p>

      <div className="flex gap-3">
        {/* Pedir entrada */}
        <form action={pedirEntrada} className="flex-1">
          <button
            type="submit"
            disabled={pedirPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pedirPending && <Loader2 className="size-4 animate-spin" />}
            Pedir entrada
          </button>
        </form>

        {/* Entrar com código */}
        <button
          type="button"
          onClick={() => setShowCodigo((v) => !v)}
          className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Tenho um código
        </button>
      </div>

      {showCodigo && (
        <div className="space-y-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código de convite"
            maxLength={12}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center font-mono text-lg tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
          {codigoState.error && (
            <p className="text-sm text-red-600">{codigoState.error}</p>
          )}
          {codigoState.ok && (
            <p className="text-sm font-semibold text-blue-600">Bem-vindo à arena!</p>
          )}
          <button
            onClick={usarCodigo}
            disabled={pending || !codigo.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Entrar com código
          </button>
        </div>
      )}
    </div>
  );
}
