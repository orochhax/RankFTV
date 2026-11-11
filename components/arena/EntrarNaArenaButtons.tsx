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

  const [pedidoState, pedirEntrada, pedirPending] = useActionState<EntrarState, FormData>(
    async () => {
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

  // Pedido acabou de ser enviado nesta sessão
  if (pedidoState.ok) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-100">
        <Clock className="size-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800">Pedido enviado!</p>
          <p className="text-sm text-amber-600">O dono da arena foi notificado e vai revisar em breve.</p>
        </div>
      </div>
    );
  }

  // Já é aluno
  if (vinculo?.status === "ativo") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-brand-soft px-5 py-4 ring-1 ring-brand-border">
        <CheckCircle2 className="size-5 shrink-0 text-brand" />
        <div>
          <p className="font-semibold text-ink">Você é aluno desta arena</p>
          <p className="text-sm text-ink-muted">Acompanhe sua evolução no perfil.</p>
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
          className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
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

      {pedidoState.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
          {pedidoState.error}
        </p>
      )}

      <div className="flex gap-3">
        {/* Pedir entrada */}
        <form action={pedirEntrada} className="flex-1">
          <button
            type="submit"
            disabled={pedirPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center font-mono text-lg tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand uppercase"
          />
          {codigoState.error && (
            <p className="text-sm text-red-600">{codigoState.error}</p>
          )}
          {codigoState.ok && (
            <p className="text-sm font-semibold text-success">Bem-vindo à arena!</p>
          )}
          <button
            onClick={usarCodigo}
            disabled={pending || !codigo.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Entrar com código
          </button>
        </div>
      )}
    </div>
  );
}
