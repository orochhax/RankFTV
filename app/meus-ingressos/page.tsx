"use client";

import { useState } from "react";
import { Loader2, Search, Ticket, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import QRCode from "qrcode";

type Ingresso = {
  id:               string;
  tipo:             "atleta" | "plateia";
  campeonato_nome:  string;
  categoria_nome:   string | null;
  tipo_nome:        string | null;
  valor:            number;
  status_pagamento: string;
  code:             string | null;
  qr_token:         string | null;
  checked_in:       boolean;
  comprador_nome:   string;
  parceiro_nome?:   string | null;
  championship_id:  string;
  ticket_id:        string;
};

export default function MeusIngressosPage() {
  const [cpf,   setCpf]   = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<Ingresso[] | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const cpfClean = cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11) { setError("CPF inválido (11 dígitos)."); return; }
    if (!email.includes("@"))   { setError("E-mail inválido."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/meus-ingressos?cpf=${cpfClean}&email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar.");
      setResults(data.ingressos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-xl space-y-3">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Meus ingressos</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Consultar ingresso por CPF</h1>
          <p className="text-sm text-white/50">
            Digite o CPF e e-mail usados na compra para encontrar seus ingressos e QR de entrada.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-6">
          <form onSubmit={buscar} className="space-y-4">
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
              Buscar meus ingressos
            </button>
          </form>

          {results !== null && (
            <div className="space-y-4">
              {results.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
                  Nenhum ingresso encontrado para esse CPF e e-mail.
                </p>
              ) : (
                results.map((ing) => (
                  <IngressoCard key={`${ing.tipo}-${ing.ticket_id}`} ingresso={ing} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IngressoCard({ ingresso: ing }: { ingresso: Ingresso }) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (!ing.qr_token) return;
    if (!qrData) {
      const data = await QRCode.toDataURL(ing.qr_token, {
        width:  220,
        margin: 2,
        color:  { dark: "#0f0f13", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrData(data);
    }
    setShowQr(true);
  }

  const pago     = ing.status_pagamento === "pago";
  const isAtleta = ing.tipo === "atleta";

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
      <div className="bg-[#0f0f13] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isAtleta
              ? <Users className="size-4 text-blue-400" />
              : <Ticket className="size-4 text-blue-400" />}
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">
              {isAtleta ? "Ingresso de atleta" : "Ingresso de plateia"}
            </p>
          </div>
          {ing.code && (
            <p className="font-mono text-[10px] tracking-widest text-white/30">{ing.code}</p>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-white">{ing.campeonato_nome}</p>
        {(ing.categoria_nome || ing.tipo_nome) && (
          <p className="text-xs text-white/40">
            {ing.categoria_nome ? `Categoria ${ing.categoria_nome}` : ing.tipo_nome}
          </p>
        )}
      </div>

      <div className="bg-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isAtleta && ing.parceiro_nome
            ? <><span className="font-medium">{ing.comprador_nome}</span> + <span className="font-medium">{ing.parceiro_nome}</span></>
            : <span className="font-medium">{ing.comprador_nome}</span>}
        </div>

        <div className="mt-3 flex items-center gap-3">
          {pago ? (
            <>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                <CheckCircle2 className="size-3.5" /> Confirmado
              </div>
              {ing.qr_token && (
                <button
                  onClick={toggleQr}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {showQr ? "Fechar QR" : "Ver QR de entrada"}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Clock className="size-3.5" /> Aguardando pagamento
              </div>
              <a
                href={`/campeonatos/${ing.championship_id}/${ing.tipo === "atleta" ? "comprar" : "plateia"}/ingresso/${ing.ticket_id}`}
                className="text-xs font-medium text-blue-600 underline"
              >
                Ver Pix
              </a>
            </div>
          )}
        </div>

        {showQr && qrData && (
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrData}
              alt="QR de entrada"
              width={180}
              height={180}
              className={`rounded-xl ${ing.checked_in ? "opacity-40 grayscale" : ""}`}
            />
          </div>
        )}
        {ing.checked_in && showQr && (
          <p className="mt-2 text-center text-xs font-semibold text-gray-400">Check-in já realizado</p>
        )}
      </div>
    </div>
  );
}
