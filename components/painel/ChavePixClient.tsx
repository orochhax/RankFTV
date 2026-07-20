"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Pencil, AlertTriangle, X, QrCode } from "lucide-react";
import { salvarChavePix } from "@/app/painel/campeonatos/[id]/financeiro/actions";
import { detectarTipoChavePix } from "@/lib/pix";

function mascarar(chave: string): string {
  if (chave.includes("@")) {
    const [user, domain] = chave.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  const digits = chave.replace(/\D/g, "");
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  if (digits.length === 14) {
    return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
  }
  if (chave.length > 8) {
    return `${chave.slice(0, 4)}****${chave.slice(-4)}`;
  }
  return chave;
}

export function ChavePixClient({ chavePix }: { chavePix: string | null }) {
  const [editando, setEditando]       = useState(!chavePix);
  const [novaChave, setNovaChave]     = useState("");
  const [senha, setSenha]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const [sucesso, setSucesso]         = useState(false);
  const [pending, startTransition]    = useTransition();

  // Trocar uma chave já cadastrada exige confirmar a senha (reautenticação
  // recente) — primeiro cadastro (sem chave anterior) não precisa.
  const precisaSenha = !!chavePix;

  function handleSalvar() {
    if (!novaChave.trim()) { setErro("Informe a chave Pix."); return; }
    setErro(null);
    setShowModal(true);
  }

  function confirmar() {
    if (precisaSenha && !senha) { setErro("Confirme sua senha pra trocar a chave Pix."); return; }
    setShowModal(false);
    startTransition(async () => {
      const res = await salvarChavePix(novaChave.trim(), senha || undefined);
      if (!res.ok) {
        setErro(res.error ?? "Erro ao salvar.");
        return;
      }
      setSucesso(true);
      setEditando(false);
      setNovaChave("");
      setSenha("");
      setTimeout(() => setSucesso(false), 3000);
    });
  }

  const tipoDetectado = novaChave.trim()
    ? detectarTipoChavePix(novaChave.trim())
    : null;

  const TIPO_LABEL: Record<string, string> = {
    CPF: "CPF", CNPJ: "CNPJ", EMAIL: "E-mail", PHONE: "Telefone", EVP: "Chave aleatória",
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Confirmar chave Pix</p>
                <p className="text-xs text-gray-500">Os repasses serão enviados para esta chave.</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                {tipoDetectado ? TIPO_LABEL[tipoDetectado] : "Chave"}
              </p>
              <p className="font-mono text-sm font-semibold text-gray-900 break-all">{novaChave.trim()}</p>
            </div>

            {precisaSenha && (
              <div className="mb-5">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Confirme sua senha pra trocar a chave
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha atual"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmar}
                disabled={pending || (precisaSenha && !senha)}
                className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {pending ? "Salvando…" : "Sim, usar esta chave"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={pending}
                className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
              >
                Corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-card-lg bg-surface-2 p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center gap-2">
          <QrCode className="size-4 text-ink-muted" />
          <p className="text-sm font-medium text-ink">Chave Pix para recebimento</p>
          {chavePix && !editando && (
            <button
              onClick={() => { setEditando(true); setNovaChave(chavePix ?? ""); }}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Pencil className="size-3" /> Alterar
            </button>
          )}
        </div>

        {!editando && chavePix ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
            <p className="font-mono text-sm text-ink">{mascarar(chavePix)}</p>
            {sucesso && (
              <span className="ml-auto text-xs text-blue-600">Salvo!</span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!chavePix && (
              <p className="text-xs text-warning">
                Configure sua chave Pix para receber os repasses das inscrições.
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={novaChave}
                onChange={(e) => { setNovaChave(e.target.value); setErro(null); }}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={handleSalvar}
                disabled={pending}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
              >
                Salvar
              </button>
              {chavePix && (
                <button
                  onClick={() => { setEditando(false); setNovaChave(""); setErro(null); }}
                  className="rounded-xl bg-surface p-2 text-ink-muted ring-1 ring-border hover:bg-border/40 hover:text-ink transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {tipoDetectado && novaChave.trim() && (
              <p className="text-xs text-ink-muted">
                Tipo detectado: {TIPO_LABEL[tipoDetectado]}
              </p>
            )}
            {erro && <p className="text-xs text-danger">{erro}</p>}
          </div>
        )}
      </div>
    </>
  );
}
