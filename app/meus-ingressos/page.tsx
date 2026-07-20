"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, AlertCircle, Ticket, ShieldCheck } from "lucide-react";
import { IngressoCard, type Ingresso } from "@/components/ingressos/IngressoCard";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { Surface } from "@/components/shell/Surface";
import { EmptyState } from "@/components/shell/EmptyState";

export default function MeusIngressosPage() {
  const [cpf,   setCpf]   = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"dados" | "codigo">("dados");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [aviso,   setAviso]   = useState<string | null>(null);
  const [results, setResults] = useState<Ingresso[] | null>(null);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    const cpfClean = cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11) { setError("CPF inválido (11 dígitos)."); return; }
    if (!email.includes("@"))   { setError("E-mail inválido."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/meus-ingressos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfClean, email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar o código.");
      setAviso(data.mensagem ?? "Se encontrarmos ingressos, enviamos um código pro seu e-mail.");
      setEtapa("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) { setError("Digite o código de 6 dígitos que enviamos por e-mail."); return; }
    setError(null);
    setLoading(true);
    try {
      const cpfClean = cpf.replace(/\D/g, "");
      const res = await fetch("/api/meus-ingressos/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfClean, email: email.trim().toLowerCase(), codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código inválido ou expirado.");
      setResults(data.ingressos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho: faixa escura no mobile, PageHeader claro no desktop ── */}
      <div className="bg-black px-6 pb-16 pt-8 md:hidden">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Meus ingressos</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Consultar ingresso por CPF</h1>
          <p className="text-sm text-white/50">
            Digite o CPF e e-mail usados na compra — mandamos um código de acesso pro seu e-mail.
          </p>
        </div>
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="form" className="py-8">
          <PageHeader
            eyebrow="Meus ingressos"
            title="Consultar ingresso por CPF"
            description="Digite o CPF e e-mail usados na compra — mandamos um código de acesso pro seu e-mail."
          />
        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, cartão flutuando num fundo
          neutro no desktop (nada de página estreita boiando num vazio) ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <PageContainer width="form" className="space-y-8">
          <Surface padding="lg" className="md:mx-auto md:max-w-md">
            {etapa === "dados" ? (
              <form onSubmit={pedirCodigo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    className={`mt-1 ${input}`}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    inputMode="numeric"
                    placeholder="Somente números"
                    maxLength={14}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">E-mail</label>
                  <input
                    className={`mt-1 ${input}`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                  />
                </div>
                {error && (
                  <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
                    <AlertCircle className="size-4 shrink-0" /> {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Enviar código pro meu e-mail
                </button>
              </form>
            ) : (
              <form onSubmit={verificarCodigo} className="space-y-4">
                {aviso && (
                  <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 ring-1 ring-blue-100">
                    <ShieldCheck className="size-4 shrink-0" /> {aviso}
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código de 6 dígitos</label>
                  <input
                    className={`mt-1 text-center text-lg tracking-[0.5em] ${input}`}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                {error && (
                  <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
                    <AlertCircle className="size-4 shrink-0" /> {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Confirmar código
                </button>
                <button
                  type="button"
                  onClick={() => { setEtapa("dados"); setCodigo(""); setError(null); setAviso(null); }}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
                >
                  Usar outro CPF/e-mail
                </button>
              </form>
            )}
          </Surface>

          {results !== null && (
            <div>
              {results.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="Nenhum ingresso encontrado"
                  description="Confira se o CPF e o e-mail são os mesmos usados na compra."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.map((ing) => (
                    <IngressoCard key={`${ing.tipo}-${ing.ticket_id}`} ingresso={ing} />
                  ))}
                </div>
              )}
            </div>
          )}
        </PageContainer>
      </div>
    </div>
  );
}
