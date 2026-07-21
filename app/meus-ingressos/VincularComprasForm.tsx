"use client";

import { useActionState, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, Link2 } from "lucide-react";
import { vincularComprasAntigas, type VincularState } from "./actions";

const initialState: VincularState = {};

// "Comprou antes de ter conta?" — vincula compras de visitante (sem
// user_id) à conta logada, provando posse do e-mail/CPF via o mesmo código
// de 6 dígitos que a recuperação pública de ingresso já usa. Colapsado por
// padrão: quem já vê os próprios ingressos na lista principal não precisa
// disso.
export function VincularComprasForm() {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(vincularComprasAntigas, initialState);

  return (
    <div className="rounded-2xl bg-surface-2 ring-1 ring-border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-ink"
      >
        <span className="flex items-center gap-2">
          <Link2 className="size-4 text-ink-muted" />
          Comprou antes de ter conta? Vincule aqui
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink-muted transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <form action={action} className="space-y-3 border-t border-border px-4 py-4">
          <p className="text-xs text-ink-muted">
            Informe o CPF e o e-mail usados na compra — mandamos um código de 6 dígitos pro
            e-mail. Confirmando o código, a compra passa a aparecer aqui na sua conta.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-ink-muted">CPF da compra</label>
              <input
                name="cpf"
                inputMode="numeric"
                placeholder="Somente números"
                maxLength={14}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted">E-mail da compra</label>
              <input
                name="email"
                type="email"
                placeholder="voce@email.com"
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <VincularCodigoStep />

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 ring-1 ring-green-100">
              <CheckCircle2 className="size-4 shrink-0" />
              {state.vinculados && state.vinculados > 0
                ? `${state.vinculados} compra(s) vinculada(s) à sua conta.`
                : "Código confirmado, mas nenhuma compra nova pra vincular com esses dados."}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Vincular à minha conta
          </button>
        </form>
      )}
    </div>
  );
}

// Primeiro pede o código por e-mail (reusa a mesma API pública), depois
// solta o campo de código — sem isso o formulário teria que adivinhar se já
// existe um código pendente.
function VincularCodigoStep() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);

  async function enviarCodigo(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    const cpf = (form?.elements.namedItem("cpf") as HTMLInputElement | null)?.value.replace(/\D/g, "") ?? "";
    const email = (form?.elements.namedItem("email") as HTMLInputElement | null)?.value.trim().toLowerCase() ?? "";
    if (cpf.length !== 11 || !email.includes("@")) {
      setAvisoLocal("Preencha CPF e e-mail válidos antes de pedir o código.");
      return;
    }
    setEnviando(true);
    setAvisoLocal(null);
    try {
      const res = await fetch("/api/meus-ingressos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, email }),
      });
      const data = await res.json();
      setAvisoLocal(data.mensagem ?? "Se encontrarmos uma compra, enviamos um código pro e-mail.");
      setEnviado(true);
    } catch {
      setAvisoLocal("Erro ao enviar o código. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={enviarCodigo}
        disabled={enviando}
        className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : enviado ? "Reenviar código" : "Enviar código pro e-mail acima"}
      </button>
      {avisoLocal && <p className="text-xs text-ink-muted">{avisoLocal}</p>}
      <div>
        <label className="block text-xs font-medium text-ink-muted">Código de 6 dígitos</label>
        <input
          name="codigo"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          required
          className="mt-1 w-full max-w-[10rem] rounded-lg border border-border px-3 py-2 text-center text-sm tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
